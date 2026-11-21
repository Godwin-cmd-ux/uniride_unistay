import { Router } from 'express';
import { z } from 'zod';
import { PoolClient } from 'pg';
import { one, query, withTransaction } from '../db';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { camelize } from '../lib/camel';
import { notify } from '../services/notifications';
import { config } from '../config';
import { fileUrlSchema } from '../lib/validation';

const router = Router();

router.use(requireAuth, requireRole('OWNER'));

const urlSchema = fileUrlSchema;
const propertyTypes = z.enum(['HOSTEL', 'HOUSE', 'APARTMENT', 'ROOM']);

const roomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  capacity: z.coerce.number().int().min(1).max(12).default(1),
  pricePerMonth: z.coerce.number().min(1000).max(50_000_000),
  bedCount: z.coerce.number().int().min(0).max(12).default(0),
});

type RoomInput = {
  name: string;
  capacity: number;
  pricePerMonth: number;
  bedCount: number;
};

function normalizeRoom(room: z.input<typeof roomSchema>): RoomInput {
  return {
    name: room.name,
    capacity: room.capacity ?? 1,
    pricePerMonth: room.pricePerMonth,
    bedCount: room.bedCount ?? 0,
  };
}

const createPropertySchema = z.object({
  name: z.string().trim().min(3).max(120),
  type: propertyTypes,
  description: z.string().trim().min(20).max(4000),
  universityId: z.string().uuid(),
  addressArea: z.string().trim().min(2).max(120),
  latitude: z.coerce.number().finite().optional(),
  longitude: z.coerce.number().finite().optional(),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  images: z.array(urlSchema).max(10).default([]),
  rooms: z.array(roomSchema).max(30).default([]),
  pricePerMonth: z.coerce.number().min(1000).max(50_000_000).optional(),
});

const updatePropertySchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  type: propertyTypes.optional(),
  description: z.string().trim().min(20).max(4000).optional(),
  universityId: z.string().uuid().optional(),
  addressArea: z.string().trim().min(2).max(120).optional(),
  latitude: z.coerce.number().finite().optional(),
  longitude: z.coerce.number().finite().optional(),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  pricePerMonth: z.coerce.number().min(1000).max(50_000_000).optional(),
});

async function assertOwnProperty(propertyId: string, ownerId: string) {
  const property = await one<Record<string, unknown>>(
    `SELECT * FROM properties WHERE id = $1 AND owner_id = $2`,
    [propertyId, ownerId],
  );
  if (!property) throw new ApiError(404, 'Property not found', 'NOT_FOUND');
  return property;
}

async function createUnitsForRoom(
  client: PoolClient,
  propertyId: string,
  roomId: string,
  room: RoomInput,
) {
  if (room.bedCount > 0) {
    for (let index = 1; index <= room.bedCount; index += 1) {
      const bed = await client.query<{ id: string }>(
        `INSERT INTO beds (room_id, label, price_per_month) VALUES ($1, $2, $3) RETURNING id`,
        [roomId, `Bed ${index}`, room.pricePerMonth],
      );
      await client.query(
        `INSERT INTO bookable_units (property_id, room_id, bed_id, label, price_per_month)
         VALUES ($1, $2, $3, $4, $5)`,
        [propertyId, roomId, bed.rows[0].id, `${room.name} · Bed ${index}`, room.pricePerMonth],
      );
    }
    return;
  }
  await client.query(
    `INSERT INTO bookable_units (property_id, room_id, label, price_per_month)
     VALUES ($1, $2, $3, $4)`,
    [propertyId, roomId, room.name, room.pricePerMonth],
  );
}

