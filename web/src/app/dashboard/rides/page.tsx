'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { StarPicker } from '@/components/Stars';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { distanceLabel, rideStatusLabels, timeAgo, tzs } from '@/lib/format';
import type { Ride } from '@/lib/types';

type Tab = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
const liveStatuses = ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP'];

export default function StudentRidesPage() {
  const { push } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rated, setRated] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setRides(await api<Ride[]>('/api/rides/mine'));
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!rides.some((ride) => liveStatuses.includes(ride.status))) return;
    const timer = setInterval(() => {
      void load();
    }, 9000);
    return () => clearInterval(timer);
  }, [rides, load]);

  const visible = useMemo(() => {
    if (tab === 'ALL') return rides;
    if (tab === 'ACTIVE') return rides.filter((ride) => liveStatuses.includes(ride.status));
    return rides.filter((ride) => ride.status === tab);
  }, [rides, tab]);

  async function cancel(ride: Ride) {
    if (!window.confirm('Cancel this ride? Drivers already notified will be told it was cancelled.')) {
      return;
    }
    setBusyId(ride.id);
    try {
      await api(`/api/rides/${ride.id}/cancel`, {
        method: 'POST',
        body: { reason: 'Cancelled by student from web dashboard' },
      });
      push('Ride cancelled', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not cancel ride', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function submitRating(ride: Ride) {
    setBusyId(ride.id);
    try {
      await api(`/api/rides/${ride.id}/rate`, {
        method: 'POST',
        body: { rating, comment },
      });
      setRated((current) => ({ ...current, [ride.id]: true }));
      setRatingId(null);
      setComment('');
      setRating(5);
      push('Thanks for rating your driver', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not submit rating', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    ALL: rides.length,
    ACTIVE: rides.filter((ride) => liveStatuses.includes(ride.status)).length,
    COMPLETED: rides.filter((ride) => ride.status === 'COMPLETED').length,
    CANCELLED: rides.filter((ride) => ride.status === 'CANCELLED').length,
  };

  return (
    <AppShell role="STUDENT">
      <PageHeader
        eyebrow="UNIRIDE"
        title="My rides"
        subtitle="Live trip status, driver details and receipts for every campus ride."
        actions={
          <Link href="/rides" className="btn btn-primary btn-sm">
            <Icon name="bike" size={15} /> Request a ride
          </Link>
        }
      />

      <div className="inline mb-16">
        <div className="seg-tabs" style={{ maxWidth: 480 }}>
          {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {key === 'ALL' ? 'All' : key[0] + key.slice(1).toLowerCase()} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading rides" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="bike"
            title="No rides in this view"
            description="Request a verified campus ride with a fare agreed before you set off."
            action={{ href: '/rides', label: 'Request a ride' }}
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
                      <span>Pickup</span>
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
                  <div className="inline">
                    {liveStatuses.includes(ride.status) && (
                      <button
                        type="button"
                        className="btn btn-danger-soft btn-sm"
                        disabled={busyId === ride.id}
                        onClick={() => void cancel(ride)}
                      >
                        Cancel
                      </button>
                    )}
                    {ride.status === 'COMPLETED' && !rated[ride.id] && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setRatingId(ratingId === ride.id ? null : ride.id);
                          setRating(5);
                          setComment('');
                        }}
                      >
                        <Icon name="star" size={13} /> Rate driver
                      </button>
                    )}
                    {rated[ride.id] && (
                      <span className="badge badge-success">
                        <Icon name="check" size={12} /> Rated
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(ride.driverName || ride.driverPhone || ride.vehiclePlate) && (
                <div className="ride-driver">
                  <span className="avatar">{ride.driverName?.charAt(0) ?? 'D'}</span>
                  <div>
                    <strong>{ride.driverName}
                      {ride.driverRating != null && (
                        <span className="ride-driver-rating"> ★ {ride.driverRating.toFixed(1)}</span>
                      )}
                    </strong>
                    <span>
                      {[ride.vehicleMake, ride.vehicleModel, ride.vehiclePlate]
                        .filter(Boolean)
                        .join(' · ') || 'Vehicle details'}
                    </span>
                  </div>
                  {ride.driverPhone && (
                    <a href={`tel:${ride.driverPhone}`} className="btn btn-outline btn-sm">
                      <Icon name="phone" size={13} /> {ride.driverPhone}
                    </a>
                  )}
                </div>
              )}

              {ratingId === ride.id && (
                <div className="rate-panel">
                  <div>
                    <strong>How was your trip?</strong>
                    <span>Ratings help students pick safe, reliable drivers.</span>
                  </div>
                  <StarPicker value={rating} onChange={setRating} />
                  <input
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Optional comment"
                    maxLength={500}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busyId === ride.id}
                    onClick={() => void submitRating(ride)}
                  >
                    {busyId === ride.id ? 'Sending…' : 'Submit rating'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
