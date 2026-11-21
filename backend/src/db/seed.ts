import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { pool } from './index';

const IMG = {
  hostel: '/uploads/seed/hostel-exterior.jpg',
  room: '/uploads/seed/hostel-room.jpg',
  apartment: '/uploads/seed/apartment-living.jpg',
  hero: '/uploads/seed/hero-campus-ride.jpg',
};

const UNIVERSITIES = [
  {
    name: 'University of Dodoma',
    shortName: 'UDOM',
    city: 'Dodoma',
    region: 'Dodoma',
    latitude: -6.2086,
    longitude: 35.769,
    driverRadiusKm: 6,
    propertyRadiusKm: 12,
  },
  {
    name: 'University of Dar es Salaam',
    shortName: 'UDSM',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    latitude: -6.78,
    longitude: 39.205,
    driverRadiusKm: 5,
    propertyRadiusKm: 12,
  },
  {
    name: 'Sokoine University of Agriculture',
    shortName: 'SUA',
    city: 'Morogoro',
    region: 'Morogoro',
    latitude: -6.848,
    longitude: 37.65,
    driverRadiusKm: 5,
    propertyRadiusKm: 10,
  },
  {
    name: 'Mzumbe University',
    shortName: 'MU',
    city: 'Morogoro',
    region: 'Morogoro',
    latitude: -6.8934,
    longitude: 37.5734,
    driverRadiusKm: 5,
    propertyRadiusKm: 10,
  },
  {
    name: 'Ardhi University',
    shortName: 'ARU',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    latitude: -6.7667,
    longitude: 39.2333,
    driverRadiusKm: 5,
    propertyRadiusKm: 10,
  },
  {
    name: "St. John's University of Tanzania",
    shortName: 'SJUT',
    city: 'Dodoma',
    region: 'Dodoma',
    latitude: -6.1833,
    longitude: 35.75,
    driverRadiusKm: 5,
    propertyRadiusKm: 10,
  },
  {
    name: 'College of Business Education',
    shortName: 'CBE',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    latitude: -6.8167,
    longitude: 39.2833,
    driverRadiusKm: 5,
    propertyRadiusKm: 10,
  },
  {
    name: 'Muhimbili University of Health and Allied Sciences',
    shortName: 'MUHAS',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    latitude: -6.7833,
    longitude: 39.2667,
    driverRadiusKm: 4,
    propertyRadiusKm: 8,
  },
  {
    name: 'Nelson Mandela African Institution of Science and Technology',
    shortName: 'NM-AIST',
    city: 'Arusha',
    region: 'Arusha',
    latitude: -3.3667,
    longitude: 36.8333,
    driverRadiusKm: 5,
    propertyRadiusKm: 10,
  },
];

type RoomSeed = {
  name: string;
  capacity: number;
  pricePerMonth: number;
  bedCount: number;
};

async function insertUser(
  client: PoolClient,
  input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: 'STUDENT' | 'DRIVER' | 'OWNER' | 'ADMIN';
    universityId: string;
  },
) {
  const hash = await bcrypt.hash(input.password, 10);
  const result = await client.query<{ id: string }>(
    `INSERT INTO users (full_name, email, phone, password_hash, role, status, phone_verified, university_id)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true, $6) RETURNING id`,
    [input.fullName, input.email, input.phone, hash, input.role, input.universityId],
  );
  return result.rows[0].id;
}

