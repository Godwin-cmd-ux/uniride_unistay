import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { camelize } from '../lib/camel';
import { notify } from '../services/notifications';

const router = Router();

router.use(requireAuth, requireRole('STUDENT'));

const inquirySchema = z.object({
  propertyId: z.string().uuid(),
  bookableUnitId: z.string().uuid(),
  moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  durationMonths: z.coerce.number().int().min(1).max(36),
  message: z.string().trim().max(1500).optional().or(z.literal('')),
});

router.post(
  '/inquiries',
  asyncHandler(async (req, res) => {
    const input = parseBody(inquirySchema, req.body);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${input.moveInDate}T00:00:00`) < today) {
      throw new ApiError(400, 'Move-in date cannot be in the past', 'INVALID_DATE');
    }

    const unit = await one<Record<string, unknown>>(
      `SELECT bu.id, bu.property_id, bu.status, bu.price_per_month,
              p.name AS property_name, p.owner_id, p.status AS property_status
       FROM bookable_units bu
       JOIN properties p ON p.id = bu.property_id
       WHERE bu.id = $1`,
      [input.bookableUnitId],
    );
    if (!unit || unit.property_id !== input.propertyId) {
      throw new ApiError(404, 'That room or bed no longer exists', 'NOT_FOUND');
    }
    if (unit.property_status !== 'ACTIVE') {
      throw new ApiError(409, 'This property is not currently accepting inquiries', 'NOT_LISTED');
    }
    if (unit.status !== 'AVAILABLE') {
      throw new ApiError(409, 'That unit is no longer available', 'UNIT_UNAVAILABLE');
    }

    const pending = await one(
      `SELECT id FROM accommodation_inquiries
       WHERE student_id = $1 AND bookable_unit_id = $2 AND status = 'PENDING'`,
      [req.user!.id, input.bookableUnitId],
    );
    if (pending) {
      throw new ApiError(
        409,
        'You already have a pending inquiry for this unit',
        'INQUIRY_EXISTS',
      );
    }

    const inquiry = await one<Record<string, unknown>>(
      `INSERT INTO accommodation_inquiries
        (student_id, property_id, bookable_unit_id, move_in_date, duration_months, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user!.id,
        input.propertyId,
        input.bookableUnitId,
        input.moveInDate,
        input.durationMonths,
        input.message ?? '',
      ],
    );

    await notify(
      String(unit.owner_id),
      'NEW_INQUIRY',
      'New stay inquiry',
      `${req.user!.fullName.split(' ')[0]} is interested in ${String(unit.property_name)} (move-in ${input.moveInDate}, ${input.durationMonths} month(s)).`,
      { inquiryId: inquiry!.id, propertyId: input.propertyId },
    );

    ok(res, camelize(inquiry), 201);
  }),
);

router.get(
  '/inquiries/mine',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT i.*, p.name AS property_name, p.type AS property_type,
              p.address_area, p.id AS property_id,
              (SELECT url FROM property_images pi WHERE pi.property_id = p.id
                 ORDER BY sort_order, created_at LIMIT 1) AS image_url,
              bu.label AS unit_label, bu.price_per_month,
              owner.full_name AS owner_name,
              CASE WHEN i.status = 'ACCEPTED' THEN owner.phone ELSE NULL END AS owner_phone,
              b.id AS booking_id, b.status AS booking_status, b.start_date, b.end_date,
              b.total_amount, b.monthly_rent
       FROM accommodation_inquiries i
       JOIN properties p ON p.id = i.property_id
       JOIN bookable_units bu ON bu.id = i.bookable_unit_id
       JOIN users owner ON owner.id = p.owner_id
       LEFT JOIN accommodation_bookings b ON b.inquiry_id = i.id
       WHERE i.student_id = $1
       ORDER BY i.created_at DESC`,
      [req.user!.id],
    );
    ok(res, camelize(rows));
  }),
);

router.post(
  '/inquiries/:id/withdraw',
  asyncHandler(async (req, res) => {
    const inquiry = await one<Record<string, unknown>>(
      `SELECT * FROM accommodation_inquiries WHERE id = $1 AND student_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (!inquiry) throw new ApiError(404, 'Inquiry not found', 'NOT_FOUND');
    if (inquiry.status !== 'PENDING') {
      throw new ApiError(409, 'Only pending inquiries can be withdrawn', 'INVALID_STATE');
    }
    await query(
      `UPDATE accommodation_inquiries
       SET status = 'WITHDRAWN', responded_at = now() WHERE id = $1`,
      [req.params.id],
    );
    const property = await one<{ owner_id: string }>(
      `SELECT owner_id FROM properties WHERE id = $1`,
      [inquiry.property_id],
    );
    if (property) {
      await notify(
        property.owner_id,
        'INQUIRY_WITHDRAWN',
        'An inquiry was withdrawn',
        'A student withdrew their stay inquiry. The unit is available again.',
        { inquiryId: req.params.id },
      );
    }
    ok(res, camelize(await one(`SELECT * FROM accommodation_inquiries WHERE id = $1`, [req.params.id])));
  }),
);

router.get(
  '/bookings/mine',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT b.*, p.name AS property_name, p.address_area, p.type AS property_type,
              bu.label AS unit_label,
              owner.full_name AS owner_name, owner.phone AS owner_phone,
              (SELECT url FROM property_images pi WHERE pi.property_id = p.id
                 ORDER BY sort_order, created_at LIMIT 1) AS image_url
       FROM accommodation_bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN bookable_units bu ON bu.id = b.bookable_unit_id
       JOIN users owner ON owner.id = p.owner_id
       WHERE b.student_id = $1
       ORDER BY b.confirmed_at DESC`,
      [req.user!.id],
    );
    ok(res, camelize(rows));
  }),
);

export default router;
