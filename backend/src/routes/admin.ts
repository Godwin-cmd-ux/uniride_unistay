import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { camelize } from '../lib/camel';
import { audit } from '../services/audit';
import { notify } from '../services/notifications';
import { RIDE_SELECT } from '../services/rides';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const metrics = await one(
      `SELECT
        (SELECT count(*)::int FROM users WHERE role = 'STUDENT') AS students,
        (SELECT count(*)::int FROM users WHERE role = 'DRIVER') AS drivers,
        (SELECT count(*)::int FROM users WHERE role = 'OWNER') AS owners,
        (SELECT count(*)::int FROM users WHERE role = 'ADMIN') AS admins,
        (SELECT count(*)::int FROM users WHERE status = 'SUSPENDED') AS suspended_users,
        (SELECT count(*)::int FROM driver_profiles WHERE verification_status = 'PENDING') AS pending_drivers,
        (SELECT count(*)::int FROM driver_profiles WHERE verification_status = 'VERIFIED') AS verified_drivers,
        (SELECT count(*)::int FROM driver_profiles WHERE status = 'IDLE') AS online_drivers,
        (SELECT count(*)::int FROM properties WHERE status = 'ACTIVE') AS active_properties,
        (SELECT count(*)::int FROM properties WHERE status = 'PENDING') AS pending_properties,
        (SELECT count(*)::int FROM ride_bookings) AS total_rides,
        (SELECT count(*)::int FROM ride_bookings WHERE status = 'COMPLETED') AS completed_rides,
        (SELECT count(*)::int FROM ride_bookings WHERE requested_at::date = CURRENT_DATE) AS rides_today,
        (SELECT count(*)::int FROM ride_bookings WHERE status IN ('REQUESTED','ACCEPTED','DRIVER_EN_ROUTE','ON_TRIP')) AS live_rides,
        (SELECT count(*)::int FROM accommodation_inquiries WHERE status = 'PENDING') AS pending_inquiries,
        (SELECT count(*)::int FROM accommodation_bookings WHERE status = 'ACTIVE') AS active_stays,
        (SELECT count(*)::int FROM complaints WHERE status IN ('OPEN','IN_REVIEW')) AS open_complaints,
        (SELECT count(*)::int FROM contact_messages WHERE status = 'NEW') AS new_contact_messages,
        (SELECT COALESCE(SUM(commission_amount), 0)::float FROM ride_bookings WHERE status = 'COMPLETED') AS ride_commission,
        (SELECT COALESCE(SUM(success_fee), 0)::float FROM accommodation_bookings) AS accommodation_fees`,
    );

    const [recentRides, recentInquiries, pendingDriverList, pendingPropertyList] = await Promise.all([
      query(
        `${RIDE_SELECT} ORDER BY r.requested_at DESC LIMIT 6`,
      ),
      query(
        `SELECT i.id, i.status, i.created_at, p.name AS property_name,
                split_part(u.full_name, ' ', 1) AS student_first_name
         FROM accommodation_inquiries i
         JOIN properties p ON p.id = i.property_id
         JOIN users u ON u.id = i.student_id
         ORDER BY i.created_at DESC LIMIT 5`,
      ),
      query(
        `SELECT dp.user_id, u.full_name, u.phone, dp.created_at
         FROM driver_profiles dp JOIN users u ON u.id = dp.user_id
         WHERE dp.verification_status = 'PENDING' ORDER BY dp.created_at ASC LIMIT 5`,
      ),
      query(
        `SELECT p.id, p.name, p.type, p.created_at, u.full_name AS owner_name
         FROM properties p JOIN users u ON u.id = p.owner_id
         WHERE p.status = 'PENDING' ORDER BY p.created_at ASC LIMIT 5`,
      ),
    ]);

    ok(res, {
      metrics: camelize(metrics),
      recentRides: camelize(recentRides),
      recentInquiries: camelize(recentInquiries),
      pendingDrivers: camelize(pendingDriverList),
      pendingProperties: camelize(pendingPropertyList),
    });
  }),
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const params = z
      .object({
        role: z.enum(['STUDENT', 'DRIVER', 'OWNER', 'ADMIN']).optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
        search: z.string().trim().max(100).optional(),
      })
      .parse(req.query);

    const filters: string[] = [];
    const values: unknown[] = [];
    if (params.role) {
      values.push(params.role);
      filters.push(`u.role = $${values.length}`);
    }
    if (params.status) {
      values.push(params.status);
      filters.push(`u.status = $${values.length}`);
    }
    if (params.search) {
      values.push(`%${params.search}%`);
      filters.push(
        `(u.full_name ILIKE $${values.length} OR u.phone ILIKE $${values.length} OR u.email ILIKE $${values.length})`,
      );
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const users = await query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.phone_verified,
              u.created_at, univ.short_name AS university_short_name,
              dp.verification_status AS driver_verification_status,
              dp.status AS driver_status
       FROM users u
       LEFT JOIN universities univ ON univ.id = u.university_id
       LEFT JOIN driver_profiles dp ON dp.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC LIMIT 100`,
      values,
    );
    ok(res, camelize(users));
  }),
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const input = parseBody(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }), req.body);
    if (req.params.id === req.user!.id) {
      throw new ApiError(400, 'You cannot change your own account status', 'SELF_ACTION');
    }
    const user = await one<Record<string, unknown>>(
      `SELECT id, role, full_name, status FROM users WHERE id = $1`,
      [req.params.id],
    );
    if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
    if (user.role === 'ADMIN') {
      throw new ApiError(403, 'Admin accounts cannot be modified here', 'FORBIDDEN');
    }

    await query(`UPDATE users SET status = $1, updated_at = now() WHERE id = $2`, [
      input.status,
      req.params.id,
    ]);
    if (input.status === 'SUSPENDED' && user.role === 'DRIVER') {
      await query(
        `UPDATE driver_profiles SET status = 'OFFLINE', updated_at = now() WHERE user_id = $1`,
        [req.params.id],
      );
    }
    await audit(req.user!.id, `USER_${input.status}`, 'USER', req.params.id, {
      previousStatus: user.status,
    });
    await notify(
      req.params.id,
      'ACCOUNT_STATUS',
      input.status === 'SUSPENDED' ? 'Your account was suspended' : 'Your account was reinstated',
      input.status === 'SUSPENDED'
        ? 'Contact support if you believe this was a mistake.'
        : 'Welcome back. You can use UNIRIDE UNISTAY again.',
    );
    ok(res, camelize(await one(`SELECT id, status FROM users WHERE id = $1`, [req.params.id])));
  }),
);

router.get(
  '/drivers',
  asyncHandler(async (req, res) => {
    const status =
      typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus : null;
    const rows = await query(
      `SELECT dp.*, u.full_name, u.phone, u.email, u.status AS user_status, u.created_at AS joined_at,
              univ.short_name AS university_short_name, univ.name AS university_name,
              v.plate_number, v.make, v.model, v.year, v.type AS vehicle_type, v.insurance_expiry,
              v.tracking_device_id,
              (SELECT jsonb_agg(jsonb_build_object('id', d.id, 'type', d.type,
                 'fileUrl', d.file_url, 'status', d.status))
               FROM verification_documents d WHERE d.user_id = dp.user_id) AS documents
       FROM driver_profiles dp
       JOIN users u ON u.id = dp.user_id
       JOIN universities univ ON univ.id = dp.university_id
       LEFT JOIN vehicles v ON v.driver_id = dp.user_id
       ${status ? 'WHERE dp.verification_status = $1' : ''}
       ORDER BY CASE dp.verification_status WHEN 'PENDING' THEN 0 ELSE 1 END, dp.created_at ASC
       LIMIT 200`,
      status ? [status] : [],
    );
    ok(res, camelize(rows));
  }),
);

router.post(
  '/drivers/:id/verify',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({ approve: z.boolean(), reason: z.string().trim().max(500).optional() }),
      req.body,
    );
    const driver = await one<Record<string, unknown>>(
      `SELECT dp.user_id, u.full_name FROM driver_profiles dp
       JOIN users u ON u.id = dp.user_id WHERE dp.user_id = $1`,
      [req.params.id],
    );
    if (!driver) throw new ApiError(404, 'Driver not found', 'NOT_FOUND');

    const status = input.approve ? 'VERIFIED' : 'REJECTED';
    await query(
      `UPDATE driver_profiles SET verification_status = $1, rejection_reason = $2,
         status = CASE WHEN $1 = 'REJECTED' THEN 'OFFLINE' ELSE status END,
         updated_at = now() WHERE user_id = $3`,
      [status, input.approve ? null : input.reason ?? null, req.params.id],
    );
    await query(
      `UPDATE verification_documents SET status = $1, verified_by = $2, verified_at = now()
       WHERE user_id = $3 AND status = 'PENDING'`,
      [input.approve ? 'APPROVED' : 'REJECTED', req.user!.id, req.params.id],
    );
    await audit(req.user!.id, input.approve ? 'DRIVER_VERIFIED' : 'DRIVER_REJECTED', 'DRIVER', req.params.id, {
      reason: input.reason ?? null,
    });
    await notify(
      req.params.id,
      'VERIFICATION',
      input.approve ? 'You are verified to drive' : 'Your driver verification was not approved',
      input.approve
        ? 'Your documents were approved. Go online to start receiving ride requests.'
        : `Reason: ${input.reason ?? 'Documents did not meet requirements'}. Update your profile and resubmit.`,
    );
    ok(res, { verificationStatus: status });
  }),
);

router.get(
  '/properties',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const rows = await query(
      `SELECT p.id, p.name, p.type, p.description, p.address_area, p.price_from, p.status,
              p.verified_at, p.created_at, u.full_name AS owner_name, u.phone AS owner_phone,
              univ.short_name AS university_short_name,
              (SELECT url FROM property_images pi WHERE pi.property_id = p.id
                 ORDER BY sort_order LIMIT 1) AS image_url,
              (SELECT count(*)::int FROM bookable_units bu WHERE bu.property_id = p.id) AS units
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       JOIN universities univ ON univ.id = p.university_id
       ${status ? 'WHERE p.status = $1' : ''}
       ORDER BY CASE p.status WHEN 'PENDING' THEN 0 ELSE 1 END, p.created_at ASC
       LIMIT 200`,
      status ? [status] : [],
    );
    ok(res, camelize(rows));
  }),
);

router.post(
  '/properties/:id/verify',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({ approve: z.boolean(), reason: z.string().trim().max(500).optional() }),
      req.body,
    );
    const property = await one<Record<string, unknown>>(
      `SELECT id, name, owner_id FROM properties WHERE id = $1`,
      [req.params.id],
    );
    if (!property) throw new ApiError(404, 'Property not found', 'NOT_FOUND');

    const status = input.approve ? 'ACTIVE' : 'REJECTED';
    await query(
      `UPDATE properties SET status = $1, verified_at = $2, updated_at = now() WHERE id = $3`,
      [status, input.approve ? new Date() : null, req.params.id],
    );
    await audit(
      req.user!.id,
      input.approve ? 'PROPERTY_VERIFIED' : 'PROPERTY_REJECTED',
      'PROPERTY',
      req.params.id,
      { reason: input.reason ?? null },
    );
    await notify(
      String(property.owner_id),
      'VERIFICATION',
      input.approve ? 'Your listing is live' : 'Your listing needs changes',
      input.approve
        ? `${String(property.name)} is now visible to students with a verified badge.`
        : `Reason: ${input.reason ?? 'Documents did not meet requirements'}. Update and resubmit.`,
      { propertyId: req.params.id },
    );
    ok(res, { status });
  }),
);

router.get(
  '/rides',
  asyncHandler(async (_req, res) => {
    const rows = await query(`${RIDE_SELECT} ORDER BY r.requested_at DESC LIMIT 100`);
    ok(res, camelize(rows));
  }),
);

router.get(
  '/complaints',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT c.*, complainant.full_name AS complainant_name,
              accused.full_name AS accused_name
       FROM complaints c
       JOIN users complainant ON complainant.id = c.complainant_id
       LEFT JOIN users accused ON accused.id = c.against_user_id
       ORDER BY CASE c.status WHEN 'OPEN' THEN 0 WHEN 'IN_REVIEW' THEN 1 ELSE 2 END,
                c.created_at DESC`,
    );
    ok(res, camelize(rows));
  }),
);

