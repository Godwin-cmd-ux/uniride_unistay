import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, Heading, LoadingView, Row, Stat, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { rideStatusLabels, timeAgo, tzs } from '@/lib/format';
import type { AdminOverview } from '@/lib/types';

const quickLinks = [
  { label: 'Driver queue', href: '/admin/drivers', icon: 'shield-checkmark-outline' as const },
  { label: 'Property queue', href: '/admin/properties', icon: 'business-outline' as const },
  { label: 'Users', href: '/admin/users', icon: 'people-outline' as const },
  { label: 'Ride log', href: '/admin/rides', icon: 'car-outline' as const },
  { label: 'Campuses', href: '/admin/universities', icon: 'school-outline' as const },
  { label: 'Complaints', href: '/admin/complaints', icon: 'alert-circle-outline' as const },
  { label: 'Contact messages', href: '/admin/messages', icon: 'mail-outline' as const },
  { label: 'Audit log', href: '/admin/logs', icon: 'document-text-outline' as const },
];

export default function AdminHome() {
  const theme = useTheme();
  const router = useRouter();
  const { push } = useToast();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await api<AdminOverview>('/api/admin/overview'));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load overview', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Workspace
      role="ADMIN"
      title="Control room"
      subtitle="Verification queues, live trips and platform health at a glance.">
      {loading || !data ? (
        <LoadingView label="Loading overview" />
      ) : (
        <>
          <Row gap={10}>
            <Stat label="Live rides" value={String(data.metrics.liveRides)} hint={`${data.metrics.ridesToday} today`} />
            <Stat label="Online drivers" value={String(data.metrics.onlineDrivers)} hint={`${data.metrics.verifiedDrivers} verified`} />
            <Stat label="Pending drivers" value={String(data.metrics.pendingDrivers)} hint="Awaiting review" />
            <Stat label="Pending listings" value={String(data.metrics.pendingProperties)} hint="Awaiting approval" />
          </Row>
          <Row gap={10}>
            <Stat label="Ride commission" value={tzs(data.metrics.rideCommission)} hint="Recorded" />
            <Stat label="Stay fees" value={tzs(data.metrics.accommodationFees)} hint="Success fees" />
            <Stat label="Open complaints" value={String(data.metrics.openComplaints)} />
            <Stat label="New messages" value={String(data.metrics.newContactMessages)} />
          </Row>

          <View style={styles.grid}>
            {quickLinks.map((link) => (
              <Pressable
                key={link.href}
                onPress={() => router.push(link.href as never)}
                style={{
                  flexBasis: '47%',
                  flexGrow: 1,
                  backgroundColor: theme.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.border,
                  borderRadius: theme.radius.lg,
                  padding: 14,
                  gap: 6,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={link.icon} size={18} color={theme.primary} />
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                    {link.label}
                  </Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>Open →</Text>
              </Pressable>
            ))}
          </View>

          <Card>
            <Row align="space-between">
              <Heading size="sm">Verification queue</Heading>
              <Button
                label="Drivers"
                size="sm"
                variant="ghost"
                onPress={() => router.push('/admin/drivers')}
              />
            </Row>
            {data.pendingDrivers.length === 0 ? (
              <Empty
                icon="shield-checkmark-outline"
                title="Driver queue clear"
                description="New applications appear here."
              />
            ) : (
              data.pendingDrivers.map((driver) => (
                <Row key={driver.userId} align="space-between">
                  <Body small>
                    {driver.fullName} · {driver.phone}
                  </Body>
                  <Body muted small>
                    {timeAgo(driver.createdAt)}
                  </Body>
                </Row>
              ))
            )}
            <View style={{ gap: 6 }}>
              {data.pendingProperties.slice(0, 3).map((property) => (
                <Row key={property.id} align="space-between">
                  <Body small>{property.name}</Body>
                  <StatusBadge status="PENDING" />
                </Row>
              ))}
            </View>
          </Card>

          <Card>
            <Heading size="sm">Recent rides</Heading>
            {data.recentRides.length === 0 ? (
              <Body muted small>
                No rides yet.
              </Body>
            ) : (
              data.recentRides.slice(0, 5).map((ride) => (
                <Row key={ride.id} align="space-between">
                  <View style={{ flex: 1 }}>
                    <Body small>
                      {ride.pickupLabel} → {ride.destLabel}
                    </Body>
                    <Body muted small>
                      {ride.studentName} · {rideStatusLabels[ride.status]} ·{' '}
                      {tzs(ride.finalFare ?? ride.estimatedFare)}
                    </Body>
                  </View>
                  <StatusBadge status={ride.status} />
                </Row>
              ))
            )}
          </Card>

          <Card>
            <Heading size="sm">Recent stay inquiries</Heading>
            {data.recentInquiries.length === 0 ? (
              <Body muted small>
                No inquiries yet.
              </Body>
            ) : (
              data.recentInquiries.slice(0, 5).map((inquiry) => (
                <Row key={inquiry.id} align="space-between">
                  <View style={{ flex: 1 }}>
                    <Body small>
                      {inquiry.studentFirstName} · {inquiry.propertyName}
                    </Body>
                    <Body muted small>{timeAgo(inquiry.createdAt)}</Body>
                  </View>
                  <StatusBadge status={inquiry.status} />
                </Row>
              ))
            )}
          </Card>
        </>
      )}
    </Workspace>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
