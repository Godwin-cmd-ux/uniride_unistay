import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, LoadingView, Row, SegTabs, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { mediaUrl, propertyTypeLabels, tzs } from '@/lib/format';
import type { OwnerProperty } from '@/lib/types';

export default function OwnerProperties() {
  const theme = useTheme();
  const router = useRouter();
  const { push } = useToast();
  const [items, setItems] = useState<OwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');

  const load = useCallback(async () => {
    try {
      setItems(await api<OwnerProperty[]>('/api/owner/properties'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function archive(property: OwnerProperty) {
    Alert.alert(
      'Archive listing',
      `Archive ${property.name}? Students will no longer see it.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/owner/properties/${property.id}`, { method: 'DELETE' });
              push('Listing archived', 'success');
              await load();
            } catch (error) {
              push(error instanceof Error ? error.message : 'Could not archive', 'error');
            }
          },
        },
      ],
    );
  }

  const visible = items.filter((item) => {
    if (tab === 'ALL') return true;
    if (tab === 'ACTIVE') return item.status === 'ACTIVE';
    if (tab === 'PENDING') return item.status === 'PENDING';
    return ['REJECTED', 'ARCHIVED', 'SUSPENDED'].includes(item.status);
  });

  return (
    <Workspace
      role="OWNER"
      title="My properties"
      subtitle="Each listing is reviewed before it goes live. Keep photos and availability current.">
      <Row>
        <Button label="New listing" onPress={() => router.push('/owner/new-property')} />
      </Row>
      <SegTabs
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'ACTIVE', label: 'Live' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'OTHER', label: 'Other' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <LoadingView label="Loading properties" />
      ) : visible.length === 0 ? (
        <Card>
          <Empty
            icon="business-outline"
            title="Nothing in this view"
            description="Create a listing or switch tabs to see archived properties."
          />
        </Card>
      ) : (
        visible.map((property) => (
          <Card key={property.id}>
            {property.imageUrl ? (
              <Image
                source={{ uri: mediaUrl(property.imageUrl) }}
                style={{ width: '100%', height: 140, borderRadius: 14 }}
              />
            ) : null}
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
            <Body muted small>
              {property.availableUnits}/{property.totalUnits} units available ·{' '}
              {property.pendingInquiries} pending inquiries
            </Body>
            <Row>
              <Button
                label="Manage"
                size="sm"
                onPress={() => router.push(`/owner/property/${property.id}` as never)}
              />
              <Button
                label="Students"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/owner/inquiries')}
              />
              {property.status !== 'ARCHIVED' ? (
                <Pressable onPress={() => archive(property)}>
                  <Body small style={{ color: theme.danger }}>
                    Archive
                  </Body>
                </Pressable>
              ) : null}
            </Row>
          </Card>
        ))
      )}
    </Workspace>
  );
}
