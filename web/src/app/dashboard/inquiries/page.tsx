'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { mediaUrl, propertyTypeLabels, shortDate, timeAgo, tzs } from '@/lib/format';
import type { Inquiry } from '@/lib/types';

type Tab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'CLOSED';

export default function StudentInquiriesPage() {
  const { push } = useToast();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInquiries(await api<Inquiry[]>('/api/student/inquiries/mine'));
    } catch {
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (tab === 'ALL') return inquiries;
    if (tab === 'CLOSED') {
      return inquiries.filter((item) =>
        ['DECLINED', 'WITHDRAWN'].includes(item.status),
      );
    }
    return inquiries.filter((item) => item.status === tab);
  }, [inquiries, tab]);

  async function withdraw(inquiry: Inquiry) {
    if (!window.confirm(`Withdraw your inquiry for ${inquiry.propertyName}?`)) return;
    setBusyId(inquiry.id);
    try {
      await api(`/api/student/inquiries/${inquiry.id}/withdraw`, { method: 'POST' });
      push('Inquiry withdrawn', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not withdraw inquiry', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    ALL: inquiries.length,
    PENDING: inquiries.filter((item) => item.status === 'PENDING').length,
    ACCEPTED: inquiries.filter((item) => item.status === 'ACCEPTED').length,
    CLOSED: inquiries.filter((item) => ['DECLINED', 'WITHDRAWN'].includes(item.status)).length,
  };

  return (
    <AppShell role="STUDENT">
      <PageHeader
        eyebrow="UNISTAY"
        title="My stay inquiries"
        subtitle="Track owner responses, withdraw pending requests and keep your confirmed bookings in view."
        actions={
          <Link href="/stays" className="btn btn-primary btn-sm">
            <Icon name="bed" size={15} /> Find another stay
          </Link>
        }
      />

      <div className="inline mb-16">
        <div className="seg-tabs" style={{ maxWidth: 480 }}>
          {(['ALL', 'PENDING', 'ACCEPTED', 'CLOSED'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {key === 'ALL' ? 'All' : key === 'CLOSED' ? 'Closed' : key[0] + key.slice(1).toLowerCase()} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading inquiries" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="chat"
            title="No inquiries in this view"
            description="Browse verified hostels, rooms and beds near your campus to start a conversation with an owner."
            action={{ href: '/stays', label: 'Browse stays' }}
          />
        </div>
      ) : (
        <div className="stack">
          {visible.map((inquiry) => (
            <div key={inquiry.id} className="inquiry-card">
              <div className="inquiry-media">
                {inquiry.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(inquiry.imageUrl)} alt={inquiry.propertyName} />
                ) : (
                  <span className="inquiry-media-fallback">
                    <Icon name="building" size={26} />
                  </span>
                )}
              </div>
              <div className="inquiry-main">
                <div className="inquiry-top">
                  <div>
                    <div className="eyebrow">
                      {propertyTypeLabels[inquiry.propertyType]} · {inquiry.addressArea}
                    </div>
                    <h3>{inquiry.propertyName}</h3>
                  </div>
                  <StatusBadge status={inquiry.status} />
                </div>

                <div className="inquiry-chips">
                  <span>
                    <Icon name="key" size={13} /> {inquiry.unitLabel}
                  </span>
                  <span>
                    <Icon name="wallet" size={13} /> {tzs(inquiry.pricePerMonth)}/month
                  </span>
                  <span>
                    <Icon name="calendar" size={13} /> Move-in {shortDate(inquiry.moveInDate)}
                  </span>
                  <span>
                    <Icon name="clock" size={13} /> {inquiry.durationMonths} month
                    {inquiry.durationMonths === 1 ? '' : 's'}
                  </span>
                </div>

                {inquiry.message && <p className="inquiry-message">“{inquiry.message}”</p>}

                {inquiry.status === 'ACCEPTED' && (
                  <div className="accepted-panel">
                    <div>
                      <strong>Accepted by {inquiry.ownerName}</strong>
                      <span>
                        {inquiry.bookingId
                          ? `Booking confirmed ${inquiry.bookingStatus?.toLowerCase() ?? ''} · ${shortDate(
                              inquiry.startDate,
                            )} → ${shortDate(inquiry.endDate)}`
                          : 'Owner accepted — booking details will follow.'}
                      </span>
                    </div>
                    {inquiry.ownerPhone && (
                      <a href={`tel:${inquiry.ownerPhone}`} className="btn btn-lime btn-sm">
                        <Icon name="phone" size={13} /> {inquiry.ownerPhone}
                      </a>
                    )}
                  </div>
                )}

                {inquiry.responseMessage && (
                  <p className="form-note">Owner note: {inquiry.responseMessage}</p>
                )}

                <div className="inquiry-foot">
                  <span className="small muted">
                    Sent {timeAgo(inquiry.createdAt)}
                    {inquiry.respondedAt ? ` · replied ${timeAgo(inquiry.respondedAt)}` : ''}
                  </span>
                  <div className="inline">
                    <Link href={`/stays/${inquiry.propertyId}`} className="btn btn-ghost btn-sm">
                      View property
                    </Link>
                    {inquiry.status === 'PENDING' && (
                      <button
                        type="button"
                        className="btn btn-danger-soft btn-sm"
                        disabled={busyId === inquiry.id}
                        onClick={() => void withdraw(inquiry)}
                      >
                        {busyId === inquiry.id ? 'Withdrawing…' : 'Withdraw'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
