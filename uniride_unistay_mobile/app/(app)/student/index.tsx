import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, Heading, Row, Stat, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useAuth } from '@/context/auth';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { shortDate, timeAgo, tzs } from '@/lib/format';
import type { Booking, Inquiry, NotificationItem, Ride } from '@/lib/types';

const actions = [
  { label: 'Find a stay', icon: 'bed-outline' as const, href: '/student/stays' },
  { label: 'Book a ride', icon: 'bicycle-outline' as const, href: '/student/rides' },
  { label: 'My inquiries', icon: 'chatbubbles-outline' as const, href: '/student/inquiries' },
  { label: 'Get help', icon: 'shield-outline' as const, href: '/student/support' },
];

export default function StudentHome() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { selected } = useUniversity();
  const [rides, setRides] = useState<Ride[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rideData, inquiryData, bookingData, notificationData] = await Promise.all([
      api<Ride[]>('/api/rides/mine').catch(() => []),
      api<Inquiry[]>('/api/student/inquiries/mine').catch(() => []),
      api<Booking[]>('/api/student/bookings/mine').catch(() => []),
      api<{ items: NotificationItem[] }>('/api/notifications').catch(() => ({ items: [] })),
    ]);
    setRides(rideData);
    setInquiries(inquiryData);
    setBookings(bookingData);
    setNotifications(notificationData.items.slice(0, 3));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const liveRide = rides.find((ride) =>
    ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP'].includes(ride.status),
  );
  const openInquiries = inquiries.filter((inquiry) => inquiry.status === 'PENDING').length;
  const activeStay = bookings.find((booking) => booking.status === 'ACTIVE');
  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  return (
    <Workspace
      role="STUDENT"
      title={`Karibu, ${firstName}`}
      subtitle={`${selected?.shortName ?? 'Your campus'} · rides and verified stays in one place.`}>
      <Row gap={10}>
        <Stat label="Open inquiries" value={String(openInquiries)} hint="Awaiting owner reply" />
        <Stat
          label="Active stay"
          value={activeStay ? 'Yes' : '—'}
          hint={activeStay?.propertyName ?? 'No booking yet'}
        />
        <Stat
          label="Completed rides"
          value={String(rides.filter((ride) => ride.status === 'COMPLETED').length)}
          hint="All time"
        />
      </Row>

      {liveRide ? (
        <Card style={{ borderColor: theme.primary }}>
          <Row align="space-between">
            <Body bold>
              {liveRide.status === 'REQUESTED' ? 'Finding your driver' : 'Ride in progress'}
            </Body>
            <StatusBadge status={liveRide.status} />
          </Row>
          <Body small muted>
            {liveRide.pickupLabel} → {liveRide.destLabel}
          </Body>
          {liveRide.driverName ? (
            <Body small>
              {liveRide.driverName} · {liveRide.vehiclePlate ?? 'vehicle'} · {liveRide.driverPhone}
            </Body>
          ) : null}
          <Row>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>
              {tzs(liveRide.estimatedFare)}
            </Text>
            <Button label="Track ride" size="sm" onPress={() => router.push('/student/rides')} />
          </Row>
        </Card>
      ) : null}

      <View style={styles.actionGrid}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href as never)}
            style={{
              flexBasis: '47%',
              flexGrow: 1,
              backgroundColor: theme.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border,
              borderRadius: theme.radius.lg,
              padding: 14,
              gap: 10,
            }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: theme.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name={action.icon} size={19} color={theme.primary} />
            </View>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Row align="space-between">
          <Heading size="sm">Latest updates</Heading>
          <Pressable onPress={() => router.push('/notifications')}>
            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>See all</Text>
          </Pressable>
        </Row>
        {loading ? (
          <Body muted small>Loading your activity…</Body>
        ) : notifications.length === 0 ? (
          <Card>
            <Empty
              title="Nothing yet"
              description="Request a ride or send a stay inquiry to start receiving updates."
              icon="notifications-outline"
            />
          </Card>
        ) : (
          notifications.map((item) => (
            <Card key={item.id}>
              <Row align="space-between">
                <Body bold small>
                  {item.title}
                </Body>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                  {timeAgo(item.createdAt)}
                </Text>
              </Row>
              <Body muted small>
                {item.body}
              </Body>
            </Card>
          ))
        )}
      </View>

      {activeStay ? (
        <Card>
          <Row align="space-between">
            <Body bold>Your confirmed stay</Body>
            <StatusBadge status={activeStay.status} />
          </Row>
          <Body small>
            {activeStay.propertyName} · {activeStay.unitLabel ?? 'Unit'}
          </Body>
          <Body muted small>
            {shortDate(activeStay.startDate)} → {shortDate(activeStay.endDate)} ·{' '}
            {tzs(activeStay.monthlyRent)}/month
          </Body>
          <Body muted small>
            Host: {activeStay.ownerName ?? '—'} · {activeStay.ownerPhone ?? ''}
          </Body>
        </Card>
      ) : null}
    </Workspace>
  );
}

const styles = StyleSheet.create({
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
