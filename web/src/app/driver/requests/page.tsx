'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { distanceLabel, timeAgo, tzs } from '@/lib/format';
import type { DriverProfile, DriverRequest } from '@/lib/types';

export default function DriverRequestsPage() {
  const { push } = useToast();
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const [requestPayload, profilePayload] = await Promise.all([
        api<{ requests: DriverRequest[]; notice: string | null }>('/api/driver/requests'),
        api<{ profile: DriverProfile }>('/api/driver/profile').catch(() => null),
      ]);
      setRequests(requestPayload.requests);
      setNotice(requestPayload.notice);
      if (profilePayload) setProfile(profilePayload.profile);
      setLastUpdated(new Date());
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 12000);
    return () => clearInterval(timer);
  }, [load]);

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

  const verified = profile?.verificationStatus === 'VERIFIED';

  return (
    <AppShell role="DRIVER">
      <PageHeader
        eyebrow="Live queue"
        title="Ride requests"
        subtitle="Requests refresh every 12 seconds. Accept only what you can reach in good time."
        actions={
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()}>
            <Icon name="route" size={14} /> Refresh
          </button>
        }
      />

      {!verified && profile && (
        <div className={`notice notice-${profile.verificationStatus === 'REJECTED' ? 'error' : 'warn'}`}>
          <Icon name="shield" size={18} />
          <div>
            <strong>Requests unlock after verification</strong>
            <p>
              {notice ??
                'Your driver documents must be approved before ride requests appear here.'}
            </p>
          </div>
          <Link href="/driver/vehicle" className="btn btn-outline btn-sm">
            Documents
          </Link>
        </div>
      )}

      <div className="inline mb-16 small muted">
        <span className={`online-dot ${verified ? 'ok' : ''}`} />
        {lastUpdated ? `Last updated ${timeAgo(lastUpdated.toISOString())}` : 'Connecting…'}
        {requests.length > 0 && ` · ${requests.length} open request${requests.length === 1 ? '' : 's'}`}
      </div>

      {loading ? (
        <Loading label="Looking for requests" />
      ) : requests.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="bike"
            title={verified ? 'No open requests right now' : 'Waiting for verification'}
            description={
              notice ??
              'Stay online and keep this page open. New requests from your campus will appear automatically.'
            }
            action={verified ? undefined : { href: '/driver/vehicle', label: 'Manage verification' }}
          />
        </div>
      ) : (
        <div className="stack">
          {requests.map((request) => (
            <div key={request.id} className="card card-pad-lg">
              <div className="inline" style={{ justifyContent: 'space-between' }}>
                <span className="badge badge-warn">
                  <span className="badge-dot" /> Waiting for a driver
                </span>
                <span className="small muted">{timeAgo(request.requestedAt)}</span>
              </div>

              <div className="grid-2 mt-16" style={{ alignItems: 'center' }}>
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
                        {request.studentFirstName} · {request.universityShortName}
                        {request.driverDistanceToPickupM !== null
                          ? ` · ${(request.driverDistanceToPickupM / 1000).toFixed(1)} km from you`
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
                  <strong style={{ fontSize: 25 }}>{tzs(request.estimatedFare)}</strong>
                  <span>
                    You keep approx.{' '}
                    {tzs(request.estimatedFare - Math.round(request.estimatedFare * 0.12))}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={acting === request.id || !verified}
                    onClick={() => void accept(request)}
                  >
                    {acting === request.id ? 'Accepting…' : 'Accept this ride'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
