'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon, type IconName } from '@/components/Icon';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { timeAgo, roleHome } from '@/lib/format';
import type { NotificationItem } from '@/lib/types';

const iconsByType: Record<string, IconName> = {
  RIDE: 'bike',
  RIDE_UPDATE: 'bike',
  INQUIRY: 'chat',
  INQUIRY_UPDATE: 'chat',
  BOOKING: 'key',
  VERIFICATION: 'shield',
  ACCOUNT_STATUS: 'user',
  COMPLAINT_UPDATE: 'alert',
};

export default function NotificationsPage() {
  const { user, ready } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    try {
      const result = await api<{ items: NotificationItem[]; unreadCount: number }>(
        '/api/notifications',
      );
      setItems(result.items);
      setUnread(result.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  const visible = useMemo(
    () => (tab === 'unread' ? items.filter((item) => !item.readAt) : items),
    [items, tab],
  );

  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    try {
      await api(`/api/notifications/${item.id}/read`, { method: 'POST' });
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));
    } catch {
      push('Could not update notification', 'error');
    }
  }

  async function markAll() {
    try {
      await api('/api/notifications/read-all', { method: 'POST' });
      setItems((current) =>
        current.map((entry) => ({ ...entry, readAt: entry.readAt ?? new Date().toISOString() })),
      );
      setUnread(0);
      push('All notifications marked as read', 'success');
    } catch {
      push('Could not update notifications', 'error');
    }
  }

  function linkFor(item: NotificationItem): string | null {
    if (!user) return null;
    if (item.type.startsWith('RIDE')) {
      if (user.role === 'DRIVER') return '/driver/trips';
      if (user.role === 'ADMIN') return '/admin/rides';
      return '/dashboard/rides';
    }
    if (item.type.startsWith('INQUIRY') || item.type === 'BOOKING') {
      if (user.role === 'OWNER') return '/owner/inquiries';
      if (user.role === 'ADMIN') return '/admin/properties';
      return '/dashboard/inquiries';
    }
    if (item.type === 'COMPLAINT_UPDATE') {
      if (user.role === 'ADMIN') return '/admin/complaints';
      return '/dashboard/support';
    }
    if (item.type === 'VERIFICATION') {
      if (user.role === 'DRIVER') return '/driver/vehicle';
      if (user.role === 'OWNER') return '/owner/properties';
      return roleHome(user.role);
    }
    return null;
  }

  if (!ready || !user) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <span className="spinner" /> Loading notifications…
      </div>
    );
  }

  return (
    <AppShell role={user.role}>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle="Ride updates, verification decisions, inquiry responses and account alerts in one place."
        actions={
          unread > 0 ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void markAll()}>
              <Icon name="check" size={14} /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="inline" style={{ marginBottom: 16 }}>
        <div className="seg-tabs" style={{ maxWidth: 320 }}>
          <button
            type="button"
            className={tab === 'all' ? 'active' : ''}
            onClick={() => setTab('all')}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            className={tab === 'unread' ? 'active' : ''}
            onClick={() => setTab('unread')}
          >
            Unread ({unread})
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Loading label="Loading notifications" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="bell"
            title={tab === 'unread' ? 'Nothing unread' : 'No notifications yet'}
            description={
              tab === 'unread'
                ? 'You are all caught up. New updates will appear here.'
                : 'Ride and stay updates will show up here as they happen.'
            }
          />
        ) : (
          <div>
            {visible.map((item) => {
              const href = linkFor(item);
              const body = (
                <>
                  <span className="notif-icon">
                    <Icon name={iconsByType[item.type] ?? 'bell'} size={17} />
                  </span>
                  <div className="notif-body">
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <small>{timeAgo(item.createdAt)}</small>
                  </div>
                </>
              );
              return (
                <div key={item.id} className={`notif ${item.readAt ? '' : 'unread'}`}>
                  {body}
                  <div className="notif-action inline">
                    {href && (
                      <Link
                        href={href}
                        className="btn btn-ghost btn-sm"
                        onClick={() => void markRead(item)}
                      >
                        Open
                      </Link>
                    )}
                    {!item.readAt && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => void markRead(item)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
