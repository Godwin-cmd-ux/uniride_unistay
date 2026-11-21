'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import {
  dateTime,
  distanceLabel,
  rideStatusLabels,
  tzs,
} from '@/lib/format';
import type { Ride } from '@/lib/types';

const statuses = ['', 'REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP', 'COMPLETED', 'CANCELLED'];

export default function AdminRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    api<Ride[]>('/api/admin/rides')
      .then((data) => {
        if (active) setRides(data);
      })
      .catch(() => {
        if (active) setRides([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = status ? rides.filter((ride) => ride.status === status) : rides;

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Operations"
        title="Ride log"
        subtitle="Every request across all campuses with fares, commission and status. Tap a status to filter."
      />

      <div className="filter-bar">
        <label className="field" style={{ minWidth: 220 }}>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? rideStatusLabels[value as keyof typeof rideStatusLabels] ?? value : 'All statuses'}
              </option>
            ))}
          </select>
        </label>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <span>Showing</span>
          <strong>
            {visible.length} of {rides.length} rides
          </strong>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Loading label="Loading rides" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="bike"
            title="No rides in this view"
            description="Ride requests appear here the moment a student books a trip."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Student</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Fare</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((ride) => (
                  <tr key={ride.id}>
                    <td className="small muted">{dateTime(ride.requestedAt)}</td>
                    <td>
                      <div className="row-title">
                        <div>
                          <strong>{ride.studentName}</strong>
                          <span>{ride.studentPhone}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {ride.driverName ? (
                        <div className="row-title">
                          <div>
                            <strong>{ride.driverName}</strong>
                            <span>{ride.vehiclePlate ?? 'No plate on file'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="muted small">Unassigned</span>
                      )}
                    </td>
                    <td className="small">
                      {ride.pickupLabel} → {ride.destLabel}
                      <div className="muted">{distanceLabel(ride.distanceM)}</div>
                    </td>
                    <td>
                      <strong>{tzs(ride.finalFare ?? ride.estimatedFare)}</strong>
                      <div className="small muted">
                        {ride.commissionAmount
                          ? `${tzs(ride.commissionAmount)} commission`
                          : `${Math.round(ride.commissionRate * 100)}% commission on completion`}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={ride.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
