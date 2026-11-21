'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { mediaUrl, shortDate } from '@/lib/format';
import type { AdminDriver } from '@/lib/types';

const tabs = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
];

const docLabels: Record<string, string> = {
  LICENSE: 'Driving licence',
  NATIONAL_ID: 'National ID',
  VEHICLE_INSURANCE: 'Vehicle insurance',
};

export default function AdminDriversPage() {
  const { push } = useToast();
  const [filter, setFilter] = useState('PENDING');
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminDriver | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('verificationStatus');
    if (status) setFilter(status);
  }, []);

  const load = useCallback(async (verificationStatus: string) => {
    setLoading(true);
    try {
      const suffix = verificationStatus
        ? `?verificationStatus=${encodeURIComponent(verificationStatus)}`
        : '';
      setDrivers(await api<AdminDriver[]>(`/api/admin/drivers${suffix}`));
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function verify(driver: AdminDriver, approve: boolean, note?: string) {
    setBusy(driver.userId);
    try {
      await api(`/api/admin/drivers/${driver.userId}/verify`, {
        method: 'POST',
        body: { approve, ...(note ? { reason: note } : {}) },
      });
      push(approve ? `${driver.fullName} verified` : `${driver.fullName} rejected`, 'success');
      setRejecting(null);
      setReason('');
      await load(filter);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update verification', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Verification"
        title="Driver applications"
        subtitle="Review licences, national IDs and insurance before letting drivers take ride requests."
      />

      <div className="seg-tabs" style={{ maxWidth: 520 }}>
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={filter === tab.value ? 'active' : ''}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading drivers" />
      ) : drivers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="shield"
            title="Nothing in this queue"
            description="Drivers appear here as soon as they submit their licence and national ID."
          />
        </div>
      ) : (
        <div className="stack">
          {drivers.map((driver) => (
            <div className="card" key={driver.userId}>
              <div className="card-head">
                <div>
                  <h2>{driver.fullName}</h2>
                  <p>
                    {driver.phone}
                    {driver.email ? ` · ${driver.email}` : ''} · {driver.universityShortName}
                  </p>
                </div>
                <div className="inline">
                  <StatusBadge status={driver.verificationStatus} />
                  <StatusBadge status={driver.status} />
                </div>
              </div>

              <div className="detail-grid">
                <div>
                  <span className="muted small">Licence number</span>
                  <strong>{driver.licenseNumber ?? '—'}</strong>
                </div>
                <div>
                  <span className="muted small">National ID</span>
                  <strong>{driver.nationalId ?? '—'}</strong>
                </div>
                <div>
                  <span className="muted small">Vehicle</span>
                  <strong>
                    {driver.plateNumber
                      ? `${driver.make ?? ''} ${driver.model ?? ''} · ${driver.plateNumber}`
                      : 'Not registered'}
                  </strong>
                </div>
                <div>
                  <span className="muted small">Rides completed</span>
                  <strong>{driver.completedRides}</strong>
                </div>
                <div>
                  <span className="muted small">Rating</span>
                  <strong>{driver.ratingAvg ? driver.ratingAvg.toFixed(1) : 'New'}</strong>
                </div>
                <div>
                  <span className="muted small">Registered</span>
                  <strong>{shortDate(driver.createdAt)}</strong>
                </div>
              </div>

              {driver.verificationStatus === 'REJECTED' && driver.rejectionReason && (
                <div className="notice notice-warn mt-16">
                  <strong>Rejected:</strong> {driver.rejectionReason}
                </div>
              )}

              <div className="doc-list mt-16">
                {(driver.documents ?? []).length === 0 && (
                  <p className="muted small">No documents uploaded yet.</p>
                )}
                {(driver.documents ?? []).map((doc) => (
                  <div className="doc-row" key={doc.id}>
                    <div>
                      <strong>{docLabels[doc.type] ?? doc.type}</strong>
                      <span>{doc.status.toLowerCase()}</span>
                    </div>
                    <a
                      className="btn btn-ghost btn-sm"
                      href={mediaUrl(doc.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open file
                    </a>
                  </div>
                ))}
              </div>

              {rejecting?.userId === driver.userId ? (
                <form
                  className="mt-16"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void verify(driver, false, reason.trim());
                  }}
                >
                  <label className="field">
                    <span>Reason for rejection (sent to the driver)</span>
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="e.g. Licence photo is blurred and the expiry date is unreadable."
                      required
                    />
                  </label>
                  <div className="inline mt-16">
                    <button type="submit" className="btn btn-danger-soft" disabled={busy === driver.userId}>
                      {busy === driver.userId ? 'Rejecting…' : 'Confirm rejection'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setRejecting(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="inline mt-16">
                  {driver.verificationStatus === 'VERIFIED' ? (
                    <span className="badge badge-success badge-dot">Approved driver</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy === driver.userId}
                        onClick={() => void verify(driver, true)}
                      >
                        {busy === driver.userId ? 'Saving…' : 'Approve driver'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          setRejecting(driver);
                          setReason('');
                        }}
                      >
                        Reject with reason
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
