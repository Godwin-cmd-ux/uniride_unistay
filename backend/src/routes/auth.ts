import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { one, query } from '../db';
import { config, isDev } from '../config';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http';
import { normalizePhone } from '../lib/phone';
import { requireAuth, signToken } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { camelize } from '../lib/camel';
import { fileUrlSchema } from '../lib/validation';

const router = Router();

const roleSchema = z.enum(['STUDENT', 'DRIVER', 'OWNER']);

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9),
  email: z.string().trim().email().optional().or(z.literal('')),
  password: z.string().min(8).max(72),
  role: roleSchema,
  universityId: z.string().uuid('Select your university'),
});

const verifySchema = z.object({
  phone: z.string().trim().min(9),
  code: z.string().trim().length(6),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  universityId: z.string().uuid().optional(),
  avatarUrl: fileUrlSchema.optional().or(z.literal('')),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

type UserRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  password_hash: string | null;
  role: string;
  status: string;
  phone_verified: boolean;
  university_id: string | null;
  avatar_url: string | null;
  created_at: Date;
};

async function userPayload(userId: string) {
  const user = await one(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.phone_verified,
            u.university_id, u.avatar_url, u.created_at,
            univ.short_name AS university_short_name, univ.name AS university_name,
            sp.student_id_number, sp.verified_at AS student_verified_at,
            dp.verification_status AS driver_verification_status,
            dp.status AS driver_status, dp.rating_avg, dp.completed_rides,
            dp.license_number, dp.national_id
     FROM users u
     LEFT JOIN universities univ ON univ.id = u.university_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN driver_profiles dp ON dp.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return camelize(user);
}

async function issueOtp(phone: string, purpose: 'REGISTER' | 'LOGIN') {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  await query(
    `INSERT INTO phone_otps (phone, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, now() + interval '10 minutes')`,
    [phone, codeHash, purpose],
  );
  console.log(`[otp] ${purpose} code for ${phone}: ${code}`);
  return code;
}

router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'register' }),
  asyncHandler(async (req, res) => {
    const input = parseBody(registerSchema, req.body);
    const phone = normalizePhone(input.phone);
    const email = input.email ? input.email.toLowerCase() : null;

    const university = await one(`SELECT id FROM universities WHERE id = $1 AND status = 'ACTIVE'`, [
      input.universityId,
    ]);
    if (!university) throw new ApiError(400, 'Select a valid university', 'INVALID_UNIVERSITY');

    const existing = await one<UserRow>(`SELECT * FROM users WHERE phone = $1`, [phone]);
    if (existing) {
      throw new ApiError(409, 'An account with this phone number already exists', 'PHONE_TAKEN');
    }
    if (email) {
      const emailTaken = await one(`SELECT id FROM users WHERE email = $1`, [email]);
      if (emailTaken) {
        throw new ApiError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await one<UserRow>(
      `INSERT INTO users (full_name, email, phone, password_hash, role, university_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
       RETURNING *`,
      [input.fullName, email, phone, passwordHash, input.role, input.universityId],
    );
    if (!created) throw new ApiError(500, 'Could not create account', 'CREATE_FAILED');

    if (input.role === 'STUDENT') {
      await query(`INSERT INTO student_profiles (user_id, university_id) VALUES ($1, $2)`, [
        created.id,
        input.universityId,
      ]);
    }
    if (input.role === 'DRIVER') {
      await query(
        `INSERT INTO driver_profiles (user_id, university_id, status, verification_status)
         VALUES ($1, $2, 'OFFLINE', 'PENDING')`,
        [created.id, input.universityId],
      );
    }

    const code = await issueOtp(phone, 'REGISTER');
    ok(
      res,
      {
        requiresVerification: true,
        phone,
        // No SMS gateway is wired in local/dev mode; the code is surfaced for testing.
        devOtp: isDev ? code : undefined,
      },
      201,
    );
  }),
);

router.post(
  '/request-otp',
  rateLimit({ windowMs: 10 * 60_000, max: 6, keyPrefix: 'otp' }),
  asyncHandler(async (req, res) => {
    const input = parseBody(z.object({ phone: z.string().trim().min(9) }), req.body);
    const phone = normalizePhone(input.phone);
    const user = await one<UserRow>(`SELECT * FROM users WHERE phone = $1`, [phone]);
    if (!user) throw new ApiError(404, 'No account uses this phone number', 'NOT_FOUND');
    if (user.status === 'SUSPENDED') {
      throw new ApiError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
    }
    const code = await issueOtp(phone, user.phone_verified ? 'LOGIN' : 'REGISTER');
    ok(res, { sent: true, phone, devOtp: isDev ? code : undefined });
  }),
);

router.post(
  '/verify-otp',
  rateLimit({ windowMs: 10 * 60_000, max: 15, keyPrefix: 'verify' }),
  asyncHandler(async (req, res) => {
    const input = parseBody(verifySchema, req.body);
    const phone = normalizePhone(input.phone);

    const otp = await one<{ id: string; code_hash: string; attempts: number }>(
      `SELECT id, code_hash, attempts FROM phone_otps
       WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [phone],
    );
    if (!otp) {
      throw new ApiError(400, 'This code has expired. Request a new one.', 'OTP_EXPIRED');
    }
    if (otp.attempts >= 5) {
      throw new ApiError(429, 'Too many incorrect attempts. Request a new code.', 'OTP_LOCKED');
    }
    const valid = await bcrypt.compare(input.code, otp.code_hash);
    if (!valid) {
      await query(`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);
      throw new ApiError(400, 'Incorrect verification code', 'OTP_INVALID');
    }

    await query(`UPDATE phone_otps SET consumed_at = now() WHERE id = $1`, [otp.id]);
    const user = await one<UserRow>(
      `UPDATE users SET phone_verified = true, updated_at = now()
       WHERE phone = $1 RETURNING *`,
      [phone],
    );
    if (!user) throw new ApiError(404, 'Account not found', 'NOT_FOUND');
    if (user.status === 'SUSPENDED') {
      throw new ApiError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
    }

    const token = signToken(user.id, user.role);
    ok(res, { token, user: await userPayload(user.id) });
  }),
);

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60_000, max: 25, keyPrefix: 'login' }),
  asyncHandler(async (req, res) => {
    const input = parseBody(loginSchema, req.body);
    let identifier = input.identifier.trim();
    let row: UserRow | null = null;

    if (identifier.includes('@')) {
      row = await one<UserRow>(`SELECT * FROM users WHERE email = $1`, [identifier.toLowerCase()]);
    } else {
      try {
        identifier = normalizePhone(identifier);
        row = await one<UserRow>(`SELECT * FROM users WHERE phone = $1`, [identifier]);
      } catch {
        row = null;
      }
    }

    if (!row || !row.password_hash) {
      throw new ApiError(401, 'Invalid phone/email or password', 'INVALID_CREDENTIALS');
    }
    const valid = await bcrypt.compare(input.password, row.password_hash);
    if (!valid) {
      throw new ApiError(401, 'Invalid phone/email or password', 'INVALID_CREDENTIALS');
    }
    if (row.status === 'SUSPENDED') {
      throw new ApiError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
    }
    if (!row.phone_verified) {
      await issueOtp(row.phone, 'REGISTER');
      throw new ApiError(
        403,
        'Verify your phone number to continue. A new code has been sent.',
        'PHONE_NOT_VERIFIED',
      );
    }

    const token = signToken(row.id, row.role);
    ok(res, { token, user: await userPayload(row.id) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await userPayload(req.user!.id));
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(updateProfileSchema, req.body);
    if (input.universityId) {
      const university = await one(
        `SELECT id FROM universities WHERE id = $1 AND status = 'ACTIVE'`,
        [input.universityId],
      );
      if (!university) throw new ApiError(400, 'Select a valid university', 'INVALID_UNIVERSITY');
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (input.fullName !== undefined) set('full_name', input.fullName);
    if (input.email !== undefined) set('email', input.email ? input.email.toLowerCase() : null);
    if (input.avatarUrl !== undefined) set('avatar_url', input.avatarUrl || null);
    if (input.universityId !== undefined) set('university_id', input.universityId);

    if (sets.length > 0) {
      values.push(req.user!.id);
      await query(
        `UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
        values,
      );
    }

    if (input.universityId && req.user!.role === 'STUDENT') {
      await query(
        `UPDATE student_profiles SET university_id = $1 WHERE user_id = $2`,
        [input.universityId, req.user!.id],
      );
    }
    if (input.universityId && req.user!.role === 'DRIVER') {
      await query(`UPDATE driver_profiles SET university_id = $1 WHERE user_id = $2`, [
        input.universityId,
        req.user!.id,
      ]);
    }

    ok(res, await userPayload(req.user!.id));
  }),
);

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(changePasswordSchema, req.body);
    const row = await one<{ password_hash: string | null }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.user!.id],
    );
    if (!row?.password_hash) throw new ApiError(400, 'No password is set for this account');
    const valid = await bcrypt.compare(input.currentPassword, row.password_hash);
    if (!valid) throw new ApiError(400, 'Current password is incorrect', 'INVALID_PASSWORD');
    const hash = await bcrypt.hash(input.newPassword, 10);
    await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      hash,
      req.user!.id,
    ]);
    ok(res, { updated: true });
  }),
);

export default router;