router.patch(
  '/complaints/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']),
        resolution: z.string().trim().max(2000).optional().or(z.literal('')),
      }),
      req.body,
    );
    const complaint = await one<Record<string, unknown>>(
      `SELECT * FROM complaints WHERE id = $1`,
      [req.params.id],
    );
    if (!complaint) throw new ApiError(404, 'Complaint not found', 'NOT_FOUND');
    await query(
      `UPDATE complaints SET status = $1, resolution = COALESCE($2, resolution), updated_at = now()
       WHERE id = $3`,
      [input.status, input.resolution || null, req.params.id],
    );
    await audit(req.user!.id, 'COMPLAINT_UPDATED', 'COMPLAINT', req.params.id, {
      status: input.status,
    });
    await notify(
      String(complaint.complainant_id),
      'COMPLAINT_UPDATE',
      `Complaint ${input.status.toLowerCase().replace('_', ' ')}`,
      input.resolution
        ? `Resolution: ${input.resolution}`
        : 'Our team updated your complaint. Check the app for details.',
      { complaintId: req.params.id },
    );
    ok(res, camelize(await one(`SELECT * FROM complaints WHERE id = $1`, [req.params.id])));
  }),
);

router.get(
  '/contact-messages',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT id, name, email, phone, subject, message, status, created_at
       FROM contact_messages ORDER BY CASE status WHEN 'NEW' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 100`,
    );
    ok(res, camelize(rows));
  }),
);

router.post(
  '/contact-messages/:id/read',
  asyncHandler(async (req, res) => {
    await query(`UPDATE contact_messages SET status = 'READ' WHERE id = $1`, [req.params.id]);
    ok(res, { read: true });
  }),
);

router.get(
  '/logs',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT l.*, u.full_name AS admin_name FROM admin_logs l
       JOIN users u ON u.id = l.admin_id ORDER BY l.created_at DESC LIMIT 100`,
    );
    ok(res, camelize(rows));
  }),
);

