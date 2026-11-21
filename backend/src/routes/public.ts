import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http';
import { camelize } from '../lib/camel';
import { expireStaleDrivers } from '../services/drivers';
import { fareConfigSummary } from '../lib/fare';

const router = Router();

const PROPERTY_LIST_SQL = `
  SELECT p.id, p.name, p.type, p.description, p.address_area, p.price_from, p.amenities,
         p.verified_at, p.created_at,
         u.id AS university_id, u.short_name AS university_short_name, u.name AS university_name,
         (SELECT pi.url FROM property_images pi WHERE pi.property_id = p.id
            ORDER BY pi.sort_order, pi.created_at LIMIT 1) AS image_url,
         (SELECT count(*)::int FROM bookable_units bu
            WHERE bu.property_id = p.id AND bu.status = 'AVAILABLE') AS available_units,
         CASE WHEN p.latitude IS NULL OR p.longitude IS NULL THEN NULL ELSE ROUND(
           6371000 * 2 * ASIN(SQRT(
             POWER(SIN(RADIANS(p.latitude - COALESCE(sel.latitude, u.latitude)) / 2), 2) +
             COS(RADIANS(COALESCE(sel.latitude, u.latitude))) * COS(RADIANS(p.latitude)) *
             POWER(SIN(RADIANS(p.longitude - COALESCE(sel.longitude, u.longitude)) / 2), 2)
           ))
         ) END AS distance_m
  FROM properties p
  JOIN universities u ON u.id = p.university_id
  LEFT JOIN universities sel ON sel.id = $1::uuid
  WHERE p.status = 'ACTIVE'
    AND (
      $1::uuid IS NULL
      OR p.university_id = $1::uuid
      OR (
        p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND 6371000 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(p.latitude - sel.latitude) / 2), 2) +
          COS(RADIANS(sel.latitude)) * COS(RADIANS(p.latitude)) *
          POWER(SIN(RADIANS(p.longitude - sel.longitude) / 2), 2)
        )) <= sel.property_radius_km * 1000
      )
    )
`;

const PUBLIC_SAFE_FIELDS = (row: Record<string, unknown>) => {
  const { latitude, longitude, ...safe } = row;
  return safe;
};

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const universityId =
      typeof req.query.universityId === 'string' && req.query.universityId
        ? req.query.universityId
        : null;

    await expireStaleDrivers();

    const universities = await query(
      `SELECT id, name, short_name, city, region, latitude, longitude,
              driver_radius_km, property_radius_km
       FROM universities WHERE status = 'ACTIVE' ORDER BY name`,
    );

    const stats = await one(
      `SELECT
        (SELECT count(*)::int FROM universities WHERE status = 'ACTIVE') AS universities,
        (SELECT count(*)::int FROM users WHERE role = 'STUDENT') AS students,
        (SELECT count(*)::int FROM driver_profiles WHERE verification_status = 'VERIFIED') AS verified_drivers,
        (SELECT count(*)::int FROM properties WHERE status = 'ACTIVE') AS active_properties,
        (SELECT count(*)::int FROM ride_bookings WHERE status = 'COMPLETED') AS completed_rides,
        (SELECT count(*)::int FROM users WHERE role = 'OWNER') AS owners`,
    );

    let selected: Record<string, unknown> | null = null;
    let sampleProperties: unknown[] = [];

    if (universityId) {
      const university = await one<Record<string, unknown>>(
        `SELECT id, name, short_name, city, region, latitude, longitude,
                driver_radius_km, property_radius_km
         FROM universities WHERE id = $1 AND status = 'ACTIVE'`,
        [universityId],
      );
      if (university) {
        const driversAvailable = await one<{ count: number }>(
          `SELECT count(*)::int AS count FROM driver_profiles
           WHERE university_id = $1 AND status = 'IDLE' AND verification_status = 'VERIFIED'`,
          [universityId],
        );
        const propertiesCount = await one<{ count: number }>(
          `SELECT count(*)::int AS count FROM properties
           WHERE status = 'ACTIVE' AND university_id = $1`,
          [universityId],
        );
        const props = await query(
          `${PROPERTY_LIST_SQL}
           ORDER BY (p.verified_at IS NOT NULL) DESC, available_units DESC, p.created_at DESC
           LIMIT 3`,
          [universityId],
        );
        sampleProperties = props.map((row) =>
          camelize(PUBLIC_SAFE_FIELDS(row as Record<string, unknown>)),
        );
        selected = {
          ...(camelize(university) as Record<string, unknown>),
          driversAvailable: driversAvailable?.count ?? 0,
          propertiesCount: propertiesCount?.count ?? 0,
        };
      }
    }

    if (!selected) {
      const props = await query(
        `${PROPERTY_LIST_SQL}
         ORDER BY (p.verified_at IS NOT NULL) DESC, p.created_at DESC LIMIT 3`,
        [null],
      );
      sampleProperties = props.map((row) =>
        camelize(PUBLIC_SAFE_FIELDS(row as Record<string, unknown>)),
      );
    }

    ok(res, {
      universities: camelize(universities),
      stats: camelize(stats),
      selected,
      sampleProperties,
      fare: fareConfigSummary(),
    });
  }),
);