async function insertProperty(
  client: PoolClient,
  input: {
    ownerId: string;
    universityId: string;
    name: string;
    type: 'HOSTEL' | 'HOUSE' | 'APARTMENT' | 'ROOM';
    description: string;
    addressArea: string;
    latitude: number;
    longitude: number;
    amenities: string[];
    images: string[];
    status: 'ACTIVE' | 'PENDING';
    rooms?: RoomSeed[];
    pricePerMonth?: number;
  },
) {
  const property = await client.query<{ id: string }>(
    `INSERT INTO properties
      (owner_id, university_id, type, name, description, address_area, latitude, longitude,
       amenities, status, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11) RETURNING id`,
    [
      input.ownerId,
      input.universityId,
      input.type,
      input.name,
      input.description,
      input.addressArea,
      input.latitude,
      input.longitude,
      JSON.stringify(input.amenities),
      input.status,
      input.status === 'ACTIVE' ? new Date() : null,
    ],
  );
  const propertyId = property.rows[0].id;

  for (const [index, url] of input.images.entries()) {
    await client.query(
      `INSERT INTO property_images (property_id, url, sort_order) VALUES ($1, $2, $3)`,
      [propertyId, url, index],
    );
  }

  if (input.rooms?.length) {
    for (const room of input.rooms) {
      const roomRow = await client.query<{ id: string }>(
        `INSERT INTO rooms (property_id, name, capacity, price_per_month, has_beds)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [propertyId, room.name, room.capacity, room.pricePerMonth, room.bedCount > 0],
      );
      if (room.bedCount > 0) {
        for (let i = 1; i <= room.bedCount; i += 1) {
          const bed = await client.query<{ id: string }>(
            `INSERT INTO beds (room_id, label, price_per_month) VALUES ($1, $2, $3) RETURNING id`,
            [roomRow.rows[0].id, `Bed ${i}`, room.pricePerMonth],
          );
          await client.query(
            `INSERT INTO bookable_units (property_id, room_id, bed_id, label, price_per_month)
             VALUES ($1, $2, $3, $4, $5)`,
            [propertyId, roomRow.rows[0].id, bed.rows[0].id, `${room.name} · Bed ${i}`, room.pricePerMonth],
          );
        }
      } else {
        await client.query(
          `INSERT INTO bookable_units (property_id, room_id, label, price_per_month)
           VALUES ($1, $2, $3, $4)`,
          [propertyId, roomRow.rows[0].id, room.name, room.pricePerMonth],
        );
      }
    }
  } else if (input.pricePerMonth) {
    await client.query(
      `INSERT INTO bookable_units (property_id, label, price_per_month)
       VALUES ($1, 'Entire property', $2)`,
      [propertyId, input.pricePerMonth],
    );
  }

  await client.query(
    `UPDATE properties SET price_from = COALESCE((
       SELECT MIN(price_per_month) FROM bookable_units WHERE property_id = $1
     ), 0) WHERE id = $1`,
    [propertyId],
  );

  return propertyId;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id FROM users WHERE email = 'admin@unirideunistay.co.tz'`,
    );
    if (existing.rowCount) {
      console.log('[seed] demo data already present — nothing to do');
      await client.query('ROLLBACK');
      return;
    }

    const universityIds = new Map<string, string>();
    for (const university of UNIVERSITIES) {
      const row = await client.query<{ id: string }>(
        `INSERT INTO universities
          (name, short_name, city, region, latitude, longitude, driver_radius_km, property_radius_km)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (short_name) DO UPDATE SET
           name = EXCLUDED.name, city = EXCLUDED.city, region = EXCLUDED.region,
           latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude
         RETURNING id`,
        [
          university.name,
          university.shortName,
          university.city,
          university.region,
          university.latitude,
          university.longitude,
          university.driverRadiusKm,
          university.propertyRadiusKm,
        ],
      );
      universityIds.set(university.shortName, row.rows[0].id);
    }
    const udomId = universityIds.get('UDOM')!;
    const udsmId = universityIds.get('UDSM')!;
    const suaId = universityIds.get('SUA')!;

    const adminId = await insertUser(client, {
      fullName: 'Neema Mwakalinga',
      email: 'admin@unirideunistay.co.tz',
      phone: '+255700000001',
      password: 'Admin@1234',
      role: 'ADMIN',
      universityId: udomId,
    });
    const studentId = await insertUser(client, {
      fullName: 'Amani Joseph',
      email: 'student@udom.ac.tz',
      phone: '+255712345678',
      password: 'Student@1234',
      role: 'STUDENT',
      universityId: udomId,
    });
    const driverId = await insertUser(client, {
      fullName: 'Hamisi Mzee',
      email: 'driver@uniride.co.tz',
      phone: '+255713456789',
      password: 'Driver@1234',
      role: 'DRIVER',
      universityId: udomId,
    });
    const driverTwoId = await insertUser(client, {
      fullName: 'Amina Salum',
      email: 'amina@uniride.co.tz',
      phone: '+255713456790',
      password: 'Driver@1234',
      role: 'DRIVER',
      universityId: udomId,
    });
    const ownerId = await insertUser(client, {
      fullName: 'Fatuma Rashid',
      email: 'owner@unistay.co.tz',
      phone: '+255714567890',
      password: 'Owner@1234',
      role: 'OWNER',
      universityId: udomId,
    });

    await client.query(
      `INSERT INTO student_profiles (user_id, student_id_number, university_id, verified_at)
       VALUES ($1, 'UDOM/2026/0001', $2, now())`,
      [studentId, udomId],
    );

    await client.query(
      `INSERT INTO driver_profiles
        (user_id, university_id, license_number, license_expiry, national_id, status,
         verification_status, current_lat, current_lng, last_heartbeat_at, rating_avg,
         rating_count, total_earnings, completed_rides)
       VALUES
        ($1, $3, 'DL-DOD-7712', CURRENT_DATE + interval '2 years', '19890101-12345-01-77',
         'IDLE', 'VERIFIED', -6.2055, 35.7702, now(), 4.80, 36, 184000, 42),
        ($2, $3, 'DL-DOD-8843', CURRENT_DATE + interval '3 years', '19920412-54321-01-88',
         'IDLE', 'VERIFIED', -6.2139, 35.7591, now(), 4.90, 58, 221000, 61)`,
      [driverId, driverTwoId, udomId],
    );
    await client.query(
      `INSERT INTO vehicles
        (driver_id, plate_number, make, model, year, type, tracking_device_id, verified_at)
       VALUES
        ($1, 'MC 456 DOD', 'Bajaj', 'Boxer 150', 2023, 'MOTORCYCLE', 'LATRA-TRK-001', now()),
        ($2, 'MC 781 DOD', 'Honda', 'CG 125', 2022, 'MOTORCYCLE', 'LATRA-TRK-002', now())`,
      [driverId, driverTwoId],
    );
    await client.query(
      `INSERT INTO verification_documents (user_id, type, file_url, status, verified_by, verified_at)
       VALUES
        ($1, 'LICENSE', '/uploads/seed/hero-campus-ride.jpg', 'APPROVED', $2, now()),
        ($1, 'NATIONAL_ID', '/uploads/seed/hero-campus-ride.jpg', 'APPROVED', $2, now())`,
      [driverId, adminId],
    );

    const kisasa = await insertProperty(client, {
      ownerId,
      universityId: udomId,
      name: 'Kisasa Comfort Hostel',
      type: 'HOSTEL',
      description:
        'A calm, secure hostel ten minutes from UDOM Main Gate. Each room is furnished with study desks, reading lamps and generous storage. Water is available 24/7 from a borehole with a backup tank, and the compound is watched by CCTV and a resident caretaker. Wi-Fi reaches every room and the shared kitchen is cleaned daily.',
      addressArea: 'Kisasa, Dodoma',
      latitude: -6.1953,
      longitude: 35.7608,
      amenities: ['24/7 security', 'Borehole water', 'Wi-Fi', 'Study desks', 'Shared kitchen', 'CCTV'],
      images: [IMG.hostel, IMG.room],
      status: 'ACTIVE',
      rooms: [
        { name: 'Six-bed shared room', capacity: 6, pricePerMonth: 65000, bedCount: 6 },
        { name: 'Twin shared room', capacity: 2, pricePerMonth: 95000, bedCount: 2 },
        { name: 'Private single room', capacity: 1, pricePerMonth: 140000, bedCount: 0 },
      ],
    });

    const nzuguni = await insertProperty(client, {
      ownerId,
      universityId: udomId,
      name: 'Nzuguni Student Lodge',
      type: 'HOSTEL',
      description:
        'Student-run lodge in Nzuguni with a friendly, quiet atmosphere and quick access to campus by bodaboda. Rooms are cleaned weekly, there is a shared dining area and a water tank on the roof. Prices include water and security; electricity is shared per room.',
      addressArea: 'Nzuguni, Dodoma',
      latitude: -6.2179,
      longitude: 35.7524,
      amenities: ['Water included', 'Security guard', 'Weekly cleaning', 'Shared kitchen', 'Parking'],
      images: [IMG.room, IMG.hostel],
      status: 'ACTIVE',
      rooms: [
        { name: 'Four-bed shared room', capacity: 4, pricePerMonth: 55000, bedCount: 4 },
        { name: 'Double room', capacity: 2, pricePerMonth: 80000, bedCount: 2 },
      ],
    });

    await insertProperty(client, {
      ownerId,
      universityId: udomId,
      name: 'Ipagala Heights Apartments',
      type: 'APARTMENT',
      description:
        'A bright two-bedroom apartment in Ipagala suited to final-year students or pairs who want privacy. The unit has a sitting room, kitchen, bathroom and reliable water storage. Easy morning commute to UDOM and walking distance to shops and a pharmacy.',
      addressArea: 'Ipagala, Dodoma',
      latitude: -6.1985,
      longitude: 35.747,
      amenities: ['Two bedrooms', 'Private kitchen', 'Water tank', 'Gated compound', 'Furnished'],
      images: [IMG.apartment],
      status: 'ACTIVE',
      pricePerMonth: 250000,
    });

    await insertProperty(client, {
      ownerId,
      universityId: udomId,
      name: "Chang'ombe Garden Rooms",
      type: 'ROOM',
      description:
        'A private room in a quiet family compound in Chang\'ombe, ideal for a student who prefers a homely setting. The room has its own entrance, a study corner and access to a garden. Rent includes water and security, with a shared outdoor kitchen.',
      addressArea: "Chang'ombe, Dodoma",
      latitude: -6.2241,
      longitude: 35.7762,
      amenities: ['Private entrance', 'Garden', 'Water included', 'Family compound'],
      images: [IMG.room],
      status: 'ACTIVE',
      rooms: [{ name: 'Room in shared house', capacity: 1, pricePerMonth: 80000, bedCount: 0 }],
    });

    await insertProperty(client, {
      ownerId,
      universityId: udsmId,
      name: 'Mwenge Student Flats',
      type: 'APARTMENT',
      description:
        'Modern student flats a short daladala ride from UDSM main campus. Each unit has two bedrooms, a sitting room and reliable water. The compound has a caretaker, night security and parking for two motorcycles.',
      addressArea: 'Mwenge, Dar es Salaam',
      latitude: -6.766,
      longitude: 39.267,
      amenities: ['Furnished', 'Night security', 'Parking', 'Water tank'],
      images: [IMG.apartment],
      status: 'ACTIVE',
      pricePerMonth: 180000,
    });

    await insertProperty(client, {
      ownerId,
      universityId: suaId,
      name: 'SUA Riverside Hostel',
      type: 'HOSTEL',
      description:
        'Newly renovated hostel near SUA with six-bed rooms, a large study hall and a canteen. The owner is waiting for document verification before opening bookings.',
      addressArea: 'Riverside, Morogoro',
      latitude: -6.844,
      longitude: 37.656,
      amenities: ['Study hall', 'Canteen', 'Security', 'Borehole water'],
      images: [IMG.hostel],
      status: 'PENDING',
      rooms: [{ name: 'Six-bed room', capacity: 6, pricePerMonth: 45000, bedCount: 6 }],
    });

    const unit = await client.query<{ id: string; label: string; price_per_month: number }>(
      `SELECT id, label, price_per_month FROM bookable_units
       WHERE property_id = $1 ORDER BY label LIMIT 1`,
      [kisasa],
    );
    const inquiry = await client.query<{ id: string }>(
      `INSERT INTO accommodation_inquiries
        (student_id, property_id, bookable_unit_id, move_in_date, duration_months, message)
       VALUES ($1, $2, $3, CURRENT_DATE + interval '14 days', 6,
               'Hi! I am a second-year UDOM student looking for a quiet, secure place from next month. Is water available 24/7 and are there study desks in the room?')
       RETURNING id`,
      [studentId, kisasa, unit.rows[0].id],
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES
        ($1, 'NEW_INQUIRY', 'New stay inquiry',
         'Amani is interested in Kisasa Comfort Hostel (6-month stay).',
         jsonb_build_object('inquiryId', $3::text, 'propertyId', $4::text)),
        ($2, 'WELCOME', 'Welcome to UNIRIDE UNISTAY',
         'Pick your university, browse verified stays and book a ride in seconds.',
         '{}'::jsonb)`,
      [ownerId, studentId, inquiry.rows[0].id, kisasa],
    );

    const pickupLat = -6.2073;
    const pickupLng = 35.7688;
    const destLat = -6.216;
    const destLng = 35.755;

    const completedRide = await client.query<{ id: string }>(
      `INSERT INTO ride_bookings
        (student_id, university_id, driver_id, vehicle_id, pickup_label, pickup_lat, pickup_lng,
         dest_label, dest_lat, dest_lng, distance_m, estimated_fare, final_fare,
         commission_rate, commission_amount, driver_earnings, status,
         requested_at, accepted_at, started_at, completed_at)
       VALUES ($1, $2, $3, (SELECT id FROM vehicles WHERE driver_id = $3),
         'UDOM Main Gate', $4, $5, 'Nzuguni Market', $6, $7, 2400, 2700, 2700,
         0.12, 324, 2376, 'COMPLETED',
         now() - interval '1 day 2 hours', now() - interval '1 day 2 hours' + interval '1 minute',
         now() - interval '1 day 2 hours' + interval '8 minutes',
         now() - interval '1 day 2 hours' + interval '22 minutes')
       RETURNING id`,
      [studentId, udomId, driverId, pickupLat, pickupLng, destLat, destLng],
    );
    await client.query(
      `INSERT INTO transactions (user_id, type, booking_type, booking_id, amount, provider, status)
       VALUES ($1, 'RIDE_FARE', 'RIDE', $2, 2700, 'CASH', 'RECORDED'),
              (NULL, 'RIDE_COMMISSION', 'RIDE', $2, 324, 'CASH', 'RECORDED'),
              ($3, 'DRIVER_EARNING', 'RIDE', $2, 2376, 'CASH', 'RECORDED')`,
      [studentId, completedRide.rows[0].id, driverId],
    );
    await client.query(
      `INSERT INTO reviews (reviewer_id, reviewee_id, booking_type, booking_id, rating, comment)
       VALUES ($1, $2, 'RIDE', $3, 5, 'Very punctual and careful on the road. Helped me with my bags too.')`,
      [studentId, driverId, completedRide.rows[0].id],
    );

    const requestedRide = await client.query<{ id: string }>(
      `INSERT INTO ride_bookings
        (student_id, university_id, pickup_label, pickup_lat, pickup_lng, dest_label,
         dest_lat, dest_lng, distance_m, estimated_fare, commission_rate, status, requested_at)
       VALUES ($1, $2, 'UDOM Main Gate', $3, $4, 'Kisasa Shopping Centre', $5, $6,
         3200, 3200, 0.12, 'REQUESTED', now() - interval '2 minutes')
       RETURNING id`,
      [studentId, udomId, pickupLat, pickupLng, -6.195, 35.7596],
    );
    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES
        ($1, 'RIDE_REQUEST', 'New ride request nearby',
         'UDOM Main Gate → Kisasa Shopping Centre • TZS 3,200',
         jsonb_build_object('rideId', $3::text)),
        ($2, 'RIDE_REQUEST', 'New ride request nearby',
         'UDOM Main Gate → Kisasa Shopping Centre • TZS 3,200',
         jsonb_build_object('rideId', $3::text))`,
      [driverId, driverTwoId, requestedRide.rows[0].id],
    );

    await client.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ('UDOM Students Association', 'sao@udom.ac.tz', '+255755000111',
         'Campus partnership',
         'Hello UNIRIDE UNISTAY team, we would like to discuss a student safety and transport partnership for the coming semester.')`,
    );

    await client.query('COMMIT');
    console.log('[seed] demo data created');
    console.log('  admin   admin@unirideunistay.co.tz / Admin@1234');
    console.log('  student student@udom.ac.tz / Student@1234');
    console.log('  driver  driver@uniride.co.tz / Driver@1234');
    console.log('  owner   owner@unistay.co.tz / Owner@1234');
    console.log(`  images  ${IMG.hero} (landing hero)`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
