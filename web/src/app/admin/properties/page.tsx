'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { mediaUrl, propertyTypeLabels, shortDate, tzs } from '@/lib/format';
import type { AdminProperty } from '@/lib/types';

const tabs = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Live' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
];

export default function AdminPropertiesPage() {
  const { push } = useToast();
  const [filter, setFilter] = useState('PENDING');
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminProperty | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status');
    if (status) setFilter(status);
  }, []);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
      setProperties(await api<AdminProperty[]>(`/api/admin/properties${suffix}`));
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function verify(property: AdminProperty, approve: boolean, note?: string) {
    setBusy(property.id);
    try {
      await api(`/api/admin/properties/${property.id}/verify`, {
        method: 'POST',
        body: { approve, ...(note ? { reason: note } : {}) },
      });
      push(approve ? 'Listing is live' : 'Listing rejected', 'success');
      setRejecting(null);
      setReason('');
      await load(filter);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update listing', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Marketplace"
        title="Property listings"
        subtitle="Inspect photos, pricing and location before publishing a hostel or apartment to students."
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
        <Loading label="Loading listings" />
      ) : properties.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="building"
            title="No listings in this view"
            description="Owner submissions appear here for approval before students can see them."
          />
        </div>
      ) : (
        <div className="stack">
          {properties.map((property) => (
            <div className="card" key={property.id}>
              <div className="card-head">
                <div>
                  <h2>{property.name}</h2>
                  <p>
                    {propertyTypeLabels[property.type] ?? property.type} · {property.addressArea} ·{' '}
                    {property.universityShortName}
                  </p>
                </div>
                <div className="inline">
                  <StatusBadge status={property.status} />
                  <span className="badge badge-muted">{tzs(property.priceFrom)}/mo</span>
                </div>
              </div>

              <div className="inline" style={{ alignItems: 'flex-start', gap: 16 }}>
                {property.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(property.imageUrl)}
                    alt={property.name}
                    style={{
                      width: 160,
                      height: 110,
                      objectFit: 'cover',
                      borderRadius: 'var(--radius)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 160,
                      height: 110,
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg-deep)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                    className="muted small"
                  >
                    No photo
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p className="small muted" style={{ marginTop: 0 }}>
                    {property.description}
                  </p>
                  <div className="detail-grid" style={{ marginTop: 12 }}>
                    <div>
                      <span className="muted small">Owner</span>
                      <strong>{property.ownerName}</strong>
                    </div>
                    <div>
                      <span className="muted small">Owner phone</span>
                      <strong>{property.ownerPhone}</strong>
                    </div>
                    <div>
                      <span className="muted small">Bookable units</span>
                      <strong>{property.units}</strong>
                    </div>
                    <div>
                      <span className="muted small">Submitted</span>
                      <strong>{shortDate(property.createdAt)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {rejecting?.id === property.id ? (
                <form
                  className="mt-16"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void verify(property, false, reason.trim());
                  }}
                >
                  <label className="field">
                    <span>Reason for rejection (sent to the owner)</span>
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="e.g. Photos do not match the address and the monthly price is missing."
                      required
                    />
                  </label>
                  <div className="inline mt-16">
                    <button type="submit" className="btn btn-danger-soft" disabled={busy === property.id}>
                      {busy === property.id ? 'Rejecting…' : 'Confirm rejection'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setRejecting(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="inline mt-16">
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`/stays/${property.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview listing
                  </a>
                  {property.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy === property.id}
                      onClick={() => void verify(property, true)}
                    >
                      {busy === property.id ? 'Saving…' : 'Approve & publish'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setRejecting(property);
                      setReason('');
                    }}
                  >
                    Reject with reason
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