async function refreshPriceFrom(propertyId: string) {
  await query(
    `UPDATE properties p SET price_from = COALESCE((
       SELECT MIN(price_per_month) FROM bookable_units WHERE property_id = $1 AND status <> 'INACTIVE'
     ), p.price_from), updated_at = now()
     WHERE p.id = $1`,
    [propertyId],
  );
}

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const counts = await one(
      `SELECT
         (SELECT count(*)::int FROM properties WHERE owner_id = $1 AND status <> 'ARCHIVED') AS properties,
         (SELECT count(*)::int FROM properties WHERE owner_id = $1 AND status = 'ACTIVE') AS active_properties,
         (SELECT count(*)::int FROM properties WHERE owner_id = $1 AND status = 'PENDING') AS pending_properties,
         (SELECT count(*)::int FROM bookable_units bu JOIN properties p ON p.id = bu.property_id
            WHERE p.owner_id = $1 AND bu.status = 'AVAILABLE') AS available_units,
         (SELECT count(*)::int FROM bookable_units bu JOIN properties p ON p.id = bu.property_id
            WHERE p.owner_id = $1 AND bu.status = 'OCCUPIED') AS occupied_units,
         (SELECT count(*)::int FROM accommodation_inquiries i JOIN properties p ON p.id = i.property_id
            WHERE p.owner_id = $1 AND i.status = 'PENDING') AS pending_inquiries,
         (SELECT count(*)::int FROM accommodation_bookings b JOIN properties p ON p.id = b.property_id
            WHERE p.owner_id = $1 AND b.status = 'ACTIVE') AS active_bookings,
         (SELECT COALESCE(SUM(success_fee), 0)::float FROM accommodation_bookings b
            JOIN properties p ON p.id = b.property_id WHERE p.owner_id = $1) AS total_success_fees,
         (SELECT COALESCE(SUM(total_amount), 0)::float FROM accommodation_bookings b
            JOIN properties p ON p.id = b.property_id WHERE p.owner_id = $1) AS total_rent_value`,
      [req.user!.id],
    );
    const recentInquiries = await query(
      `SELECT i.id, i.move_in_date, i.duration_months, i.status, i.created_at,
              p.name AS property_name, bu.label AS unit_label,
              split_part(u.full_name, ' ', 1) AS student_first_name
       FROM accommodation_inquiries i
       JOIN properties p ON p.id = i.property_id
       JOIN bookable_units bu ON bu.id = i.bookable_unit_id
       JOIN users u ON u.id = i.student_id
       WHERE p.owner_id = $1 ORDER BY i.created_at DESC LIMIT 5`,
      [req.user!.id],
    );
    ok(res, { counts: camelize(counts), recentInquiries: camelize(recentInquiries) });
  }),
);

router.get(
  '/properties',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT p.id, p.name, p.type, p.address_area, p.price_from, p.status, p.verified_at,
              p.created_at, u.short_name AS university_short_name,
              (SELECT url FROM property_images pi WHERE pi.property_id = p.id
                 ORDER BY sort_order, created_at LIMIT 1) AS image_url,
              (SELECT count(*)::int FROM bookable_units bu WHERE bu.property_id = p.id
                 AND bu.status = 'AVAILABLE') AS available_units,
              (SELECT count(*)::int FROM bookable_units bu WHERE bu.property_id = p.id) AS total_units,
              (SELECT count(*)::int FROM accommodation_inquiries i WHERE i.property_id = p.id
                 AND i.status = 'PENDING') AS pending_inquiries
       FROM properties p
       JOIN universities u ON u.id = p.university_id
       WHERE p.owner_id = $1 AND p.status <> 'ARCHIVED'
       ORDER BY p.created_at DESC`,
      [req.user!.id],
    );
    ok(res, camelize(rows));
  }),
);

router.get(
  '/properties/:id',
  asyncHandler(async (req, res) => {
    const property = await assertOwnProperty(req.params.id, req.user!.id);
    const [images, rooms, units] = await Promise.all([
      query(
        `SELECT id, url, sort_order FROM property_images WHERE property_id = $1
         ORDER BY sort_order, created_at`,
        [req.params.id],
      ),
      query(
        `SELECT id, name, capacity, price_per_month, has_beds, status FROM rooms
         WHERE property_id = $1 ORDER BY created_at`,
        [req.params.id],
      ),
      query(
        `SELECT id, room_id, bed_id, label, price_per_month, status FROM bookable_units
         WHERE property_id = $1 ORDER BY price_per_month`,
        [req.params.id],
      ),
    ]);
    ok(res, camelize({ property, images, rooms, units }));
  }),
);

router.post(
  '/properties',
  asyncHandler(async (req, res) => {
    const input = parseBody(createPropertySchema, req.body);
    const university = await one(
      `SELECT id FROM universities WHERE id = $1 AND status = 'ACTIVE'`,
      [input.universityId],
    );
    if (!university) throw new ApiError(400, 'Invalid university', 'INVALID_UNIVERSITY');
    const rooms = (input.rooms ?? []).map(normalizeRoom);
    const images = input.images ?? [];
    if (rooms.length === 0 && !input.pricePerMonth) {
      throw new ApiError(
        400,
        'Add at least one room/bed or set a monthly price for the entire property',
        'MISSING_PRICING',
      );
    }

    const propertyId = await withTransaction(async (client) => {
      const property = await client.query<{ id: string }>(
        `INSERT INTO properties
          (owner_id, university_id, type, name, description, address_area, latitude, longitude,
           amenities, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'PENDING')
         RETURNING id`,
        [
          req.user!.id,
          input.universityId,
          input.type,
          input.name,
          input.description,
          input.addressArea,
          input.latitude ?? null,
          input.longitude ?? null,
          JSON.stringify(input.amenities ?? []),
        ],
      );
      const id = property.rows[0].id;

      for (const [index, url] of images.entries()) {
        await client.query(
          `INSERT INTO property_images (property_id, url, sort_order) VALUES ($1, $2, $3)`,
          [id, url, index],
        );
      }

      for (const room of rooms) {
        const roomRow = await client.query<{ id: string }>(
          `INSERT INTO rooms (property_id, name, capacity, price_per_month, has_beds)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [id, room.name, room.capacity, room.pricePerMonth, room.bedCount > 0],
        );
        await createUnitsForRoom(client, id, roomRow.rows[0].id, room);
      }

      if (rooms.length === 0 && input.pricePerMonth) {
        await client.query(
          `INSERT INTO bookable_units (property_id, label, price_per_month)
           VALUES ($1, 'Entire property', $2)`,
          [id, input.pricePerMonth],
        );
      }

      await client.query(
        `UPDATE properties SET price_from = COALESCE((
           SELECT MIN(price_per_month) FROM bookable_units WHERE property_id = $1
         ), $2) WHERE id = $1`,
        [id, input.pricePerMonth ?? 0],
      );
      return id;
    });

    const property = await one(`SELECT * FROM properties WHERE id = $1`, [propertyId]);
    ok(res, camelize(property), 201);
  }),
);

