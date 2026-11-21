import { Router } from 'express';
import { ok } from '../lib/http';
import { fareConfigSummary } from '../lib/fare';

const router = Router();

router.get('/', (_req, res) => {
  ok(res, {
    appName: 'UNIRIDE UNISTAY',
    tagline: 'Connecting students to rides and stays',
    currency: 'TZS',
    fare: fareConfigSummary(),
    rideStatuses: ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP', 'COMPLETED', 'CANCELLED'],
    driverStatuses: ['IDLE', 'ON_ROAD', 'OFFLINE', 'REQUESTED'],
    propertyTypes: ['HOSTEL', 'HOUSE', 'APARTMENT', 'ROOM'],
    roles: ['STUDENT', 'DRIVER', 'OWNER', 'ADMIN'],
    supportPhone: '+255 700 000 000',
    supportEmail: 'hello@unirideunistay.co.tz',
  });
});

export default router;