router.get(
  '/drivers',
  asyncHandler(async (req, res) => {
    const universityId =
      typeof req.query.universityId === 'string' ? req.query.universityId : null;
    if (!universityId) throw new ApiError(400, 'universityId is required', 'MISSING_UNIVERSITY');
    await expireStaleDrivers();
    const row = await one<{ count: number }>(
      `SELECT count(*)::int AS count FROM driver_profiles
       WHERE university_id = $1 AND status = 'IDLE' AND verification_status = 'VERIFIED'`,
      [universityId],
    );
    ok(res, {
      availableDrivers: row?.count ?? 0,
      privacy:
        'Aggregate availability only. Driver identities are shared after a ride is accepted.',
    });
  }),
);

router.get(
  '/properties',
  asyncHandler(async (req, res) => {
    const params = z
      .object({
        universityId: z.string().uuid().optional(),
        type: z.enum(['HOSTEL', 'HOUSE', 'APARTMENT', 'ROOM']).optional(),
        minPrice: z.coerce.number().nonnegative().optional(),
        maxPrice: z.coerce.number().nonnegative().optional(),
        search: z.string().trim().max(100).optional(),
        sort: z.enum(['newest', 'price_asc', 'price_desc', 'nearest']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(48).default(9),
      })
      .parse(req.query);

    const values: unknown[] = [params.universityId ?? null];
    const filters: string[] = [];
    const nextParam = () => `$${values.length}`;

    if (params.type) {
      values.push(params.type);
      filters.push(`p.type = ${nextParam()}`);
    }
    if (params.minPrice !== undefined) {
      values.push(params.minPrice);
      filters.push(`p.price_from >= ${nextParam()}`);
    }
    if (params.maxPrice !== undefined) {
      values.push(params.maxPrice);
      filters.push(`p.price_from <= ${nextParam()}`);
    }
    if (params.search) {
      const pattern = `%${params.search}%`;
      values.push(pattern, pattern, pattern);
      const [a, b, c] = [values.length - 2, values.length - 1, values.length].map(
        (n) => `$${n}`,
      );
      filters.push(`(p.name ILIKE ${a} OR p.address_area ILIKE ${b} OR u.short_name ILIKE ${c})`);
    }
    const where = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const order =
      params.sort === 'price_asc'
        ? 'p.price_from ASC, p.created_at DESC'
        : params.sort === 'price_desc'
          ? 'p.price_from DESC, p.created_at DESC'
          : params.sort === 'nearest'
            ? 'distance_m ASC NULLS LAST, p.created_at DESC'
            : 'p.created_at DESC';

    const countParams = values.slice();
    const limitPlaceholder = `$${values.length + 1}`;
    const offsetPlaceholder = `$${values.length + 2}`;
    values.push(params.pageSize, (params.page - 1) * params.pageSize);
    const listParams = values;

    const listSql = `${PROPERTY_LIST_SQL} ${where} ORDER BY ${order}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`;

    const countSql = `SELECT count(*)::int AS count FROM properties p
      JOIN universities u ON u.id = p.university_id
      LEFT JOIN universities sel ON sel.id = $1::uuid
      WHERE p.status = 'ACTIVE' AND ($1::uuid IS NULL OR p.university_id = $1::uuid OR (
        p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND 6371000 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(p.latitude - sel.latitude) / 2), 2) +
          COS(RADIANS(sel.latitude)) * COS(RADIANS(p.latitude)) *
          POWER(SIN(RADIANS(p.longitude - sel.longitude) / 2), 2)
        )) <= sel.property_radius_km * 1000)) ${where}`;

    const [items, count] = await Promise.all([
      query(listSql, listParams),
      one<{ count: number }>(countSql, countParams),
    ]);

    ok(res, {
      items: items.map((row) => camelize(PUBLIC_SAFE_FIELDS(row as Record<string, unknown>))),
      total: count?.count ?? 0,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil((count?.count ?? 0) / params.pageSize)),
    });
  }),
);

