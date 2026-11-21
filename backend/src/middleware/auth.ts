import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { one } from '../db';
import { ApiError } from '../lib/http';

export type SessionUser = {
  id: string;
  role: 'STUDENT' | 'DRIVER' | 'OWNER' | 'ADMIN';
  fullName: string;
  phone: string;
  email: string | null;
  universityId: string | null;
  status: string;
  phoneVerified: boolean;
  avatarUrl: string | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

type UserRow = {
  id: string;
  role: SessionUser['role'];
  full_name: string;
  phone: string;
  email: string | null;
  university_id: string | null;
  status: string;
  phone_verified: boolean;
  avatar_url: string | null;
};

export function signToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

async function loadSession(token: string): Promise<SessionUser> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'UNAUTHORIZED');
  }
  const row = await one<UserRow>(
    `SELECT id, role, full_name, phone, email, university_id, status, phone_verified, avatar_url
     FROM users WHERE id = $1`,
    [payload.sub],
  );
  if (!row) throw new ApiError(401, 'Account not found', 'UNAUTHORIZED');
  if (row.status === 'SUSPENDED') {
    throw new ApiError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
  }
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    universityId: row.university_id,
    status: row.status,
    phoneVerified: row.phone_verified,
    avatarUrl: row.avatar_url,
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Sign in to continue', 'UNAUTHORIZED');
    }
    req.user = await loadSession(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: SessionUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, 'Sign in to continue', 'UNAUTHORIZED'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'You do not have access to this resource', 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    next();
    return;
  }
  try {
    req.user = await loadSession(token);
  } catch {
    // Public endpoints must keep working with an invalid/stale token.
  }
  next();
}
