import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, LoadingView, Row, SegTabs, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { shortDate, timeAgo, tzs } from '@/lib/format';
import type { Inquiry } from '@/lib/types';

const tabs = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function StudentInquiries() {
  const theme = useTheme();
  const { push } = useToast();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');

  const load = useCallback(async () => {
    try {
      setItems(await api<Inquiry[]>('/api/student/inquiries/mine'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function withdraw(inquiry: Inquiry) {
    Alert.alert('Withdraw inquiry', `Withdraw your inquiry for ${inquiry.propertyName}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/student/inquiries/${inquiry.id}/withdraw`, { method: 'POST' });
            push('Inquiry withdrawn', 'success');
            await load();
          } catch (error) {
            push(error instanceof Error ? error.message : 'Could not withdraw', 'error');
          }
        },
      },
    ]);
  }

  const visible = items.filter((item) =>
    tab === 'ALL'
      ? true
      : tab === 'CLOSED'
        ? ['DECLINED', 'WITHDRAWN'].includes(item.status)
        : item.status === tab,
  );

  return (
    <Workspace
      role="STUDENT"
      title="Stay inquiries"
      subtitle="Track every conversation with hosts. Exact addresses appear once an inquiry is accepted.">
      <SegTabs options={tabs} value={tab} onChange={setTab} />

      {loading ? (
        <LoadingView label="Loading inquiries" />
      ) : visible.length === 0 ? (
        <Card>
          <Empty
            icon="chatbubbles-outline"
            title="No inquiries here"
            description="Browse verified stays and send an inquiry to a host."
          />
        </Card>
      ) : (
        visible.map((item) => (
          <Card key={item.id}>
            <Row align="space-between">
              <Body bold small>
                {item.propertyName}
              </Body>
              <StatusBadge status={item.status} />
            </Row>
            <Body muted small>
              {item.unitLabel} · {item.addressArea} · {tzs(item.pricePerMonth)}/month
            </Body>
            <Body muted small>
              Move-in {shortDate(item.moveInDate)} · {item.durationMonths} month
              {item.durationMonths === 1 ? '' : 's'} · sent {timeAgo(item.createdAt)}
            </Body>
            {item.message ? (
              <Body small style={{ color: theme.textMuted }}>
                “{item.message}”
              </Body>
            ) : null}
            {item.responseMessage ? (
              <Card style={{ backgroundColor: theme.primarySoft, borderColor: theme.primary }}>
                <Body bold small>
                  Host reply
                </Body>
                <Body small>{item.responseMessage}</Body>
              </Card>
            ) : null}
            {item.status === 'ACCEPTED' ? (
              <Card style={{ backgroundColor: theme.successSoft, borderColor: theme.success }}>
                <Body bold small>
                  Booking confirmed
                </Body>
                <Body small>
                  Host: {item.ownerName}
                  {item.ownerPhone ? ` · ${item.ownerPhone}` : ''}
                </Body>
                {item.startDate ? (
                  <Body muted small>
                    {shortDate(item.startDate)} → {shortDate(item.endDate)} ·{' '}
                    {tzs(item.totalAmount)} total
                  </Body>
                ) : null}
              </Card>
            ) : null}
            {item.status === 'PENDING' ? (
              <Button
                label="Withdraw inquiry"
                size="sm"
                variant="danger"
                onPress={() => withdraw(item)}
              />
            ) : null}
          </Card>
        ))
      )}
    </Workspace>
  );
}