router.get(
  '/properties/:id',
  asyncHandler(async (req, res) => {
    const property = await one<Record<string, unknown>>(
      `SELECT p.id, p.name, p.type, p.description, p.address_area, p.price_from, p.amenities,
              p.verified_at, p.created_at, p.latitude, p.longitude,
              u.id AS university_id, u.short_name AS university_short_name, u.name AS university_name,
              u.latitude AS university_latitude, u.longitude AS university_longitude,
              owner.full_name AS owner_name
       FROM properties p
       JOIN universities u ON u.id = p.university_id
       JOIN users owner ON owner.id = p.owner_id
       WHERE p.id = $1 AND p.status = 'ACTIVE'`,
      [req.params.id],
    );
    if (!property) throw new ApiError(404, 'Property not found', 'NOT_FOUND');

    const [images, rooms, units, reviews] = await Promise.all([
      query(
        `SELECT id, url, sort_order FROM property_images WHERE property_id = $1
         ORDER BY sort_order, created_at`,
        [req.params.id],
      ),
      query(
        `SELECT id, name, capacity, price_per_month, has_beds,
                (SELECT count(*)::int FROM beds b WHERE b.room_id = rooms.id) AS bed_count
         FROM rooms WHERE property_id = $1 AND status = 'AVAILABLE' ORDER BY price_per_month`,
        [req.params.id],
      ),
      query(
        `SELECT bu.id, bu.label, bu.price_per_month, bu.status,
                r.name AS room_name, b.label AS bed_label
         FROM bookable_units bu
         LEFT JOIN rooms r ON r.id = bu.room_id
         LEFT JOIN beds b ON b.id = bu.bed_id
         WHERE bu.property_id = $1 AND bu.status = 'AVAILABLE'
         ORDER BY bu.price_per_month`,
        [req.params.id],
      ),
      query(
        `SELECT rv.rating, rv.comment, rv.created_at,
                split_part(u.full_name, ' ', 1) AS reviewer_name
         FROM reviews rv
         JOIN users u ON u.id = rv.reviewer_id
         WHERE rv.booking_type = 'ACCOMMODATION' AND rv.booking_id IN (
           SELECT b.id FROM accommodation_bookings b WHERE b.property_id = $1
         )
         ORDER BY rv.created_at DESC LIMIT 5`,
        [req.params.id],
      ),
    ]);

    const lat = property.latitude as number | null;
    const lng = property.longitude as number | null;
    const uniLat = property.university_latitude as number;
    const uniLng = property.university_longitude as number;
    let distanceM: number | null = null;
    if (lat !== null && lng !== null) {
      const { haversineMeters } = await import('../lib/geo');
      distanceM = haversineMeters(lat, lng, uniLat, uniLng);
    }

    const {
      latitude: _lat,
      longitude: _lng,
      university_latitude: _ul,
      university_longitude: _uo,
      owner_name: ownerName,
      ...safeProperty
    } = property;

    ok(res, {
      property: camelize({
        ...safeProperty,
        owner_display_name: `${String(ownerName ?? 'Verified host').split(' ')[0]} — verified host`,
        distance_m: distanceM,
        images,
        rooms,
        units,
        reviews,
      }),
      privacy: 'Exact address is shared by the owner after your inquiry is accepted.',
    });
  }),
);

router.post(
  '/contact',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email(),
        phone: z.string().trim().max(30).optional().or(z.literal('')),
        subject: z.string().trim().min(3).max(160),
        message: z.string().trim().min(10).max(4000),
      }),
      req.body,
    );
    await query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.name, input.email.toLowerCase(), input.phone || null, input.subject, input.message],
    );
    ok(res, { received: true }, 201);
  }),
);

router.get(
  '/faq',
  asyncHandler(async (_req, res) => {
    const fare = fareConfigSummary();
    ok(res, [
      {
        question: 'Which universities are supported?',
        answer:
          'We launch university-by-university. UDOM is live first, with other Tanzanian campuses queued as supply grows.',
      },
      {
        question: 'How does UNIRIDE pricing work?',
        answer: `Fares combine a TZS ${fare.baseFare} base and TZS ${fare.perKm} per km, with a TZS ${fare.minimumFare} minimum. The estimate is shown before you book.`,
      },
      {
        question: 'Is my exact address public?',
        answer:
          'No. Stay listings show neighbourhoods only. Exact details are shared once an owner accepts your inquiry.',
      },
      {
        question: 'How are hosts and drivers verified?',
        answer:
          'Drivers submit licence, ID and vehicle details; hosts submit ownership documents. Our team reviews each before a verified badge appears.',
      },
    ]);
  }),
);

export default router;
