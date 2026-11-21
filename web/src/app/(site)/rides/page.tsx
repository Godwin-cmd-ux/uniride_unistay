'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StudentFrame } from '@/components/StudentFrame';
import { Icon } from '@/components/Icon';
import { StatusBadge, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useUniversity } from '@/context/university';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { distanceLabel, rideStatusLabels, timeAgo, tzs } from '@/lib/format';
import type { FareConfig, Ride, Summary } from '@/lib/types';

type Point = { key: string; label: string; lat: number | null; lng: number | null };

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

const activeStatuses = ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP'];

export default function RidesPage() {
  const { user } = useAuth();
  const { selected } = useUniversity();
  const { push } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [pickupKey, setPickupKey] = useState('gate');
  const [destKey, setDestKey] = useState('town');
  const [currentLocation, setCurrentLocation] = useState<Point | null>(null);
  const [customDest, setCustomDest] = useState('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [active, setActive] = useState<Ride | null>(null);
  const [loadingRides, setLoadingRides] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const query = selected ? `?universityId=${selected.id}` : '';
    api<Summary>(`/api/public/summary${query}`, { auth: false })
      .then(setSummary)
      .catch(() => undefined);
  }, [selected]);

  const points = useMemo<Point[]>(() => {
    if (!selected) return [];
    const lat = Number(selected.latitude);
    const lng = Number(selected.longitude);
    return [
      { key: 'gate', label: `${selected.shortName} Main Gate`, lat, lng },
      { key: 'town', label: 'Town centre', lat: lat + 0.012, lng: lng + 0.012 },
      { key: 'market', label: 'Market & shops', lat: lat - 0.009, lng: lng + 0.014 },
      { key: 'hostel', label: 'Student hostel cluster', lat: lat + 0.006, lng: lng - 0.013 },
    ];
  }, [selected]);

  useEffect(() => {
    if (points.length === 0) return;
    if (!points.some((point) => point.key === pickupKey) && pickupKey !== 'current') {
      setPickupKey(points[0].key);
    }
    if (!points.some((point) => point.key === destKey)) setDestKey(points[1].key);
  }, [points, pickupKey, destKey]);

  const pickup: Point =
    pickupKey === 'current' && currentLocation
      ? currentLocation
      : (points.find((point) => point.key === pickupKey) ?? {
          key: 'gate',
          label: selected ? `${selected.shortName} Main Gate` : 'Campus gate',
          lat: selected ? Number(selected.latitude) : null,
          lng: selected ? Number(selected.longitude) : null,
        });
  const dest: Point =
    destKey === 'custom'
      ? { key: 'custom', label: customDest || 'Custom destination', lat: null, lng: null }
      : (points.find((point) => point.key === destKey) ?? pickup);

  const distanceM =
    pickup.lat !== null && pickup.lng !== null && dest.lat !== null && dest.lng !== null
      ? Math.round(haversine(pickup.lat, pickup.lng, dest.lat, dest.lng))
      : 3000;
  const fareConfig: FareConfig | undefined = summary?.fare;
  const base = fareConfig?.baseFare ?? 1000;
  const perKm = fareConfig?.perKm ?? 700;
  const minimum = fareConfig?.minimumFare ?? 1500;
  const commissionRate = fareConfig?.commissionRate ?? 0.12;
  const fare = Math.max(minimum, Math.round((base + perKm * (distanceM / 1000)) / 100) * 100);
  const commission = Math.round(fare * commissionRate);

  const loadRides = useCallback(async () => {
    if (!user || user.role !== 'STUDENT') return;
    setLoadingRides(true);
    try {
      const list = await api<Ride[]>('/api/rides/mine');
      setRides(list);
      setActive(list.find((ride) => activeStatuses.includes(ride.status)) ?? null);
    } catch {
      // Keep the last known state; the banner stays available.
    } finally {
      setLoadingRides(false);
    }
  }, [user]);

  useEffect(() => {
    void loadRides();
  }, [loadRides]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      void loadRides();
    }, 9000);
    return () => clearInterval(timer);
  }, [active, loadRides]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      push('Location is not available in this browser', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          key: 'current',
          label: 'My current location',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setPickupKey('current');
      },
      () => push('Could not read your location. Pick a campus gate instead.', 'error'),
      { timeout: 8000 },
    );
  }

  async function requestRide(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== 'STUDENT') {
      push('Ride requests are made from a student account.', 'error');
      return;
    }
    if (!selected) {
      push('Select your campus first', 'error');
      return;
    }
    if (destKey === 'custom' && !customDest.trim()) {
      push('Type the destination name', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api<{ ride: Ride; approximate: boolean }>('/api/rides', {
        method: 'POST',
        body: {
          universityId: selected.id,
          pickupLabel: pickup.label,
          ...(pickup.lat !== null && pickup.lng !== null
            ? { pickupLat: pickup.lat, pickupLng: pickup.lng }
            : {}),
          destLabel: dest.label,
          ...(dest.lat !== null && dest.lng !== null
            ? { destLat: dest.lat, destLng: dest.lng }
            : {}),
        },
      });
      setActive(response.ride);
      push('Ride requested. We are alerting drivers near you.', 'success');
      void loadRides();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not request a ride', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRide() {
    if (!active) return;
    try {
      await api(`/api/rides/${active.id}/cancel`, {
        method: 'POST',
        body: { reason: 'Cancelled from web' },
      });
      push('Ride cancelled', 'success');
      await loadRides();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not cancel ride', 'error');
    }
  }

  const stepIndex = active
    ? ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP'].indexOf(active.status)
    : -1;

  return (
    <StudentFrame>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Uniride · campus mobility</div>
          <h1>A boda that knows your campus — with the fare agreed first.</h1>
          <p>
            Requests stay inside your university driver zone. Every driver on UNIRIDE is
            licence-checked and verified before they can accept a trip.
          </p>
          <div className="page-hero-actions">
            <Link href="/stays" className="btn btn-glass">
              <Icon name="bed" size={16} /> Looking for a stay instead?
            </Link>
            <span className="badge badge-success">
              <Icon name="shield" size={12} /> {summary?.selected?.driversAvailable ?? 0} driver
              {summary?.selected?.driversAvailable === 1 ? '' : 's'} available near{' '}
              {selected?.shortName ?? 'campus'}
            </span>
          </div>
        </div>
      </section>

      <div className="page-wrap">
        <div className="container">
          {active && (
            <div className="card card-pad-lg mb-24">
              <div className="card-head">
                <div>
                  <h2>Active ride</h2>
                  <p>
                    {activeStatuses.includes(active.status)
                      ? rideStatusLabels[active.status]
                      : active.status}{' '}
                    · requested {timeAgo(active.requestedAt)}
                  </p>
                </div>
                <StatusBadge status={active.status} label={rideStatusLabels[active.status]} />
              </div>

              <div className="trip-steps">
                {['Requested', 'Driver accepted', 'En route', 'On trip'].map((label, index) => (
                  <div
                    key={label}
                    className={`trip-step ${
                      index < stepIndex ? 'done' : index === stepIndex ? 'current' : ''
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid-2" style={{ alignItems: 'stretch' }}>
                <div>
                  <div className="route-route">
                    <div className="route-rail">
                      <span className="route-dot" />
                      <span className="route-line" />
                      <span className="route-dot end" />
                    </div>
                    <div className="route-points">
                      <div>
                        <strong>{active.pickupLabel}</strong>
                        <span>Pickup point</span>
                      </div>
                      <div>
                        <strong>{active.destLabel}</strong>
                        <span>{distanceLabel(active.distanceM)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="fare-split">
                    <div>
                      <span>Fare</span>
                      <b>{tzs(active.estimatedFare)}</b>
                    </div>
                    {active.driverName && (
                      <div>
                        <span>Driver</span>
                        <b>
                          {active.driverName}
                          {active.vehiclePlate ? ` · ${active.vehiclePlate}` : ''}
                        </b>
                      </div>
                    )}
                    {active.driverPhone && (
                      <div>
                        <span>Driver phone</span>
                        <b>{active.driverPhone}</b>
                      </div>
                    )}
                    {active.vehicleMake && (
                      <div>
                        <span>Vehicle</span>
                        <b>
                          {active.vehicleMake} {active.vehicleModel ?? ''}
                        </b>
                      </div>
                    )}
                  </div>
                  {active.status !== 'ON_TRIP' && (
                    <button type="button" className="btn btn-danger-soft btn-sm mt-16" onClick={cancelRide}>
                      Cancel ride
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid-2">
            <form className="card card-pad-lg" onSubmit={requestRide}>
              <div className="card-head">
                <div>
                  <h2>Request a campus ride</h2>
                  <p>Fare is fixed before you send the request. Pay the driver in cash.</p>
                </div>
                <span className="badge badge-success">
                  <Icon name="shield" size={12} /> Verified zone
                </span>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Pickup point</span>
                  <select
                    value={pickupKey}
                    onChange={(event) => {
                      if (event.target.value === 'current') useCurrentLocation();
                      else setPickupKey(event.target.value);
                    }}
                  >
                    {points.map((point) => (
                      <option key={point.key} value={point.key}>
                        {point.label}
                      </option>
                    ))}
                    <option value="current">Use my current location</option>
                  </select>
                </label>

                <label className="field">
                  <span>Destination</span>
                  <select value={destKey} onChange={(event) => setDestKey(event.target.value)}>
                    {points.map((point) => (
                      <option key={point.key} value={point.key}>
                        {point.label}
                      </option>
                    ))}
                    <option value="custom">Other destination…</option>
                  </select>
                </label>

                {destKey === 'custom' && (
                  <label className="field">
                    <span>Where are you going?</span>
                    <input
                      value={customDest}
                      onChange={(event) => setCustomDest(event.target.value)}
                      placeholder="e.g. Nzuguni market, near the mosque"
                      required
                    />
                    <small>
                      Custom addresses are estimated at a 3 km campus trip until map search is
                      enabled for your area.
                    </small>
                  </label>
                )}

                <div className="card" style={{ padding: 16, background: 'var(--bg)', boxShadow: 'none' }}>
                  <div className="fare-split">
                    <div>
                      <span>Trip distance</span>
                      <b>{distanceLabel(distanceM)}</b>
                    </div>
                    <div>
                      <span>Estimated fare</span>
                      <b>{tzs(fare)}</b>
                    </div>
                    <div>
                      <span>Platform commission ({Math.round(commissionRate * 100)}%)</span>
                      <b>{tzs(commission)}</b>
                    </div>
                    <div>
                      <span>Driver receives</span>
                      <b>{tzs(fare - commission)}</b>
                    </div>
                  </div>
                </div>

                {!user ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}
                  >
                    Sign in as a student to request
                  </button>
                ) : user.role !== 'STUDENT' ? (
                  <p className="form-note">
                    You are signed in as a {user.role.toLowerCase()}. Ride requests are placed from
                    student accounts.
                  </p>
                ) : (
                  <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                    {submitting ? 'Requesting…' : 'Request this ride'}
                  </button>
                )}
                <p className="form-note">
                  By requesting, you agree to cash payment of the shown fare at the end of the
                  trip. Fares are illustrative and follow the LATRA fare framework.
                </p>
              </div>
            </form>

            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <h2>How a UNIRIDE trip works</h2>
                </div>
                <div className="list">
                  <div className="list-row">
                    <span className="notif-icon">
                      <Icon name="pin" size={16} />
                    </span>
                    <div className="list-row-main">
                      <strong>1. Confirm your points</strong>
                      <span>Pick a gate or use your location, then choose your destination.</span>
                    </div>
                  </div>
                  <div className="list-row">
                    <span className="notif-icon">
                      <Icon name="bike" size={16} />
                    </span>
                    <div className="list-row-main">
                      <strong>2. A verified driver accepts</strong>
                      <span>Only IDLE, verified drivers inside your campus zone see the request.</span>
                    </div>
                  </div>
                  <div className="list-row">
                    <span className="notif-icon">
                      <Icon name="wallet" size={16} />
                    </span>
                    <div className="list-row-main">
                      <strong>3. Ride, then pay cash</strong>
                      <span>
                        The fare is recorded in your account, and the commission is broken out for
                        the driver.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="contact-panel" style={{ padding: 26 }}>
                <h3 style={{ fontSize: 20 }}>Safety first</h3>
                <p style={{ marginTop: 8 }}>
                  Check the plate number before you sit. The driver app shares the vehicle that
                  was verified with us. If something is wrong, cancel before the trip starts and
                  report it from your dashboard.
                </p>
                <Link href="/dashboard/support" className="btn btn-lime btn-sm mt-16" style={{ alignSelf: 'flex-start' }}>
                  Report an issue
                </Link>
              </div>

              {selected && (
                <div className="card">
                  <div className="card-head">
                    <h2>Operating zone</h2>
                  </div>
                  <p className="small muted">
                    Rides currently match within {selected.shortName} — {selected.city},{' '}
                    {selected.region}. Driver radius: {selected.driverRadiusKm} km from campus.
                  </p>
                </div>
              )}
            </div>
          </div>

          {user?.role === 'STUDENT' && (
            <div className="card mt-24">
              <div className="card-head">
                <div>
                  <h2>Recent rides</h2>
                  <p>Trip history and receipts.</p>
                </div>
                <Link href="/dashboard/rides" className="card-link">
                  Open dashboard <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              {loadingRides && rides.length === 0 ? (
                <Loading label="Loading rides" />
              ) : rides.length === 0 ? (
                <EmptyState
                  icon="bike"
                  title="No rides yet"
                  description="Your first campus ride will show up here with its fare and driver details."
                />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Fare</th>
                        <th>Status</th>
                        <th>Requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rides.slice(0, 6).map((ride) => (
                        <tr key={ride.id}>
                          <td>
                            <div className="row-title">
                              <div>
                                <strong>
                                  {ride.pickupLabel} → {ride.destLabel}
                                </strong>
                                <span>{distanceLabel(ride.distanceM)}</span>
                              </div>
                            </div>
                          </td>
                          <td>{tzs(ride.finalFare ?? ride.estimatedFare)}</td>
                          <td>
                            <StatusBadge status={ride.status} label={rideStatusLabels[ride.status]} />
                          </td>
                          <td className="small muted">{timeAgo(ride.requestedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StudentFrame>
  );
}
