import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import { ApiError, errorHandler } from './lib/http';
import { config } from './config';
import authRoutes from './routes/auth';
import universityRoutes from './routes/universities';
import publicRoutes from './routes/public';
import rideRoutes from './routes/rides';
import driverRoutes from './routes/driver';
import ownerRoutes from './routes/owner';
import studentRoutes from './routes/student';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import complaintRoutes from './routes/complaints';
import webhookRoutes from './routes/webhooks';
import uploadRoutes from './routes/uploads';
import configRoutes from './routes/config';

export function createApp() {
  const app = express();

  if (!fs.existsSync(config.uploadsDir)) {
    fs.mkdirSync(config.uploadsDir, { recursive: true });
  }

  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(
    cors({
      // Dev browsers (Expo web, LAN) use varied origins; production stays restricted to the list.
      origin:
        config.corsOrigin === '*' || config.env !== 'production'
          ? true
          : config.corsOrigin.split(',').map((o) => o.trim()),
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok', service: 'uniride-unistay-api', time: new Date().toISOString() } });
  });

  app.use('/api/config', configRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/universities', universityRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/rides', rideRoutes);
  app.use('/api/driver', driverRoutes);
  app.use('/api/owner', ownerRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/uploads', uploadRoutes);

  app.use((_req, _res, next) => {
    next(new ApiError(404, 'Endpoint not found', 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
