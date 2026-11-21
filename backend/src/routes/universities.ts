import { Router } from 'express';
import { query } from '../db';
import { asyncHandler, ok } from '../lib/http';
import { camelize } from '../lib/camel';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT u.id, u.name, u.short_name, u.city, u.region, u.latitude, u.longitude,
              u.driver_radius_km, u.property_radius_km, u.status,
              (SELECT count(*)::int FROM properties p WHERE p.university_id = u.id AND p.status = 'ACTIVE') AS property_count,
              (SELECT count(*)::int FROM driver_profiles d WHERE d.university_id = u.id AND d.verification_status = 'VERIFIED') AS driver_count
       FROM universities u
       WHERE u.status = 'ACTIVE'
       ORDER BY u.name ASC`,
    );
    ok(res, camelize(rows));
  }),
);

export default router;
