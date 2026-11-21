import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { asyncHandler, ok, parseBody, ApiError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { camelize } from '../lib/camel';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        againstUserId: z.string().uuid().optional(),
        bookingType: z.enum(['RIDE', 'ACCOMMODATION']).optional(),
        bookingId: z.string().uuid().optional(),
        subject: z.string().trim().min(3).max(160),
        description: z.string().trim().min(10).max(4000),
      }),
      req.body,
    );
    const complaint = await one(
      `INSERT INTO complaints
        (complainant_id, against_user_id, booking_type, booking_id, subject, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user!.id,
        input.againstUserId ?? null,
        input.bookingType ?? null,
        input.bookingId ?? null,
        input.subject,
        input.description,
      ],
    );
    ok(res, camelize(complaint), 201);
  }),
);

router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT id, subject, description, status, resolution, created_at, updated_at
       FROM complaints WHERE complainant_id = $1 ORDER BY created_at DESC`,
      [req.user!.id],
    );
    ok(res, camelize(rows));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await one(
      `SELECT id, subject, description, status, resolution, created_at, updated_at
       FROM complaints WHERE id = $1 AND complainant_id = $2`,
      [req.params.id, req.user!.id],
    );
    if (!row) throw new ApiError(404, 'Complaint not found', 'NOT_FOUND');
    ok(res, camelize(row));
  }),
);

export default router;
