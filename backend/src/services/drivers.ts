import { config } from '../config';
import { query } from '../db';

/** Drivers who stop sending heartbeats are taken off the discovery list. */
export async function expireStaleDrivers() {
  await query(
    `UPDATE driver_profiles
     SET status = 'OFFLINE', updated_at = now()
     WHERE status = 'IDLE'
       AND (last_heartbeat_at IS NULL OR last_heartbeat_at < now() - ($1 || ' minutes')::interval)`,
    [String(config.driverHeartbeatTimeoutMinutes)],
  );
}
