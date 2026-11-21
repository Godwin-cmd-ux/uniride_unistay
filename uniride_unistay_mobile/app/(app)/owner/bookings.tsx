import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, LoadingView, Row, SegTabs, Stat, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { shortDate, tzs } from '@/lib/format';
import type { Booking } from '@/lib/types';

export default function OwnerBookings() {
  const { push } = useToast();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ACTIVE');

  const load = useCallback(async () => {
    try {
      setItems(await api<Booking[]>('/api/owner/bookings'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function complete(booking: Booking) {
    Alert.alert(
      'Complete stay',
      `Mark the stay for ${booking.studentName} at ${booking.propertyName} as completed?`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await api(`/api/owner/bookings/${booking.id}/complete`, { method: 'POST' });
              push('Booking completed', 'success');
              await load();
            } catch (error) {
              push(error instanceof Error ? error.message : 'Could not complete booking', 'error');
            }
          },
        },
      ],
    );
  }

  const visible = items.filter((item) =>
    tab === 'ALL' ? true : item.status === tab,
  );
  const active = items.filter((booking) => booking.status === 'ACTIVE');
  const rentValue = active.reduce((sum, booking) => sum + booking.totalAmount, 0);
  const fees = items.reduce((sum, booking) => sum + booking.successFee, 0);

  return (
    <Workspace
      role="OWNER"
      title="Bookings"
      subtitle="Confirmed stays, rent value and platform success fees.">
      <Row gap={10}>
        <Stat label="Active stays" value={String(active.length)} />
        <Stat label="Rent value" value={tzs(rentValue)} hint="Active contracts" />
        <Stat label="Success fees" value={tzs(fees)} hint="All bookings" />
      </Row>
      <SegTabs
        options={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'CANCELLED', label: 'Cancelled' },
          { value: 'ALL', label: 'All' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <LoadingView label="Loading bookings" />
      ) : visible.length === 0 ? (
        <Card>
          <Empty
            icon="key-outline"
            title="No bookings in this view"
            description="Accepted inquiries become confirmed bookings here."
          />
        </Card>
      ) : (
        visible.map((booking) => (
          <Card key={booking.id}>
            <Row align="space-between">
              <Body bold small>
                {booking.propertyName}
              </Body>
              <StatusBadge status={booking.status} />
            </Row>
            <Body muted small>
              {booking.unitLabel ?? 'Unit'} · {booking.addressArea}
            </Body>
            <Body small>
              {booking.studentName}
              {booking.studentPhone ? ` · ${booking.studentPhone}` : ''}
            </Body>
            <Body muted small>
              {shortDate(booking.startDate)} → {shortDate(booking.endDate)} ·{' '}
              {tzs(booking.monthlyRent)}/month
            </Body>
            <Body muted small>
              Total {tzs(booking.totalAmount)} · success fee {tzs(booking.successFee)}
            </Body>
            {booking.status === 'ACTIVE' ? (
              <Button label="Complete stay" size="sm" variant="secondary" onPress={() => complete(booking)} />
            ) : null}
          </Card>
        ))
      )}
    </Workspace>
  );
}
