import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { Button } from '@/components/button';
import {
  Body,
  Card,
  Empty,
  Heading,
  LoadingView,
  Row,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { ContactMessage } from '@/lib/types';

export default function AdminMessages() {
  const { push } = useToast();
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<ContactMessage[]>('/api/admin/contact-messages'));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(item: ContactMessage) {
    try {
      await api(`/api/admin/contact-messages/${item.id}/read`, { method: 'POST' });
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, status: 'READ' } : row)),
      );
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not mark read', 'error');
    }
  }

  const visible = unreadOnly ? items.filter((item) => item.status === 'NEW') : items;

  return (
    <Workspace
      role="ADMIN"
      title="Contact messages"
      subtitle="Enquiries from the website landing page.">
      <Button
        label={unreadOnly ? 'Show all messages' : 'Show unread only'}
        variant="secondary"
        size="sm"
        onPress={() => setUnreadOnly((value) => !value)}
      />

      {loading ? (
        <LoadingView label="Loading messages" />
      ) : visible.length === 0 ? (
        <Empty icon="mail-outline" title="Inbox empty" description="New contact form entries appear here." />
      ) : (
        visible.map((item) => (
          <Card key={item.id}>
            <Row align="space-between">
              <View style={{ flex: 1 }}>
                <Heading size="sm">{item.subject}</Heading>
                <Body muted small>
                  {item.name} · {item.email}
                  {item.phone ? ` · ${item.phone}` : ''}
                </Body>
                <Body muted small>
                  {dateTime(item.createdAt)}
                </Body>
              </View>
              <StatusBadge status={item.status} />
            </Row>
            <Body small>{item.message}</Body>
            <Row>
              <Button
                label="Reply by email"
                size="sm"
                onPress={() => void Linking.openURL(`mailto:${item.email}?subject=Re: ${item.subject}`)}
              />
              {item.phone ? (
                <Button
                  label="Call"
                  size="sm"
                  variant="secondary"
                  onPress={() => void Linking.openURL(`tel:${item.phone}`)}
                />
              ) : null}
              {item.status === 'NEW' ? (
                <Button
                  label="Mark read"
                  size="sm"
                  variant="ghost"
                  onPress={() => void markRead(item)}
                />
              ) : null}
            </Row>
          </Card>
        ))
      )}
    </Workspace>
  );
}
