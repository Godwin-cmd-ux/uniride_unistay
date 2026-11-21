import { Router } from 'express';
import { z } from 'zod';
import { one, query, withTransaction } from '../db';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { camelize } from '../lib/camel';
import { haversineMeters } from '../lib/geo';
import { RIDE_SELECT, getDriverProfile, getRide, driverDocuments } from '../services/rides';
import { notify } from '../services/notifications';
import { fileUrlSchema } from '../lib/validation';

const router = Router();

router.use(requireAuth, requireRole('DRIVER'));

const profileSchema = z.object({
  universityId: z.string().uuid().optional(),
  licenseNumber: z.string().trim().min(3).max(60),
  licenseExpiry: z.string().trim().min(4).max(10).optional().or(z.literal('')),
  nationalId: z.string().trim().min(4).max(40),
  documents: z
    .array(
      z.object({
        type: z.enum(['LICENSE', 'NATIONAL_ID', 'VEHICLE_INSURANCE']),
        fileUrl: fileUrlSchema,
        expiresAt: z.string().trim().max(10).optional().or(z.literal('')),
      }),
    )
    .max(6)
    .optional(),
});

const vehicleSchema = z.object({
  plateNumber: z.string().trim().min(3).max(20),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.coerce.number().int().min(1980).max(2100).optional(),
  type: z.enum(['MOTORCYCLE', 'CAR']).default('MOTORCYCLE'),
  trackingDeviceId: z.string().trim().max(80).optional().or(z.literal('')),
  insuranceExpiry: z.string().trim().max(10).optional().or(z.literal('')),
});

