import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, Heading, LoadingView, Row, Stat, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { propertyTypeLabels, shortDate, timeAgo, tzs } from '@/lib/format';
import type { OwnerInquiry, OwnerProperty } from '@/lib/types';

type Counts = {
  properties: number;
  activeProperties: number;
  pendingProperties: number;
  availableUnits: number;
  occupiedUnits: number;
  pendingInquiries: number;
  activeBookings: number;
  totalSuccessFees: number;
  totalRentValue: number;
};

export default function OwnerHome() {
  const theme = useTheme();
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [inquiries, setInquiries] = useState<OwnerInquiry[]>([]);
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [overview, list] = await Promise.all([
      api<{ counts: Counts; recentInquiries: OwnerInquiry[] }>('/api/owner/overview').catch(
        () => null,
      ),
      api<OwnerProperty[]>('/api/owner/properties').catch(() => []),
    ]);
    if (overview) {
      setCounts(overview.counts);
      setInquiries(overview.recentInquiries);
    }
    setProperties(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const occupancy =
    counts && counts.availableUnits + counts.occupiedUnits > 0
      ? Math.round((counts.occupiedUnits / (counts.availableUnits + counts.occupiedUnits)) * 100)
      : 0;

  return (
    <Workspace
      role="OWNER"
      title="Hostel workspace"
      subtitle="Publish verified listings, answer students and keep every bed accounted for.">
      {loading ? (
        <LoadingView label="Loading overview" />
      ) : (
        <>
          {counts && counts.properties === 0 ? (
            <Card>
              <Empty
                icon="business-outline"
                title="Add your first property"
                description="List a hostel, house, apartment or single room near campus."
              />
              <Button label="Create listing" onPress={() => router.push('/owner/new-property')} block />
            </Card>
          ) : null}
          {counts && counts.pendingProperties > 0 ? (
            <Body small style={{ color: theme.warning }}>
              {counts.pendingProperties} listing{counts.pendingProperties === 1 ? '' : 's'} awaiting
              admin approval.
            </Body>
          ) : null}

          <Row gap={10}>
            <Stat label="Properties" value={String(counts?.properties ?? 0)} hint={`${counts?.activeProperties ?? 0} live`} />
            <Stat label="Occupancy" value={`${occupancy}%`} hint={`${counts?.occupiedUnits ?? 0} occupied beds`} />
            <Stat label="Open inquiries" value={String(counts?.pendingInquiries ?? 0)} hint="Waiting for reply" />
            <Stat label="Rent value" value={tzs(counts?.totalRentValue ?? 0)} hint={`Fees ${tzs(counts?.totalSuccessFees ?? 0)}`} />
          </Row>

          <Row>
            <Button label="New listing" onPress={() => router.push('/owner/new-property')} />
            <Button
              label="View inquiries"
              variant="secondary"
              onPress={() => router.push('/owner/inquiries')}
            />
          </Row>

          <View style={{ gap: 10 }}>
            <Row align="space-between">
              <Heading size="sm">Your listings</Heading>
              <Button
                label="Manage all"
                size="sm"
                variant="ghost"
                onPress={() => router.push('/owner/properties')}
              />
            </Row>
            {properties.length === 0 ? (
              <Card>
                <Empty
                  icon="business-outline"
                  title="No properties yet"
                  description="Create a listing to start receiving inquiries."
                />
              </Card>
            ) : (
              properties.slice(0, 3).map((property) => (
                <Card key={property.id}>
                  <Row align="space-between">
                    <Body bold small>
                      {property.name}
                    </Body>
                    <StatusBadge status={property.status} />
                  </Row>
                  <Body muted small>
                    {propertyTypeLabels[property.type]} · {property.addressArea} ·{' '}
                    {tzs(property.priceFrom)}/month
                  </Body>
                  <Row>
                    <Body muted small>
                      {property.availableUnits}/{property.totalUnits} units available ·{' '}
                      {property.pendingInquiries} pending
                    </Body>
                  </Row>
                </Card>
              ))
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Heading size="sm">Recent inquiries</Heading>
            {inquiries.length === 0 ? (
              <Card>
                <Body muted small>
                  No inquiries yet. Students will reach out once your listing is live.
                </Body>
              </Card>
            ) : (
              inquiries.map((inquiry) => (
                <Card key={inquiry.id}>
                  <Row align="space-between">
                    <Body bold small>
                      {inquiry.studentName.split(' ')[0]} · {inquiry.propertyName}
                    </Body>
                    <StatusBadge status={inquiry.status} />
                  </Row>
                  <Body muted small>
                    {inquiry.unitLabel} · move-in {shortDate(inquiry.moveInDate)} ·{' '}
                    {inquiry.durationMonths} months · {timeAgo(inquiry.createdAt)}
                  </Body>
                </Card>
              ))
            )}
          </View>
        </>
      )}
    </Workspace>
  );
}
