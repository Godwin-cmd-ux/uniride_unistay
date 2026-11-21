import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, LoadingView, Row, SegTabs } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { NotificationItem } from '@/lib/types';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { push } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: NotificationItem[]; unreadCount: number }>(
        '/api/notifications',
      );
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function destination(item: NotificationItem): string {
    const type = item.type;
    if (type.startsWith('RIDE')) {
      if (user?.role === 'DRIVER') return '/driver/trips';
      if (user?.role === 'ADMIN') return '/admin';
      return '/student/rides';
    }
    if (type.includes('INQUIRY') || type.includes('BOOKING')) {
      if (user?.role === 'OWNER') return '/owner/inquiries';
      if (user?.role === 'ADMIN') return '/admin/properties';
      return '/student/inquiries';
    }
    if (type === 'VERIFICATION') {
      if (user?.role === 'DRIVER') return '/driver/vehicle';
      if (user?.role === 'OWNER') return '/owner/properties';
    }
    if (type === 'COMPLAINT_UPDATE') {
      return user?.role === 'STUDENT' ? '/student/support' : '/account';
    }
    return '/notifications';
  }

  async function open(item: NotificationItem) {
    if (!item.readAt) {
      try {
        await api(`/api/notifications/${item.id}/read`, { method: 'POST' });
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
          ),
        );
        setUnread((value) => Math.max(0, value - 1));
      } catch {
        // Navigation still works if marking read fails.
      }
    }
    const target = destination(item);
    if (target !== '/notifications') router.push(target as never);
  }

  async function readAll() {
    try {
      await api('/api/notifications/read-all', { method: 'POST' });
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
      setUnread(0);
      push('All notifications marked as read', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update notifications', 'error');
    }
  }

  const visible = tab === 'UNREAD' ? items.filter((item) => !item.readAt) : items;

  return (
    <Workspace
      role={user?.role ?? 'STUDENT'}
      title="Notifications"
      subtitle={`${unread} unread · ride, stay and verification updates.`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <SegTabs
          options={[
            { value: 'ALL', label: `All (${items.length})` },
            { value: 'UNREAD', label: `Unread (${unread})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        {unread > 0 ? <Button label="Mark all read" size="sm" variant="ghost" onPress={() => void readAll()} /> : null}
      </Row>

      {loading ? (
        <LoadingView label="Loading notifications" />
      ) : visible.length === 0 ? (
        <Card>
          <Empty
            icon="notifications-outline"
            title="Nothing new"
            description="Updates about rides, inquiries and verifications appear here."
          />
        </Card>
      ) : (
        visible.map((item) => (
          <Pressable key={item.id} onPress={() => void open(item)}>
            <Card
              style={{
                borderColor: item.readAt ? theme.border : theme.primary,
                backgroundColor: item.readAt ? theme.card : theme.primarySoft,
              }}>
              <Row align="space-between">
                <Body bold small>
                  {item.title}
                </Body>
                <Body small style={{ color: theme.textMuted }}>
                  {timeAgo(item.createdAt)}
                </Body>
              </Row>
              <Body muted small>
                {item.body}
              </Body>
            </Card>
          </Pressable>
        ))
      )}
    </Workspace>
  );
}