router.get(
  '/universities',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT u.*,
              (SELECT count(*)::int FROM properties p WHERE p.university_id = u.id) AS property_count,
              (SELECT count(*)::int FROM driver_profiles d WHERE d.university_id = u.id) AS driver_count,
              (SELECT count(*)::int FROM users usr WHERE usr.university_id = u.id) AS user_count
       FROM universities u ORDER BY u.name ASC`,
    );
    ok(res, camelize(rows));
  }),
);

const universitySchema = z.object({
  name: z.string().trim().min(3).max(160),
  shortName: z.string().trim().min(2).max(20),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  driverRadiusKm: z.coerce.number().int().min(1).max(100).default(5),
  propertyRadiusKm: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

router.post(
  '/universities',
  asyncHandler(async (req, res) => {
    const input = parseBody(universitySchema, req.body);
    try {
      const row = await one(
        `INSERT INTO universities
          (name, short_name, city, region, latitude, longitude, driver_radius_km, property_radius_km, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          input.name,
          input.shortName.toUpperCase(),
          input.city,
          input.region,
          input.latitude,
          input.longitude,
          input.driverRadiusKm,
          input.propertyRadiusKm,
          input.status,
        ],
      );
      await audit(req.user!.id, 'UNIVERSITY_CREATED', 'UNIVERSITY', String(row!.id), {});
      ok(res, camelize(row), 201);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ApiError(409, 'A university with this short name already exists', 'DUPLICATE');
      }
      throw error;
    }
  }),
);

