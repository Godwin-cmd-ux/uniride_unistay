import { query } from '../db';

export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [userId, type, title, body, JSON.stringify(data)],
  );
}

export async function notifyMany(
  userIds: string[],
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
) {
  for (const userId of userIds) {
    await notify(userId, type, title, body, data);
  }
}