router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const profile = await getDriverProfile(req.user!.id);
    if (!profile) throw new ApiError(404, 'Driver profile not found', 'NOT_FOUND');
    const documents = await driverDocuments(req.user!.id);
    ok(res, { profile: camelize(profile), documents: camelize(documents) });
  }),
);

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const input = parseBody(profileSchema, req.body);
    const profile = await one<Record<string, unknown>>(
      `SELECT * FROM driver_profiles WHERE user_id = $1`,
      [req.user!.id],
    );
    if (!profile) throw new ApiError(404, 'Driver profile not found', 'NOT_FOUND');

    const universityId = input.universityId ?? (profile.university_id as string);
    const university = await one(`SELECT id FROM universities WHERE id = $1`, [universityId]);
    if (!university) throw new ApiError(400, 'Invalid university', 'INVALID_UNIVERSITY');

    await query(
      `UPDATE driver_profiles
       SET university_id = $1, license_number = $2, license_expiry = $3, national_id = $4,
           status = CASE WHEN verification_status = 'VERIFIED' THEN status ELSE 'OFFLINE' END,
           updated_at = now()
       WHERE user_id = $5`,
      [
        universityId,
        input.licenseNumber,
        input.licenseExpiry || null,
        input.nationalId,
        req.user!.id,
      ],
    );
    if (input.universityId && input.universityId !== req.user!.universityId) {
      await query(`UPDATE users SET university_id = $1, updated_at = now() WHERE id = $2`, [
        input.universityId,
        req.user!.id,
      ]);
    }

    for (const doc of input.documents ?? []) {
      await query(
        `INSERT INTO verification_documents (user_id, type, file_url, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [req.user!.id, doc.type, doc.fileUrl, doc.expiresAt || null],
      );
    }

    const updated = await getDriverProfile(req.user!.id);
    const documents = await driverDocuments(req.user!.id);
    ok(res, { profile: camelize(updated), documents: camelize(documents) });
  }),
);

router.put(
  '/vehicle',
  asyncHandler(async (req, res) => {
    const input = parseBody(vehicleSchema, req.body);
    try {
      await query(
        `INSERT INTO vehicles
          (driver_id, plate_number, make, model, year, type, tracking_device_id, insurance_expiry)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (driver_id) DO UPDATE SET
           plate_number = EXCLUDED.plate_number,
           make = EXCLUDED.make,
           model = EXCLUDED.model,
           year = EXCLUDED.year,
           type = EXCLUDED.type,
           tracking_device_id = EXCLUDED.tracking_device_id,
           insurance_expiry = EXCLUDED.insurance_expiry`,
        [
          req.user!.id,
          input.plateNumber.toUpperCase(),
          input.make,
          input.model,
          input.year ?? null,
          input.type,
          input.trackingDeviceId || null,
          input.insuranceExpiry || null,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ApiError(409, 'This plate number is already registered', 'PLATE_TAKEN');
      }
      throw error;
    }
    const profile = await getDriverProfile(req.user!.id);
    ok(res, camelize(profile));
  }),
);

router.patch(
  '/status',
  asyncHandler(async (req, res) => {
    const input = parseBody(z.object({ status: z.enum(['IDLE', 'OFFLINE']) }), req.body);
    const profile = await one<Record<string, unknown>>(
      `SELECT * FROM driver_profiles WHERE user_id = $1`,
      [req.user!.id],
    );
    if (!profile) throw new ApiError(404, 'Driver profile not found', 'NOT_FOUND');

    if (input.status === 'IDLE') {
      if (profile.verification_status !== 'VERIFIED') {
        throw new ApiError(
          403,
          'Your documents are still under review. You can go online once verified.',
          'NOT_VERIFIED',
        );
      }
      const vehicle = await one(`SELECT id FROM vehicles WHERE driver_id = $1`, [req.user!.id]);
      if (!vehicle) {
        throw new ApiError(400, 'Register your vehicle before going online', 'NO_VEHICLE');
      }
    }

    if (['ACCEPTED', 'ON_ROAD', 'ON_TRIP'].includes(String(profile.status)) && input.status === 'OFFLINE') {
      throw new ApiError(409, 'Finish or cancel your active trip first', 'ACTIVE_TRIP');
    }

    await query(
      `UPDATE driver_profiles SET status = $1, last_heartbeat_at = now(), updated_at = now()
       WHERE user_id = $2`,
      [input.status, req.user!.id],
    );
    const updated = await getDriverProfile(req.user!.id);
    ok(res, camelize(updated));
  }),
);

router.post(
  '/heartbeat',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        lat: z.coerce.number().finite().optional(),
        lng: z.coerce.number().finite().optional(),
      }),
      req.body,
    );
    await query(
      `UPDATE driver_profiles
       SET last_heartbeat_at = now(),
           current_lat = COALESCE($1, current_lat),
           current_lng = COALESCE($2, current_lng),
           updated_at = now()
       WHERE user_id = $3`,
      [input.lat ?? null, input.lng ?? null, req.user!.id],
    );
    ok(res, { heartbeat: true });
  }),
);

router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const profile = await getDriverProfile(req.user!.id);
    if (!profile) throw new ApiError(404, 'Driver profile not found', 'NOT_FOUND');
    if (profile.verification_status !== 'VERIFIED') {
      return ok(res, { requests: [], notice: 'Waiting for document verification.' });
    }
    const currentLat = profile.current_lat as number | null;
    const currentLng = profile.current_lng as number | null;

    const rows = await query<Record<string, unknown>>(
      `SELECT r.id, r.pickup_label, r.pickup_lat, r.pickup_lng, r.dest_label,
              r.dest_lat, r.dest_lng, r.distance_m, r.estimated_fare, r.requested_at,
              split_part(u.full_name, ' ', 1) AS student_first_name,
              univ.short_name AS university_short_name
       FROM ride_bookings r
       JOIN users u ON u.id = r.student_id
       JOIN universities univ ON univ.id = r.university_id
       WHERE r.status = 'REQUESTED' AND r.university_id = $1
       ORDER BY r.requested_at ASC LIMIT 20`,
      [profile.university_id],
    );

    const requests = rows.map((row) => {
      const pickupLat = row.pickup_lat as number | null;
      const pickupLng = row.pickup_lng as number | null;
      let toPickupM: number | null = null;
      if (currentLat !== null && currentLng !== null && pickupLat !== null && pickupLng !== null) {
        toPickupM = haversineMeters(currentLat, currentLng, pickupLat, pickupLng);
      }
      return camelize({ ...row, driver_distance_to_pickup_m: toPickupM });
    });
    ok(res, { requests, notice: null });
  }),
);

router.get(
  '/active',
  asyncHandler(async (req, res) => {
    const ride = await one(
      `${RIDE_SELECT}
       WHERE r.driver_id = $1 AND r.status IN ('ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP')
       ORDER BY r.accepted_at DESC LIMIT 1`,
      [req.user!.id],
    );
    ok(res, camelize(ride));
  }),
);

router.get(
  '/rides',
  asyncHandler(async (req, res) => {
    const rides = await query(
      `${RIDE_SELECT} WHERE r.driver_id = $1 ORDER BY r.requested_at DESC LIMIT 50`,
      [req.user!.id],
    );
    ok(res, camelize(rides));
  }),
);

router.post(
  '/rides/:id/accept',
  asyncHandler(async (req, res) => {
    const driver = await one<Record<string, unknown>>(
      `SELECT dp.*, v.id AS vehicle_id FROM driver_profiles dp
       LEFT JOIN vehicles v ON v.driver_id = dp.user_id
       WHERE dp.user_id = $1`,
      [req.user!.id],
    );
    if (!driver) throw new ApiError(404, 'Driver profile not found', 'NOT_FOUND');
    if (driver.verification_status !== 'VERIFIED') {
      throw new ApiError(403, 'Your account is not verified yet', 'NOT_VERIFIED');
    }
    if (!driver.vehicle_id) {
      throw new ApiError(400, 'Register your vehicle before accepting rides', 'NO_VEHICLE');
    }

    await withTransaction(async (client) => {
      const rideResult = await client.query<Record<string, unknown>>(
        `SELECT * FROM ride_bookings WHERE id = $1 FOR UPDATE`,
        [req.params.id],
      );
      const ride = rideResult.rows[0];
      if (!ride) throw new ApiError(404, 'Ride not found', 'NOT_FOUND');
      if (ride.status !== 'REQUESTED' || ride.driver_id) {
        throw new ApiError(409, 'This ride has already been taken or cancelled', 'RIDE_UNAVAILABLE');
      }
      if (ride.university_id !== driver.university_id) {
        throw new ApiError(403, 'This ride is outside your operating university zone', 'OUTSIDE_ZONE');
      }
      await client.query(
        `UPDATE ride_bookings SET driver_id = $1, vehicle_id = $2, status = 'ACCEPTED',
           accepted_at = now() WHERE id = $3`,
        [req.user!.id, driver.vehicle_id, req.params.id],
      );
      await client.query(
        `UPDATE driver_profiles SET status = 'ON_ROAD', last_heartbeat_at = now(),
           updated_at = now() WHERE user_id = $1`,
        [req.user!.id],
      );
    });

    const ride = await getRide(req.params.id);
    const driverProfile = await getDriverProfile(req.user!.id);
    await notify(
      String(ride!.student_id),
      'RIDE_ACCEPTED',
      'Your driver is on the way',
      `${req.user!.fullName} accepted your ride in a ${driverProfile?.vehicle_type ?? 'motorcycle'} (${driverProfile?.plate_number ?? ''}).`,
      { rideId: req.params.id, driverPhone: req.user!.phone },
    );
    ok(res, camelize(ride));
  }),
);

router.post(
  '/rides/:id/depart',
  asyncHandler(async (req, res) => {
    const ride = await requireDriverRide(req.params.id, req.user!.id);
    if (ride.status !== 'ACCEPTED') {
      throw new ApiError(409, 'Ride is not in an accepted state', 'INVALID_STATE');
    }
    await query(
      `UPDATE ride_bookings SET status = 'DRIVER_EN_ROUTE' WHERE id = $1`,
      [req.params.id],
    );
    await notify(
      String(ride.student_id),
      'DRIVER_EN_ROUTE',
      'Your driver is en route',
      'Track your driver in the app and meet at the pickup point.',
      { rideId: req.params.id },
    );
    ok(res, camelize(await getRide(req.params.id)));
  }),
);

router.post(
  '/rides/:id/start',
  asyncHandler(async (req, res) => {
    const ride = await requireDriverRide(req.params.id, req.user!.id);
    if (!['ACCEPTED', 'DRIVER_EN_ROUTE'].includes(String(ride.status))) {
      throw new ApiError(409, 'Ride cannot be started from its current state', 'INVALID_STATE');
    }
    await query(
      `UPDATE ride_bookings SET status = 'ON_TRIP', started_at = now() WHERE id = $1`,
      [req.params.id],
    );
    await notify(
      String(ride.student_id),
      'TRIP_STARTED',
      'Trip started',
      `You are on the way to ${String(ride.dest_label)}.`,
      { rideId: req.params.id },
    );
    ok(res, camelize(await getRide(req.params.id)));
  }),
);

router.post(
  '/rides/:id/complete',
  asyncHandler(async (req, res) => {
    const driver = await one<Record<string, unknown>>(
      `SELECT * FROM driver_profiles WHERE user_id = $1`,
      [req.user!.id],
    );
    if (!driver) throw new ApiError(404, 'Driver profile not found', 'NOT_FOUND');

    const completedRide = await withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM ride_bookings WHERE id = $1 FOR UPDATE`,
        [req.params.id],
      );
      const ride = result.rows[0];
      if (!ride) throw new ApiError(404, 'Ride not found', 'NOT_FOUND');
      if (ride.driver_id !== req.user!.id) throw new ApiError(403, 'Not your ride', 'FORBIDDEN');
      if (ride.status !== 'ON_TRIP') {
        throw new ApiError(409, 'Start the trip before completing it', 'INVALID_STATE');
      }

      const fare = Number(ride.estimated_fare);
      const commissionRate = Number(ride.commission_rate);
      const commission = Math.round(fare * commissionRate * 100) / 100;
      const earnings = Math.round((fare - commission) * 100) / 100;

      await client.query(
        `UPDATE ride_bookings
         SET status = 'COMPLETED', completed_at = now(), final_fare = $1,
             commission_amount = $2, driver_earnings = $3
         WHERE id = $4`,
        [fare, commission, earnings, req.params.id],
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, booking_type, booking_id, amount, provider, status)
         VALUES ($1, 'RIDE_FARE', 'RIDE', $2, $3, 'CASH', 'RECORDED'),
                (NULL, 'RIDE_COMMISSION', 'RIDE', $2, $4, 'CASH', 'RECORDED'),
                ($1, 'DRIVER_EARNING', 'RIDE', $2, $5, 'CASH', 'RECORDED')`,
        [req.user!.id, req.params.id, fare, commission, earnings],
      );
      await client.query(
        `UPDATE driver_profiles
         SET total_earnings = total_earnings + $1, completed_rides = completed_rides + 1,
             status = 'IDLE', last_heartbeat_at = now(), updated_at = now()
         WHERE user_id = $2`,
        [earnings, req.user!.id],
      );
      return ride;
    });

    await notify(
      String(completedRide.student_id),
      'RIDE_COMPLETED',
      'Trip completed — receipt ready',
      `Your fare was TZS ${Number(completedRide.estimated_fare).toLocaleString()}. Tap to view the receipt and rate your driver.`,
      { rideId: req.params.id },
    );
    ok(res, camelize(await getRide(req.params.id)));
  }),
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await one(
      `SELECT
         COALESCE(SUM(driver_earnings) FILTER (WHERE completed_at::date = CURRENT_DATE), 0)::float AS today_earnings,
         COALESCE(SUM(driver_earnings) FILTER (WHERE completed_at >= date_trunc('week', now())), 0)::float AS week_earnings,
         COALESCE(SUM(driver_earnings), 0)::float AS total_ride_earnings,
         count(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_rides,
         count(*) FILTER (WHERE status = 'COMPLETED' AND completed_at::date = CURRENT_DATE)::int AS today_rides
       FROM ride_bookings WHERE driver_id = $1`,
      [req.user!.id],
    );
    const profile = await getDriverProfile(req.user!.id);
    ok(res, {
      stats: camelize(stats),
      profile: camelize(profile),
      documents: camelize(await driverDocuments(req.user!.id)),
    });
  }),
);

async function requireDriverRide(rideId: string, driverId: string) {
  const ride = await one<Record<string, unknown>>(
    `SELECT * FROM ride_bookings WHERE id = $1`,
    [rideId],
  );
  if (!ride) throw new ApiError(404, 'Ride not found', 'NOT_FOUND');
  if (ride.driver_id !== driverId) throw new ApiError(403, 'Not your ride', 'FORBIDDEN');
  return ride;
}

export default router;