router.patch(
  '/universities/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(universitySchema.partial(), req.body);
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (input.name !== undefined) set('name', input.name);
    if (input.shortName !== undefined) set('short_name', input.shortName.toUpperCase());
    if (input.city !== undefined) set('city', input.city);
    if (input.region !== undefined) set('region', input.region);
    if (input.latitude !== undefined) set('latitude', input.latitude);
    if (input.longitude !== undefined) set('longitude', input.longitude);
    if (input.driverRadiusKm !== undefined) set('driver_radius_km', input.driverRadiusKm);
    if (input.propertyRadiusKm !== undefined) set('property_radius_km', input.propertyRadiusKm);
    if (input.status !== undefined) set('status', input.status);
    if (sets.length === 0) throw new ApiError(400, 'Nothing to update', 'EMPTY_UPDATE');
    values.push(req.params.id);
    await query(`UPDATE universities SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    await audit(req.user!.id, 'UNIVERSITY_UPDATED', 'UNIVERSITY', req.params.id, input);
    ok(res, camelize(await one(`SELECT * FROM universities WHERE id = $1`, [req.params.id])));
  }),
);

router.get(
  '/bookings',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT b.*, p.name AS property_name, bu.label AS unit_label,
              u.full_name AS student_name, owner.full_name AS owner_name
       FROM accommodation_bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN bookable_units bu ON bu.id = b.bookable_unit_id
       JOIN users u ON u.id = b.student_id
       JOIN users owner ON owner.id = p.owner_id
       ORDER BY b.confirmed_at DESC LIMIT 100`,
    );
    ok(res, camelize(rows));
  }),
);

export default router;