router.patch(
  '/properties/:id',
  asyncHandler(async (req, res) => {
    const property = await assertOwnProperty(req.params.id, req.user!.id);
    const input = parseBody(updatePropertySchema, req.body);

    if (input.universityId) {
      const university = await one(`SELECT id FROM universities WHERE id = $1`, [
        input.universityId,
      ]);
      if (!university) throw new ApiError(400, 'Invalid university', 'INVALID_UNIVERSITY');
    }

    const mapping: Record<string, string> = {
      name: 'name',
      type: 'type',
      description: 'description',
      universityId: 'university_id',
      addressArea: 'address_area',
      latitude: 'latitude',
      longitude: 'longitude',
      amenities: 'amenities',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [field, column] of Object.entries(mapping)) {
      const value = (input as Record<string, unknown>)[field];
      if (value !== undefined) {
        values.push(field === 'amenities' ? JSON.stringify(value) : value);
        sets.push(`${column} = $${values.length}${field === 'amenities' ? '::jsonb' : ''}`);
      }
    }
    if (input.pricePerMonth !== undefined) {
      values.push(input.pricePerMonth);
      sets.push(`price_from = $${values.length}`);
    }
    values.push(req.params.id);
    sets.push(`status = CASE WHEN status IN ('REJECTED', 'PENDING') THEN 'PENDING' ELSE status END`);
    sets.push('updated_at = now()');
    await query(`UPDATE properties SET ${sets.join(', ')} WHERE id = $${values.length}`, values);

    if (input.pricePerMonth !== undefined) {
      await query(
        `UPDATE bookable_units SET price_per_month = $1
         WHERE property_id = $2 AND room_id IS NULL AND bed_id IS NULL`,
        [input.pricePerMonth, req.params.id],
      );
    }
    await refreshPriceFrom(String(property.id));

    ok(res, camelize(await one(`SELECT * FROM properties WHERE id = $1`, [req.params.id])));
  }),
);

router.delete(
  '/properties/:id',
  asyncHandler(async (req, res) => {
    await assertOwnProperty(req.params.id, req.user!.id);
    await query(`UPDATE properties SET status = 'ARCHIVED', updated_at = now() WHERE id = $1`, [
      req.params.id,
    ]);
    ok(res, { archived: true });
  }),
);

