import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: num(process.env.PORT, 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/uniride_unistay',
  jwtSecret: process.env.JWT_SECRET ?? 'uniride-unistay-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  webhookSecret: process.env.WEBHOOK_SECRET ?? '',
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:4000',
  uploadsDir: path.resolve(process.cwd(), 'uploads'),
  fare: {
    base: num(process.env.FARE_BASE, 1000),
    perKm: num(process.env.FARE_PER_KM, 700),
    min: num(process.env.FARE_MIN, 1500),
    roundTo: num(process.env.FARE_ROUND_TO, 100),
  },
  commissionRate: num(process.env.COMMISSION_RATE, 0.12),
  accommodationSuccessFeeRate: num(process.env.ACCOMMODATION_SUCCESS_FEE_RATE, 0.07),
  driverHeartbeatTimeoutMinutes: num(process.env.DRIVER_HEARTBEAT_TIMEOUT_MINUTES, 5),
};

export const isDev = config.env !== 'production';
