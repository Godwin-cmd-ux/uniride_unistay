'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import {
  distanceLabel,
  driverStatusLabels,
  rideStatusLabels,
  timeAgo,
  tzs,
  verificationLabels,
} from '@/lib/format';
import type { DocumentItem, DriverProfile, DriverRequest, Ride } from '@/lib/types';

type Stats = {
  todayEarnings: number;
  weekEarnings: number;
  totalRideEarnings: number;
  completedRides: number;
  todayRides: number;
};

type StatsPayload = {
  stats: Stats;
  profile: DriverProfile;
  documents: DocumentItem[];
};

const liveStatuses = ['ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP'];

export default function DriverHomePage() {
  const { push } = useToast();
  const [payload, setPayload] = useState<StatsPayload | null>(null);
  const [active, setActive] = useState<Ride | null>(null);
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [statsPayload, activeRide, requestPayload] = await Promise.all([
        api<StatsPayload>('/api/driver/stats'),
        api<Ride | null>('/api/driver/active').catch(() => null),
        api<{ requests: DriverRequest[]; notice: string | null }>('/api/driver/requests').catch(
          () => ({ requests: [], notice: null }),
        ),
      ]);
      setPayload(statsPayload);
      setActive(activeRide);
      setRequests(requestPayload.requests);
      setNotice(requestPayload.notice);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load driver workspace', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (payload?.profile.status !== 'IDLE') return;
    const timer = setInterval(() => {
      void api('/api/driver/heartbeat', { method: 'POST', body: {} }).catch(() => undefined);
    }, 60000);
    return () => clearInterval(timer);
  }, [payload?.profile.status]);

  async function toggleOnline() {
    if (!payload) return;
    const goingOnline = payload.profile.status === 'OFFLINE' || payload.profile.status === 'IDLE';
    setToggling(true);
    try {
      let coords: { lat: number; lng: number } | null = null;
      if (goingOnline && navigator.geolocation) {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            () => resolve(null),
            { timeout: 5000 },
          );
        });
      }
      await api<DriverProfile>('/api/driver/status', {
        method: 'PATCH',
        body: { status: goingOnline ? 'IDLE' : 'OFFLINE' },
      });
      if (coords) {
        await api('/api/driver/heartbeat', { method: 'POST', body: coords });
      }
      push(goingOnline ? 'You are online and visible to nearby students.' : 'You are offline.', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not change status', 'error');
    } finally {
      setToggling(false);
    }
  }

  async function accept(request: DriverRequest) {
    setActing(request.id);
    try {
      await api(`/api/driver/rides/${request.id}/accept`, { method: 'POST' });
      push('Ride accepted. Head to the pickup point.', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not accept ride', 'error');
    } finally {
      setActing(null);
    }
  }

  async function advance(action: 'depart' | 'start' | 'complete') {
    if (!active) return;
    if (action === 'complete') {
      const okToComplete = window.confirm(
        'Complete this trip? The fare will be recorded and the student will be notified.',
      );
      if (!okToComplete) return;
    }
    setActing(active.id);
    try {
      await api(`/api/driver/rides/${active.id}/${action}`, { method: 'POST' });
      push(
        action === 'depart'
          ? 'Marked as en route to the pickup.'
          : action === 'start'
            ? 'Trip started.'
            : 'Trip completed. Earnings added to your account.',
        'success',
      );
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update ride', 'error');
    } finally {
      setActing(null);
    }
  }

  const profile = payload?.profile;
  const verified = profile?.verificationStatus === 'VERIFIED';
  const online = profile ? ['IDLE', 'ON_ROAD', 'REQUESTED'].includes(profile.status) : false;

  return (
    <AppShell role="DRIVER">
      <PageHeader
        eyebrow={profile?.universityShortName ?? 'Driver workspace'}
        title="Your road, your earnings"
        subtitle="Go online, accept rides from verified students and track every trip."
        actions={
          <Link href="/driver/requests" className="btn btn-primary btn-sm">
            <Icon name="bike" size={15} /> Ride requests
            {requests.length > 0 && <span className="side-badge">{requests.length}</span>}
          </Link>
        }
      />

      {loading ? (
        <Loading label="Loading driver workspace" />
      ) : (
        <>
          {profile && profile.verificationStatus !== 'VERIFIED' && (
            <div className={`notice notice-${profile.verificationStatus === 'REJECTED' ? 'error' : 'warn'}`}>
              <Icon name={profile.verificationStatus === 'REJECTED' ? 'alert' : 'clock'} size={18} />
              <div>
                <strong>{verificationLabels[profile.verificationStatus]} account</strong>
                <p>
                  {profile.verificationStatus === 'REJECTED'
                    ? profile.rejectionReason ??
                      'Your documents were not approved. Update them and resubmit for review.'
                    : 'An administrator is reviewing your licence, ID and vehicle. You can go online once approved.'}
                </p>
              </div>
              <Link href="/driver/vehicle" className="btn btn-outline btn-sm">
                Manage documents
              </Link>
            </div>
          )}

          <div className="driver-banner">
            <div>
              <div className="eyebrow" style={{ color: 'rgba(243,239,228,.6)' }}>
                Availability
              </div>
              <h2>
                {profile ? driverStatusLabels[profile.status] ?? profile.status : 'Offline'}
              </h2>
              <p>
                {online
                  ? 'Students in your campus zone can see your availability and send requests.'
                  : verified
                    ? 'Go online to start receiving ride requests from your campus.'
                    : 'Verification must be approved before you can go online.'}
              </p>
            </div>
            <button
              type="button"
              className={`online-toggle ${online ? 'on' : ''}`}
              onClick={() => void toggleOnline()}
              disabled={toggling || !verified || profile?.status === 'ON_ROAD'}
            >
              <span className="knob" />
              {toggling ? 'Updating…' : online ? 'Online' : 'Go online'}
            </button>
          </div>

          <div className="stats-grid">
            <StatCard
              label="Today's earnings"
              value={tzs(payload?.stats.todayEarnings ?? 0)}
              hint={`${payload?.stats.todayRides ?? 0} trips today`}
              icon="wallet"
              tone="green"
            />
            <StatCard
              label="This week"
              value={tzs(payload?.stats.weekEarnings ?? 0)}
              hint="After platform commission"
              icon="calendar"
            />
            <StatCard
              label="Completed trips"
              value={payload?.stats.completedRides ?? 0}
              hint="Lifetime on UNIRIDE"
              icon="route"
            />
            <StatCard
              label="Rating"
              value={profile?.ratingAvg ? profile.ratingAvg.toFixed(1) : '—'}
              hint={`${profile?.ratingCount ?? 0} student ratings`}
              icon="star"
              tone="amber"
            />
          </div>

          {active && liveStatuses.includes(active.status) && (
            <div className="card card-pad-lg mb-24">
              <div className="card-head">
                <div>
                  <h2>Active trip</h2>
                  <p>
                    {rideStatusLabels[active.status]} · student {active.studentName}
                  </p>
                </div>
                <StatusBadge status={active.status} label={rideStatusLabels[active.status]} />
              </div>
              <div className="grid-2">
                <div>
                  <div className="request-route">
                    <div className="route-rail">
                      <span className="route-dot" />
                      <span className="route-line" />
                      <span className="route-dot end" />
                    </div>
                    <div className="route-points">
                      <div>
                        <strong>{active.pickupLabel}</strong>
                        <span>Pickup</span>
                      </div>
                      <div>
                        <strong>{active.destLabel}</strong>
                        <span>{distanceLabel(active.distanceM)}</span>
                      </div>
                    </div>
                  </div>
                  {active.studentPhone && (
                    <a href={`tel:${active.studentPhone}`} className="btn btn-outline btn-sm mt-16">
                      <Icon name="phone" size={13} /> Call student · {active.studentPhone}
                    </a>
                  )}
                </div>
                <div>
                  <div className="fare-split">
                    <div>
                      <span>Fare</span>
                      <b>{tzs(active.estimatedFare)}</b>
                    </div>
                    <div>
                      <span>Your earnings</span>
                      <b>
                        {tzs(
                          active.estimatedFare -
                            Math.round(active.estimatedFare * Number(active.commissionRate)),
                        )}
                      </b>
                    </div>
                    <div>
                      <span>Requested</span>
                      <b>{timeAgo(active.requestedAt)}</b>
                    </div>
                  </div>
                  <div className="inline mt-16">
                    {active.status === 'ACCEPTED' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={acting === active.id}
                        onClick={() => void advance('depart')}
                      >
                        Head to pickup
                      </button>
                    )}
                    {active.status === 'DRIVER_EN_ROUTE' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={acting === active.id}
                        onClick={() => void advance('start')}
                      >
                        Start trip
                      </button>
                    )}
                    {active.status === 'ON_TRIP' && (
                      <button
                        type="button"
                        className="btn btn-lime btn-sm"
                        style={{ color: 'var(--green)' }}
                        disabled={acting === active.id}
                        onClick={() => void advance('complete')}
                      >
                        Complete trip
                      </button>
                    )}
                    <Link href="/driver/trips" className="btn btn-ghost btn-sm">
                      Trip history
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <div>
                <h2>Open requests</h2>
                <p>{notice ?? 'Requests from students in your operating zone.'}</p>
              </div>
              <Link href="/driver/requests" className="card-link">
                View all <Icon name="arrow-right" size={13} />
              </Link>
            </div>
            {requests.length === 0 ? (
              <EmptyState
                icon="bike"
                title={verified ? 'No open requests' : 'Requests unlock after verification'}
                description={
                  notice ??
                  'When a student nearby requests a ride, it will appear here instantly.'
                }
              />
            ) : (
              <div className="stack">
                {requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-route">
                      <div className="route-rail">
                        <span className="route-dot" />
                        <span className="route-line" />
                        <span className="route-dot end" />
                      </div>
                      <div className="route-points">
                        <div>
                          <strong>{request.pickupLabel}</strong>
                          <span>
                            {request.studentFirstName} · {timeAgo(request.requestedAt)}
                            {request.driverDistanceToPickupM !== null
                              ? ` · ${(request.driverDistanceToPickupM / 1000).toFixed(1)} km away`
                              : ''}
                          </span>
                        </div>
                        <div>
                          <strong>{request.destLabel}</strong>
                          <span>{distanceLabel(request.distanceM)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="request-side">
                      <strong>{tzs(request.estimatedFare)}</strong>
                      <span>Student pays cash</span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={acting === request.id}
                        onClick={() => void accept(request)}
                      >
                        {acting === request.id ? 'Accepting…' : 'Accept ride'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
