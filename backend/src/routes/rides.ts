import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { camelize } from '../lib/camel';
import { haversineMeters, isFiniteCoord } from '../lib/geo';
import { estimateFare } from '../lib/fare';
import { RIDE_SELECT, getRide } from '../services/rides';
import { notify, notifyMany } from '../services/notifications';
import { expireStaleDrivers } from '../services/drivers';

const router = Router();

const coord = z.coerce.number().finite().optional();

const estimateSchema = z.object({
  pickupLat: coord,
  pickupLng: coord,
  destLat: coord,
  destLng: coord,
});

const createRideSchema = z.object({
  universityId: z.string().uuid().optional(),
  pickupLabel: z.string().trim().min(2).max(160),
  pickupLat: coord,
  pickupLng: coord,
  destLabel: z.string().trim().min(2).max(160),
  destLat: coord,
  destLng: coord,
});

function distanceFromRequest(input: z.infer<typeof estimateSchema>) {
  if (
    isFiniteCoord(input.pickupLat, input.pickupLng) &&
    isFiniteCoord(input.destLat, input.destLng)
  ) {
    return {
      distanceM: haversineMeters(
        input.pickupLat as number,
        input.pickupLng as number,
        input.destLat as number,
        input.destLng as number,
      ),
      approximate: false,
    };
  }
  return { distanceM: 3000, approximate: true };
}

router.post(
  '/estimate',
  asyncHandler(async (req, res) => {
    const input = parseBody(estimateSchema, req.body);
    const { distanceM, approximate } = distanceFromRequest(input);
    ok(res, {
      ...estimateFare(distanceM),
      approximate,
      note: approximate
        ? 'No coordinates supplied — showing a 3 km campus trip estimate.'
        : undefined,
    });
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const input = parseBody(createRideSchema, req.body);
    const universityId = input.universityId ?? req.user!.universityId;
    if (!universityId) {
      throw new ApiError(400, 'Select your university in your profile first', 'MISSING_UNIVERSITY');
    }
    const university = await one<{ id: string }>(
      `SELECT id FROM universities WHERE id = $1 AND status = 'ACTIVE'`,
      [universityId],
    );
    if (!university) throw new ApiError(400, 'Invalid university', 'INVALID_UNIVERSITY');

    const { distanceM, approximate } = distanceFromRequest(input);
    const fare = estimateFare(distanceM);

    const ride = await one<Record<string, unknown>>(
      `INSERT INTO ride_bookings
        (student_id, university_id, pickup_label, pickup_lat, pickup_lng,
         dest_label, dest_lat, dest_lng, distance_m, estimated_fare, commission_rate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'REQUESTED')
       RETURNING *`,
      [
        req.user!.id,
        universityId,
        input.pickupLabel,
        input.pickupLat ?? null,
        input.pickupLng ?? null,
        input.destLabel,
        input.destLat ?? null,
        input.destLng ?? null,
        distanceM,
        fare.estimatedFare,
        fare.commissionRate,
      ],
    );
    if (!ride) throw new ApiError(500, 'Could not create ride', 'CREATE_FAILED');

    await expireStaleDrivers();
    const drivers = await query<{ user_id: string }>(
      `SELECT user_id FROM driver_profiles
       WHERE university_id = $1 AND status = 'IDLE' AND verification_status = 'VERIFIED'`,
      [universityId],
    );
    await notifyMany(
      drivers.map((driver) => driver.user_id),
      'RIDE_REQUEST',
      'New ride request nearby',
      `${input.pickupLabel} → ${input.destLabel} • TZS ${fare.estimatedFare.toLocaleString()}`,
      { rideId: ride.id },
    );

    const full = await getRide(String(ride.id));
    ok(res, { ride: camelize(full), approximate }, 201);
  }),
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rides = await query(
      `${RIDE_SELECT} WHERE r.student_id = $1 ORDER BY r.requested_at DESC LIMIT 50`,
      [req.user!.id],
    );
    ok(res, camelize(rides));
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ride = await one<Record<string, unknown>>(
      `${RIDE_SELECT} WHERE r.id = $1`,
      [req.params.id],
    );
    if (!ride) throw new ApiError(404, 'Ride not found', 'NOT_FOUND');
    const isParticipant =
      ride.student_id === req.user!.id ||
      ride.driver_id === req.user!.id ||
      req.user!.role === 'ADMIN';
    if (!isParticipant) throw new ApiError(403, 'Not your ride', 'FORBIDDEN');
    ok(res, camelize(ride));
  }),
);

