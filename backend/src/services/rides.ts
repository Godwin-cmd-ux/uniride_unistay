import { one, query } from '../db';

export const RIDE_SELECT = `
  SELECT r.*,
         student.full_name AS student_name,
         student.phone AS student_phone,
         driver.full_name AS driver_name,
         driver.phone AS driver_phone,
         driver.avatar_url AS driver_avatar_url,
         dp.rating_avg AS driver_rating,
         dp.completed_rides AS driver_completed_rides,
         v.plate_number AS vehicle_plate,
         v.make AS vehicle_make,
         v.model AS vehicle_model,
         v.type AS vehicle_type,
         univ.name AS university_name,
         univ.short_name AS university_short_name
  FROM ride_bookings r
  JOIN users student ON student.id = r.student_id
  LEFT JOIN users driver ON driver.id = r.driver_id
  LEFT JOIN driver_profiles dp ON dp.user_id = r.driver_id
  LEFT JOIN vehicles v ON v.id = r.vehicle_id
  JOIN universities univ ON univ.id = r.university_id
`;

export async function getRide(id: string) {
  return one<Record<string, unknown>>(`${RIDE_SELECT} WHERE r.id = $1`, [id]);
}

export async function getDriverProfile(userId: string) {
  return one<Record<string, unknown>>(
    `SELECT dp.*, u.full_name, u.phone, u.email, u.avatar_url,
            univ.name AS university_name, univ.short_name AS university_short_name,
            v.plate_number, v.make, v.model, v.year, v.type AS vehicle_type,
            v.tracking_device_id, v.insurance_expiry, v.verified_at AS vehicle_verified_at
     FROM driver_profiles dp
     JOIN users u ON u.id = dp.user_id
     JOIN universities univ ON univ.id = dp.university_id
     LEFT JOIN vehicles v ON v.driver_id = dp.user_id
     WHERE dp.user_id = $1`,
    [userId],
  );
}

export async function driverDocuments(userId: string) {
  return query(
    `SELECT id, type, file_url, status, verified_at, expires_at, created_at
     FROM verification_documents WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
}
