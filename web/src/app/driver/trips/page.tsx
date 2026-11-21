'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { distanceLabel, rideStatusLabels, timeAgo, tzs } from '@/lib/format';
import type { Ride } from '@/lib/types';

type Tab = 'ALL' | 'COMPLETED' | 'CANCELLED';

export default function DriverTripsPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ALL');

  useEffect(() => {
    let active = true;
    api<Ride[]>('/api/driver/rides')
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

  const visible = useMemo(() => {
    if (tab === 'ALL') return rides;
    return rides.filter((ride) => ride.status === tab);
  }, [rides, tab]);

  const completed = rides.filter((ride) => ride.status === 'COMPLETED');
  const earnings = completed.reduce((sum, ride) => sum + Number(ride.driverEarnings ?? 0), 0);
  const commission = completed.reduce((sum, ride) => sum + Number(ride.commissionAmount ?? 0), 0);
  const fares = completed.reduce((sum, ride) => sum + Number(ride.finalFare ?? ride.estimatedFare), 0);

  return (
    <AppShell role="DRIVER">
      <PageHeader
        eyebrow="Receipts"
        title="Trip history"
        subtitle="Every completed trip with the fare, platform commission and your earnings."
      />

      <div className="stats-grid">
        <StatCard label="Trips completed" value={completed.length} icon="route" tone="green" />
        <StatCard label="Fares collected" value={tzs(fares)} hint="Cash from students" icon="wallet" />
        <StatCard label="Your earnings" value={tzs(earnings)} hint="After commission" icon="star" tone="amber" />
        <StatCard label="Platform commission" value={tzs(commission)} hint="Retained by UNIRIDE" icon="shield" />
      </div>

      <div className="inline mb-16">
        <div className="seg-tabs" style={{ maxWidth: 360 }}>
          {(['ALL', 'COMPLETED', 'CANCELLED'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {key === 'ALL' ? 'All trips' : key[0] + key.slice(1).toLowerCase()} (
              {key === 'ALL' ? rides.length : rides.filter((ride) => ride.status === key).length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading trips" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="route"
            title="No trips in this view"
            description="Completed rides will show here with the commission breakdown for your records."
          />
        </div>
      ) : (
        <div className="stack">
          {visible.map((ride) => (
            <div key={ride.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="request-card" style={{ border: 0, boxShadow: 'none' }}>
                <div className="request-route">
                  <div className="route-rail">
                    <span className="route-dot" />
                    <span className="route-line" />
                    <span className="route-dot end" />
                  </div>
                  <div className="route-points">
                    <div>
                      <strong>{ride.pickupLabel}</strong>
                      <span>{ride.studentName}</span>
                    </div>
                    <div>
                      <strong>{ride.destLabel}</strong>
                      <span>
                        {distanceLabel(ride.distanceM)} · {timeAgo(ride.requestedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="request-side">
                  <strong>{tzs(ride.finalFare ?? ride.estimatedFare)}</strong>
                  <StatusBadge status={ride.status} label={rideStatusLabels[ride.status]} />
                  {ride.status === 'COMPLETED' && (
                    <span className="small muted">You earned {tzs(ride.driverEarnings ?? 0)}</span>
                  )}
                </div>
              </div>
              {ride.status === 'COMPLETED' && (
                <div className="ride-driver">
                  <Icon name="wallet" size={15} />
                  <div>
                    <strong>
                      Fare {tzs(ride.finalFare ?? ride.estimatedFare)} · Commission{' '}
                      {tzs(ride.commissionAmount ?? 0)}
                    </strong>
                    <span>
                      Completed {ride.completedAt ? timeAgo(ride.completedAt) : 'recently'} ·{' '}
                      {ride.universityShortName}
                    </span>
                  </div>
                  <span className="badge badge-success">Earned {tzs(ride.driverEarnings ?? 0)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
