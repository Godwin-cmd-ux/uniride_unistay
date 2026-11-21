'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { shortDate, timeAgo, tzs } from '@/lib/format';
import type { OwnerInquiry } from '@/lib/types';

type Tab = 'PENDING' | 'ACCEPTED' | 'CLOSED' | 'ALL';

export default function OwnerInquiriesPage() {
  const { push } = useToast();
  const [inquiries, setInquiries] = useState<OwnerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('PENDING');
  const [responding, setResponding] = useState<string | null>(null);
  const [action, setAction] = useState<'ACCEPT' | 'DECLINE'>('ACCEPT');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInquiries(await api<OwnerInquiry[]>('/api/owner/inquiries'));
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
      return inquiries.filter((inquiry) => ['DECLINED', 'WITHDRAWN'].includes(inquiry.status));
    }
    return inquiries.filter((inquiry) => inquiry.status === tab);
  }, [inquiries, tab]);

  function openRespond(inquiry: OwnerInquiry, nextAction: 'ACCEPT' | 'DECLINE') {
    setResponding(inquiry.id);
    setAction(nextAction);
    setMessage('');
  }

  async function submitResponse(inquiry: OwnerInquiry) {
    setBusy(inquiry.id);
    try {
      await api(`/api/owner/inquiries/${inquiry.id}/respond`, {
        method: 'POST',
        body: { action, message },
      });
      push(
        action === 'ACCEPT'
          ? 'Inquiry accepted. A booking was created and the student was notified.'
          : 'Inquiry declined and the student was notified.',
        'success',
      );
      setResponding(null);
      setMessage('');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not respond to inquiry', 'error');
    } finally {
      setBusy(null);
    }
  }

  const counts = {
    PENDING: inquiries.filter((inquiry) => inquiry.status === 'PENDING').length,
    ACCEPTED: inquiries.filter((inquiry) => inquiry.status === 'ACCEPTED').length,
    CLOSED: inquiries.filter((inquiry) => ['DECLINED', 'WITHDRAWN'].includes(inquiry.status)).length,
    ALL: inquiries.length,
  };

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Inbox"
        title="Stay inquiries"
        subtitle="Accepting an inquiry confirms the tenancy, creates a booking and marks the unit occupied."
      />

      <div className="inline mb-16">
        <div className="seg-tabs" style={{ maxWidth: 480 }}>
          {(['PENDING', 'ACCEPTED', 'CLOSED', 'ALL'] as Tab[]).map((key) => (
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
        <Loading label="Loading inquiries" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="chat"
            title="Nothing in this view"
            description={
              tab === 'PENDING'
                ? 'No students are waiting for a reply right now.'
                : 'Inquiries will appear here as students contact your listings.'
            }
          />
        </div>
      ) : (
        <div className="stack">
          {visible.map((inquiry) => (
            <div key={inquiry.id} className="card card-pad-lg">
              <div className="inline" style={{ justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="eyebrow">
                    {inquiry.propertyName} · {inquiry.addressArea}
                  </div>
                  <h3 style={{ fontSize: 18, marginTop: 4 }}>
                    {inquiry.studentName}
                    {inquiry.studentUniversity ? ` · ${inquiry.studentUniversity}` : ''}
                  </h3>
                </div>
                <StatusBadge status={inquiry.status} />
              </div>

              <div className="inquiry-chips mt-16">
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

              {inquiry.message && <p className="inquiry-message mt-16">“{inquiry.message}”</p>}

              {inquiry.responseMessage && (
                <p className="form-note">Your reply: {inquiry.responseMessage}</p>
              )}

              {inquiry.status === 'ACCEPTED' && inquiry.studentPhone && (
                <div className="accepted-panel mt-16">
                  <div>
                    <strong>Booking confirmed</strong>
                    <span>
                      Contact the student to arrange payment and keys. Move-in{' '}
                      {shortDate(inquiry.moveInDate)} · {inquiry.durationMonths} months.
                    </span>
                  </div>
                  <a href={`tel:${inquiry.studentPhone}`} className="btn btn-lime btn-sm">
                    <Icon name="phone" size={13} /> {inquiry.studentPhone}
                  </a>
                </div>
              )}

              <div className="inquiry-foot">
                <span className="small muted">Sent {timeAgo(inquiry.createdAt)}</span>
                {inquiry.status === 'PENDING' && (
                  <div className="inline">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openRespond(inquiry, 'ACCEPT')}
                    >
                      <Icon name="check" size={13} /> Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-soft btn-sm"
                      onClick={() => openRespond(inquiry, 'DECLINE')}
                    >
                      <Icon name="close" size={13} /> Decline
                    </button>
                  </div>
                )}
              </div>

              {responding === inquiry.id && (
                <div className="respond-panel">
                  <div className="inline" style={{ justifyContent: 'space-between' }}>
                    <strong>
                      {action === 'ACCEPT'
                        ? 'Accept this inquiry and create a booking'
                        : 'Decline this inquiry'}
                    </strong>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setResponding(null)}
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="form-note">
                    {action === 'ACCEPT'
                      ? 'The unit will be marked occupied and a booking recorded for the move-in dates. Only accept if the room is still available.'
                      : 'Add a short reason so the student knows what to do next. You can suggest another unit.'}
                  </p>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={
                      action === 'ACCEPT'
                        ? 'Optional message, e.g. “Karibu! Call me to arrange keys.”'
                        : 'e.g. “This room is taken, but Room 6 is available at the same rate.”'
                    }
                    maxLength={1000}
                  />
                  <button
                    type="button"
                    className={`btn ${action === 'ACCEPT' ? 'btn-primary' : 'btn-danger-soft'} btn-sm`}
                    disabled={busy === inquiry.id}
                    onClick={() => void submitResponse(inquiry)}
                  >
                    {busy === inquiry.id
                      ? 'Submitting…'
                      : action === 'ACCEPT'
                        ? 'Confirm acceptance'
                        : 'Confirm decline'}
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
