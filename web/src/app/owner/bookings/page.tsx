'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { shortDate, timeAgo, tzs } from '@/lib/format';
import type { Booking } from '@/lib/types';

type Tab = 'ACTIVE' | 'COMPLETED' | 'ALL';

export default function OwnerBookingsPage() {
  const { push } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ACTIVE');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBookings(await api<Booking[]>('/api/owner/bookings'));
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (tab === 'ALL' ? bookings : bookings.filter((booking) => booking.status === tab)),
    [bookings, tab],
  );

  const active = bookings.filter((booking) => booking.status === 'ACTIVE');
  const rentValue = active.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
  const fees = bookings.reduce((sum, booking) => sum + Number(booking.successFee), 0);

  async function complete(booking: Booking) {
    if (
      !window.confirm(
        `Close this booking for ${booking.studentName ?? 'the student'}? The unit will become available again.`,
      )
    ) {
      return;
    }
    setBusy(booking.id);
    try {
      await api(`/api/owner/bookings/${booking.id}/complete`, { method: 'POST' });
      push('Booking completed and unit released', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not complete booking', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Tenancies"
        title="Bookings"
        subtitle="Confirmed stays created when you accept an inquiry. Close a booking when the tenancy ends."
      />

      <div className="stats-grid">
        <StatCard label="Active tenancies" value={active.length} icon="key" tone="green" />
        <StatCard label="Rent value (active)" value={tzs(rentValue)} hint="Total contract value" icon="wallet" />
        <StatCard
          label="Success fees"
          value={tzs(fees)}
          hint="Across all bookings"
          icon="star"
          tone="amber"
        />
        <StatCard label="All bookings" value={bookings.length} hint="Active and completed" icon="calendar" />
      </div>

      <div className="inline mb-16">
        <div className="seg-tabs" style={{ maxWidth: 360 }}>
          {(['ACTIVE', 'COMPLETED', 'ALL'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {key === 'ALL' ? 'All' : key[0] + key.slice(1).toLowerCase()} (
              {key === 'ALL'
                ? bookings.length
                : bookings.filter((booking) => booking.status === key).length}
              )
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading bookings" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="key"
            title="No bookings in this view"
            description="Accept a pending inquiry to create a confirmed booking with move-in dates and rent."
          />
        </div>
      ) : (
        <div className="stack">
          {visible.map((booking) => (
            <div key={booking.id} className="card card-pad-lg">
              <div className="inline" style={{ justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="eyebrow">
                    {booking.propertyName} · {booking.addressArea}
                  </div>
                  <h3 style={{ fontSize: 18, marginTop: 4 }}>
                    {booking.studentName}
                    {booking.studentUniversity ? ` · ${booking.studentUniversity}` : ''}
                  </h3>
                </div>
                <StatusBadge status={booking.status} />
              </div>

              <div className="inquiry-chips mt-16">
                <span>
                  <Icon name="bed" size={13} /> {booking.unitLabel}
                </span>
                <span>
                  <Icon name="calendar" size={13} /> {shortDate(booking.startDate)} →{' '}
                  {shortDate(booking.endDate)}
                </span>
                <span>
                  <Icon name="wallet" size={13} /> {tzs(booking.monthlyRent)}/month
                </span>
                <span>
                  <Icon name="star" size={13} /> Success fee {tzs(booking.successFee)}
                </span>
              </div>

              <div className="accepted-panel mt-16">
                <div>
                  <strong>Contract value {tzs(booking.totalAmount)}</strong>
                  <span>
                    Confirmed {timeAgo(booking.confirmedAt)}
                    {booking.endedAt ? ` · ended ${shortDate(booking.endedAt)}` : ''}
                  </span>
                </div>
                <div className="inline">
                  {booking.studentPhone && (
                    <a href={`tel:${booking.studentPhone}`} className="btn btn-outline btn-sm">
                      <Icon name="phone" size={13} /> {booking.studentPhone}
                    </a>
                  )}
                  {booking.status === 'ACTIVE' && (
                    <button
                      type="button"
                      className="btn btn-dark btn-sm"
                      disabled={busy === booking.id}
                      onClick={() => void complete(booking)}
                    >
                      {busy === booking.id ? 'Closing…' : 'Mark as completed'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