router.post(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({ reason: z.string().trim().max(300).optional() }),
      req.body,
    );
    const ride = await one<Record<string, unknown>>(
      `SELECT * FROM ride_bookings WHERE id = $1`,
      [req.params.id],
    );
    if (!ride) throw new ApiError(404, 'Ride not found', 'NOT_FOUND');
    const isStudent = ride.student_id === req.user!.id;
    const isDriver = ride.driver_id === req.user!.id;
    if (!isStudent && !isDriver) throw new ApiError(403, 'Not your ride', 'FORBIDDEN');

    const status = String(ride.status);
    if (['COMPLETED', 'CANCELLED'].includes(status)) {
      throw new ApiError(409, 'This ride can no longer be cancelled', 'INVALID_STATE');
    }
    if (status === 'ON_TRIP') {
      throw new ApiError(
        409,
        'Trips already underway cannot be cancelled in-app. Contact support.',
        'INVALID_STATE',
      );
    }

    await query(
      `UPDATE ride_bookings
       SET status = 'CANCELLED', cancelled_at = now(), cancelled_by = $1,
           cancellation_reason = $2
       WHERE id = $3`,
      [req.user!.id, input.reason ?? 'Cancelled by user', req.params.id],
    );

    if (ride.driver_id) {
      await query(
        `UPDATE driver_profiles SET status = 'OFFLINE', last_heartbeat_at = now(), updated_at = now()
         WHERE user_id = $1`,
        [ride.driver_id],
      );
    }

    if (isStudent && ride.driver_id) {
      await notify(
        String(ride.driver_id),
        'RIDE_CANCELLED',
        'Ride cancelled by student',
        `The student cancelled the trip. Reason: ${input.reason ?? 'not given'}`,
        { rideId: ride.id },
      );
    }
    if (isDriver) {
      await notify(
        String(ride.student_id),
        'RIDE_CANCELLED',
        'Your driver cancelled',
        `Your driver cancelled the ride. Reason: ${input.reason ?? 'not given'}. You can request another ride.`,
        { rideId: ride.id },
      );
    }

    const updated = await getRide(req.params.id);
    ok(res, camelize(updated));
  }),
);

router.post(
  '/:id/rate',
  requireAuth,
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(500).optional().or(z.literal('')),
      }),
      req.body,
    );
    const ride = await one<Record<string, unknown>>(
      `SELECT * FROM ride_bookings WHERE id = $1`,
      [req.params.id],
    );
    if (!ride) throw new ApiError(404, 'Ride not found', 'NOT_FOUND');
    if (ride.student_id !== req.user!.id) throw new ApiError(403, 'Not your ride', 'FORBIDDEN');
    if (ride.status !== 'COMPLETED') {
      throw new ApiError(409, 'You can review a ride once it is completed', 'INVALID_STATE');
    }
    if (!ride.driver_id) throw new ApiError(409, 'No driver to review', 'INVALID_STATE');

    const existing = await one(
      `SELECT id FROM reviews WHERE reviewer_id = $1 AND booking_type = 'RIDE' AND booking_id = $2`,
      [req.user!.id, req.params.id],
    );
    if (existing) throw new ApiError(409, 'You already reviewed this ride', 'ALREADY_REVIEWED');

    await query(
      `INSERT INTO reviews (reviewer_id, reviewee_id, booking_type, booking_id, rating, comment)
       VALUES ($1, $2, 'RIDE', $3, $4, $5)`,
      [req.user!.id, ride.driver_id, req.params.id, input.rating, input.comment ?? ''],
    );
    await query(
      `UPDATE driver_profiles
       SET rating_avg = ROUND(((rating_avg * rating_count) + $2) / (rating_count + 1), 2),
           rating_count = rating_count + 1, updated_at = now()
       WHERE user_id = $1`,
      [ride.driver_id, input.rating],
    );
    await notify(
      String(ride.driver_id),
      'NEW_RATING',
      'You received a new rating',
      `A student rated your trip ${input.rating}/5${input.comment ? `: “${input.comment}”` : ''}`,
      { rideId: ride.id },
    );
    ok(res, { reviewed: true });
  }),
);

export default router;
