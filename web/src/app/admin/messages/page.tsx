'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { ContactMessage } from '@/lib/types';

export default function AdminMessagesPage() {
  const { push } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyNew, setOnlyNew] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await api<ContactMessage[]>('/api/admin/contact-messages'));
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(message: ContactMessage) {
    setBusy(message.id);
    try {
      await api(`/api/admin/contact-messages/${message.id}/read`, { method: 'POST' });
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, status: 'READ' } : item)),
      );
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update message', 'error');
    } finally {
      setBusy(null);
    }
  }

  const visible = onlyNew ? messages.filter((message) => message.status === 'NEW') : messages;
  const newCount = messages.filter((message) => message.status === 'NEW').length;

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Inbox"
        title="Contact messages"
        subtitle="Questions from the landing page. Mark them read once you have replied by email or phone."
      />

      <div className="filter-bar">
        <div className="field" style={{ minWidth: 220 }}>
          <span>Unread</span>
          <strong>
            {newCount} new message{newCount === 1 ? '' : 's'}
          </strong>
        </div>
        <label className="check-row" style={{ alignSelf: 'flex-end' }}>
          <input
            type="checkbox"
            checked={onlyNew}
            onChange={(event) => setOnlyNew(event.target.checked)}
          />
          <span>Show unread only</span>
        </label>
      </div>

      {loading ? (
        <Loading label="Loading messages" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="mail"
            title={onlyNew ? 'Inbox zero' : 'No messages yet'}
            description="Messages sent through the contact form appear here."
          />
        </div>
      ) : (
        <div className="stack">
          {visible.map((message) => (
            <div className="card" key={message.id}>
              <div className="card-head">
                <div>
                  <h2>{message.subject}</h2>
                  <p>
                    {message.name} · {message.email}
                    {message.phone ? ` · ${message.phone}` : ''} · {timeAgo(message.createdAt)}
                  </p>
                </div>
                <StatusBadge status={message.status} />
              </div>
              <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
                {message.message}
              </p>
              <div className="inline mt-16">
                <a className="btn btn-outline btn-sm" href={`mailto:${message.email}`}>
                  Reply by email
                </a>
                {message.phone && (
                  <a className="btn btn-ghost btn-sm" href={`tel:${message.phone}`}>
                    Call
                  </a>
                )}
                {message.status === 'NEW' && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy === message.id}
                    onClick={() => void markRead(message)}
                  >
                    {busy === message.id ? 'Saving…' : 'Mark as read'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