router.post(
  '/properties/:id/images',
  asyncHandler(async (req, res) => {
    await assertOwnProperty(req.params.id, req.user!.id);
    const input = parseBody(z.object({ url: urlSchema, sortOrder: z.coerce.number().int().optional() }), req.body);
    const image = await one(
      `INSERT INTO property_images (property_id, url, sort_order)
       VALUES ($1, $2, COALESCE($3, (SELECT count(*) FROM property_images WHERE property_id = $1)))
       RETURNING *`,
      [req.params.id, input.url, input.sortOrder ?? null],
    );
    ok(res, camelize(image), 201);
  }),
);

router.delete(
  '/images/:id',
  asyncHandler(async (req, res) => {
    const row = await one<{ property_id: string }>(
      `SELECT pi.property_id FROM property_images pi
       JOIN properties p ON p.id = pi.property_id
       WHERE pi.id = $1 AND p.owner_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (!row) throw new ApiError(404, 'Image not found', 'NOT_FOUND');
    await query(`DELETE FROM property_images WHERE id = $1`, [req.params.id]);
    ok(res, { deleted: true });
  }),
);

router.post(
  '/properties/:id/rooms',
  asyncHandler(async (req, res) => {
    await assertOwnProperty(req.params.id, req.user!.id);
    const room = normalizeRoom(parseBody(roomSchema, req.body));
    const roomId = await withTransaction(async (client) => {
      const created = await client.query<{ id: string }>(
        `INSERT INTO rooms (property_id, name, capacity, price_per_month, has_beds)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [req.params.id, room.name, room.capacity, room.pricePerMonth, room.bedCount > 0],
      );
      await createUnitsForRoom(client, req.params.id, created.rows[0].id, room);
      return created.rows[0].id;
    });
    await refreshPriceFrom(req.params.id);
    ok(
      res,
      camelize(await one(`SELECT * FROM rooms WHERE id = $1`, [roomId])),
      201,
    );
  }),
);

router.patch(
  '/rooms/:id',
  asyncHandler(async (req, res) => {
    const owner = await one(
      `SELECT r.id FROM rooms r JOIN properties p ON p.id = r.property_id
       WHERE r.id = $1 AND p.owner_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (!owner) throw new ApiError(404, 'Room not found', 'NOT_FOUND');
    const input = parseBody(
      z.object({
        name: z.string().trim().min(1).max(80).optional(),
        capacity: z.coerce.number().int().min(1).max(12).optional(),
        pricePerMonth: z.coerce.number().min(1000).max(50_000_000).optional(),
        status: z.enum(['AVAILABLE', 'INACTIVE']).optional(),
      }),
      req.body,
    );
    const room = await one<{ property_id: string }>(`SELECT * FROM rooms WHERE id = $1`, [
      req.params.id,
    ]);
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (input.name !== undefined) set('name', input.name);
    if (input.capacity !== undefined) set('capacity', input.capacity);
    if (input.pricePerMonth !== undefined) set('price_per_month', input.pricePerMonth);
    if (input.status !== undefined) set('status', input.status);
    if (sets.length) {
      values.push(req.params.id);
      await query(`UPDATE rooms SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    }
    if (room) await refreshPriceFrom(room.property_id);
    ok(res, camelize(await one(`SELECT * FROM rooms WHERE id = $1`, [req.params.id])));
  }),
);

