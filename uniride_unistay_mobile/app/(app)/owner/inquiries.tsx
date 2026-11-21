import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { Body, Card, Empty, Field, LoadingView, Row, SegTabs, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { shortDate, timeAgo, tzs } from '@/lib/format';
import type { OwnerInquiry } from '@/lib/types';

export default function OwnerInquiries() {
  const theme = useTheme();
  const { push } = useToast();
  const [items, setItems] = useState<OwnerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [respondId, setRespondId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api<OwnerInquiry[]>('/api/owner/inquiries'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(inquiry: OwnerInquiry, action: 'ACCEPT' | 'DECLINE') {
    setBusy(true);
    try {
      await api(`/api/owner/inquiries/${inquiry.id}/respond`, {
        method: 'POST',
        body: { action, message },
      });
      push(
        action === 'ACCEPT'
          ? 'Inquiry accepted and booking created'
          : 'Inquiry declined',
        'success',
      );
      setRespondId(null);
      setMessage('');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not respond', 'error');
    } finally {
      setBusy(false);
    }
  }

  const visible = items.filter((item) => {
    if (tab === 'ALL') return true;
    if (tab === 'CLOSED') return ['DECLINED', 'WITHDRAWN'].includes(item.status);
    return item.status === tab;
  });

  return (
    <Workspace
      role="OWNER"
      title="Student inquiries"
      subtitle="Accept to create a booking and free the unit for those dates. Decline with a clear reason.">
      <SegTabs
        options={[
          { value: 'PENDING', label: 'Pending' },
          { value: 'ACCEPTED', label: 'Accepted' },
          { value: 'CLOSED', label: 'Closed' },
          { value: 'ALL', label: 'All' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <LoadingView label="Loading inquiries" />
      ) : visible.length === 0 ? (
        <Card>
          <Empty
            icon="chatbubbles-outline"
            title="No inquiries here"
            description="Once your listing is live, student inquiries arrive in this queue."
          />
        </Card>
      ) : (
        visible.map((inquiry) => (
          <Card key={inquiry.id}>
            <Row align="space-between">
              <Body bold small>
                {inquiry.studentName}
              </Body>
              <StatusBadge status={inquiry.status} />
            </Row>
            <Body muted small>
              {inquiry.propertyName} · {inquiry.unitLabel} · {tzs(inquiry.pricePerMonth)}/month
            </Body>
            <Body muted small>
              Move-in {shortDate(inquiry.moveInDate)} · {inquiry.durationMonths} months ·{' '}
              {timeAgo(inquiry.createdAt)}
            </Body>
            {inquiry.studentUniversity ? (
              <Body muted small>
                {inquiry.studentUniversity}
                {inquiry.studentPhone ? ` · ${inquiry.studentPhone}` : ''}
              </Body>
            ) : null}
            {inquiry.message ? (
              <Body small style={{ color: theme.textMuted }}>
                “{inquiry.message}”
              </Body>
            ) : null}
            {inquiry.responseMessage ? (
              <Body small style={{ color: theme.primary }}>
                Your reply: {inquiry.responseMessage}
              </Body>
            ) : null}

            {inquiry.status === 'PENDING' ? (
              respondId === inquiry.id ? (
                <Card style={{ backgroundColor: theme.surface }}>
                  <Field
                    label="Reply to the student"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    placeholder="Viewing times, what to bring, directions…"
                  />
                  <Row>
                    <Button
                      label={busy ? 'Saving…' : 'Accept & book'}
                      size="sm"
                      onPress={() => void respond(inquiry, 'ACCEPT')}
                      disabled={busy}
                    />
                    <Button
                      label="Decline"
                      size="sm"
                      variant="danger"
                      onPress={() => void respond(inquiry, 'DECLINE')}
                      disabled={busy}
                    />
                    <Button
                      label="Cancel"
                      size="sm"
                      variant="ghost"
                      onPress={() => setRespondId(null)}
                    />
                  </Row>
                </Card>
              ) : (
                <Button
                  label="Respond"
                  size="sm"
                  onPress={() => {
                    setRespondId(inquiry.id);
                    setMessage('');
                  }}
                />
              )
            ) : null}
          </Card>
        ))
      )}
    </Workspace>
  );
}
