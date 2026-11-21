import { Router } from 'express';
import { one, query } from '../db';
import { asyncHandler, ok } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { camelize } from '../lib/camel';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT id, type, title, body, data, read_at, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60`,
      [req.user!.id],
    );
    const unread = await one<{ count: number }>(
      `SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [req.user!.id],
    );
    ok(res, { items: camelize(rows), unreadCount: unread?.count ?? 0 });
  }),
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id],
    );
    ok(res, { read: true });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
      [req.user!.id],
    );
    ok(res, { read: true });
  }),
);

export default router;