router.delete(
  '/rooms/:id',
  asyncHandler(async (req, res) => {
    const room = await one<{ property_id: string }>(
      `SELECT r.property_id FROM rooms r JOIN properties p ON p.id = r.property_id
       WHERE r.id = $1 AND p.owner_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (!room) throw new ApiError(404, 'Room not found', 'NOT_FOUND');
    try {
      await query(`DELETE FROM rooms WHERE id = $1`, [req.params.id]);
    } catch (error) {
      if ((error as { code?: string }).code === '23503') {
        throw new ApiError(
          409,
          'This room has bookings attached and cannot be deleted',
          'ROOM_IN_USE',
        );
      }
      throw error;
    }
    await refreshPriceFrom(room.property_id);
    ok(res, { deleted: true });
  }),
);

router.patch(
  '/units/:id',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({ status: z.enum(['AVAILABLE', 'INACTIVE']), pricePerMonth: z.coerce.number().min(1000).optional() }),
      req.body,
    );
    const unit = await one<{ property_id: string; status: string }>(
      `SELECT bu.property_id, bu.status FROM bookable_units bu
       JOIN properties p ON p.id = bu.property_id
       WHERE bu.id = $1 AND p.owner_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (!unit) throw new ApiError(404, 'Unit not found', 'NOT_FOUND');
    if (unit.status === 'OCCUPIED' && input.status === 'INACTIVE') {
      throw new ApiError(409, 'Unit is currently occupied', 'UNIT_OCCUPIED');
    }
    await query(
      `UPDATE bookable_units SET status = $1,
         price_per_month = COALESCE($2, price_per_month) WHERE id = $3`,
      [input.status, input.pricePerMonth ?? null, req.params.id],
    );
    await refreshPriceFrom(unit.property_id);
    ok(res, camelize(await one(`SELECT * FROM bookable_units WHERE id = $1`, [req.params.id])));
  }),
);

router.get(
  '/inquiries',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT i.id, i.move_in_date, i.duration_months, i.message, i.status,
              i.response_message, i.created_at, i.responded_at,
              p.id AS property_id, p.name AS property_name, p.address_area,
              bu.label AS unit_label, bu.price_per_month,
              u.full_name AS student_name,
              u.university_id,
              univ.short_name AS student_university,
              CASE WHEN i.status = 'ACCEPTED' THEN u.phone ELSE NULL END AS student_phone
       FROM accommodation_inquiries i
       JOIN properties p ON p.id = i.property_id
       JOIN bookable_units bu ON bu.id = i.bookable_unit_id
       JOIN users u ON u.id = i.student_id
       LEFT JOIN universities univ ON univ.id = u.university_id
       WHERE p.owner_id = $1
       ORDER BY CASE i.status WHEN 'PENDING' THEN 0 ELSE 1 END, i.created_at DESC`,
      [req.user!.id],
    );
    ok(res, camelize(rows));
  }),
);

router.post(
  '/inquiries/:id/respond',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        action: z.enum(['ACCEPT', 'DECLINE']),
        message: z.string().trim().max(1000).optional().or(z.literal('')),
      }),
      req.body,
    );

    const result = await withTransaction(async (client) => {
      const inquiryResult = await client.query<Record<string, unknown>>(
        `SELECT i.*, p.owner_id, p.name AS property_name
         FROM accommodation_inquiries i
         JOIN properties p ON p.id = i.property_id
         WHERE i.id = $1 FOR UPDATE OF i`,
        [req.params.id],
      );
      const inquiry = inquiryResult.rows[0];
      if (!inquiry) throw new ApiError(404, 'Inquiry not found', 'NOT_FOUND');
      if (inquiry.owner_id !== req.user!.id) {
        throw new ApiError(403, 'Not your property', 'FORBIDDEN');
      }
      if (inquiry.status !== 'PENDING') {
        throw new ApiError(409, 'This inquiry has already been handled', 'INVALID_STATE');
      }

      if (input.action === 'DECLINE') {
        await client.query(
          `UPDATE accommodation_inquiries
           SET status = 'DECLINED', response_message = $1, responded_at = now() WHERE id = $2`,
          [input.message || null, req.params.id],
        );
        return { inquiry, booking: null };
      }

      const unitResult = await client.query<Record<string, unknown>>(
        `SELECT bu.*, p.owner_id FROM bookable_units bu
         JOIN properties p ON p.id = bu.property_id
         WHERE bu.id = $1 FOR UPDATE OF bu`,
        [inquiry.bookable_unit_id],
      );
      const unit = unitResult.rows[0];
      if (!unit || unit.owner_id !== req.user!.id) {
        throw new ApiError(409, 'This unit is no longer available', 'UNIT_UNAVAILABLE');
      }
      if (unit.status !== 'AVAILABLE') {
        throw new ApiError(
          409,
          'This unit is already occupied. Decline and suggest an alternative.',
          'UNIT_UNAVAILABLE',
        );
      }

      const startDate = String(inquiry.move_in_date).slice(0, 10);
      const months = Number(inquiry.duration_months);
      const overlap = await client.query(
        `SELECT 1 FROM accommodation_bookings
         WHERE bookable_unit_id = $1 AND status = 'ACTIVE'
           AND start_date < ($2::date + ($3 || ' months')::interval)::date
           AND end_date > $2::date
         LIMIT 1`,
        [inquiry.bookable_unit_id, startDate, String(months)],
      );
      if (overlap.rowCount) {
        throw new ApiError(
          409,
          'Those dates overlap an existing booking for this unit',
          'DATE_CONFLICT',
        );
      }

      const monthlyRent = Number(unit.price_per_month);
      const totalAmount = Math.round(monthlyRent * months * 100) / 100;
      const successFee =
        Math.round(monthlyRent * config.accommodationSuccessFeeRate * 100) / 100;

      const booking = await client.query<Record<string, unknown>>(
        `INSERT INTO accommodation_bookings
          (inquiry_id, student_id, property_id, bookable_unit_id, start_date, end_date,
           monthly_rent, total_amount, success_fee)
         VALUES ($1, $2, $3, $4, $5, ($5::date + ($6 || ' months')::interval)::date,
                 $7, $8, $9)
         RETURNING *`,
        [
          req.params.id,
          inquiry.student_id,
          inquiry.property_id,
          inquiry.bookable_unit_id,
          startDate,
          String(months),
          monthlyRent,
          totalAmount,
          successFee,
        ],
      );

      await client.query(
        `UPDATE accommodation_inquiries
         SET status = 'ACCEPTED', response_message = $1, responded_at = now() WHERE id = $2`,
        [input.message || null, req.params.id],
      );
      await client.query(`UPDATE bookable_units SET status = 'OCCUPIED' WHERE id = $1`, [
        inquiry.bookable_unit_id,
      ]);
      await client.query(
        `INSERT INTO transactions (user_id, type, booking_type, booking_id, amount, provider, status)
         VALUES ($1, 'ACCOMMODATION_FEE', 'ACCOMMODATION', $2, $3, 'INVOICE', 'PENDING')`,
        [req.user!.id, booking.rows[0].id, successFee],
      );
      return { inquiry, booking: booking.rows[0] };
    });

    const accepted = Boolean(result.booking);
    await notify(
      String(result.inquiry.student_id),
      accepted ? 'INQUIRY_ACCEPTED' : 'INQUIRY_DECLINED',
      accepted ? 'Your stay inquiry was accepted' : 'Your stay inquiry was declined',
      accepted
        ? `Great news — ${String(result.inquiry.property_name)} accepted your inquiry. The host will contact you to arrange payment and move-in.`
        : `${String(result.inquiry.property_name)} could not accept your inquiry. ${input.message ?? ''}`,
      { inquiryId: result.inquiry.id, propertyId: result.inquiry.property_id },
    );

    ok(res, { status: accepted ? 'ACCEPTED' : 'DECLINED', booking: camelize(result.booking) });
  }),
);

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT b.*, p.name AS property_name, p.address_area, bu.label AS unit_label,
              u.full_name AS student_name, u.phone AS student_phone,
              univ.short_name AS student_university
       FROM accommodation_bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN bookable_units bu ON bu.id = b.bookable_unit_id
       JOIN users u ON u.id = b.student_id
       LEFT JOIN universities univ ON univ.id = u.university_id
       WHERE p.owner_id = $1 ORDER BY b.confirmed_at DESC`,
      [req.user!.id],
    );
    ok(res, camelize(rows));
  }),
);

router.post(
  '/bookings/:id/complete',
  asyncHandler(async (req, res) => {
    const booking = await withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT b.*, p.owner_id FROM accommodation_bookings b
         JOIN properties p ON p.id = b.property_id
         WHERE b.id = $1 FOR UPDATE OF b`,
        [req.params.id],
      );
      const row = result.rows[0];
      if (!row) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');
      if (row.owner_id !== req.user!.id) throw new ApiError(403, 'Not your booking', 'FORBIDDEN');
      if (row.status !== 'ACTIVE') {
        throw new ApiError(409, 'Only active bookings can be closed', 'INVALID_STATE');
      }
      await client.query(
        `UPDATE accommodation_bookings SET status = 'COMPLETED', ended_at = now() WHERE id = $1`,
        [req.params.id],
      );
      await client.query(`UPDATE bookable_units SET status = 'AVAILABLE' WHERE id = $1`, [
        row.bookable_unit_id,
      ]);
      return row;
    });
    await notify(
      String(booking.student_id),
      'BOOKING_COMPLETED',
      'Your stay booking has ended',
      'The host marked your tenancy as complete. Thanks for staying through UNISTAY.',
      { bookingId: req.params.id },
    );
    ok(res, camelize(await one(`SELECT * FROM accommodation_bookings WHERE id = $1`, [req.params.id])));
  }),
);

export default router;
