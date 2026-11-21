import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import {
  Body,
  Card,
  Empty,
  Field,
  Heading,
  KeyValue,
  LoadingView,
  Notice,
  Row,
  SegTabs,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { mediaUrl, propertyTypeLabels, shortDate, tzs } from '@/lib/format';
import type { AdminProperty } from '@/lib/types';

const tabs = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Live' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
];

export default function AdminProperties() {
  const theme = useTheme();
  const { push } = useToast();
  const [tab, setTab] = useState('PENDING');
  const [items, setItems] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = tab ? `?status=${tab}` : '';
      setItems(await api<AdminProperty[]>(`/api/admin/properties${query}`));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function verify(property: AdminProperty, approve: boolean, note?: string) {
    setBusyId(property.id);
    try {
      await api(`/api/admin/properties/${property.id}/verify`, {
        method: 'POST',
        body: { approve, reason: note ?? undefined },
      });
      push(approve ? `${property.name} is live` : `${property.name} sent back for changes`, 'success');
      setRejectingId(null);
      setReason('');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Workspace
      role="ADMIN"
      title="Listing approval"
      subtitle="Only approved stays reach students. Check the unit count and address area.">
      <SegTabs options={tabs} value={tab} onChange={setTab} />

      {loading ? (
        <LoadingView label="Loading listings" />
      ) : items.length === 0 ? (
        <Empty
          icon="business-outline"
          title="Nothing in this queue"
          description="Hosts submit listings from their owner dashboard."
        />
      ) : (
        items.map((property) => (
          <Card key={property.id}>
            {property.imageUrl ? (
              <Image
                source={{ uri: mediaUrl(property.imageUrl) }}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[styles.photo, { backgroundColor: theme.cardMuted }]}
              />
            )}
            <Row align="space-between">
              <View style={{ flex: 1 }}>
                <Heading size="sm">{property.name}</Heading>
                <Body muted small>
                  {propertyTypeLabels[property.type] ?? property.type} · {property.addressArea} ·{' '}
                  {property.universityShortName}
                </Body>
              </View>
              <StatusBadge status={property.status} />
            </Row>
            <Body small>{property.description}</Body>
            <KeyValue label="From" value={`${tzs(property.priceFrom)} / month`} />
            <KeyValue label="Bookable units" value={String(property.units)} />
            <KeyValue label="Host" value={`${property.ownerName} · ${property.ownerPhone}`} />
            <KeyValue label="Submitted" value={shortDate(property.createdAt)} />

            {property.status === 'PENDING' &&
              (rejectingId === property.id ? (
                <View style={{ gap: 10 }}>
                  <Field
                    label="Rejection reason"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="What should the host fix?"
                    multiline
                  />
                  <Row>
                    <Button
                      label="Confirm reject"
                      variant="danger"
                      size="sm"
                      disabled={reason.trim().length < 3 || busyId === property.id}
                      onPress={() => void verify(property, false, reason.trim())}
                    />
                    <Button
                      label="Cancel"
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setRejectingId(null);
                        setReason('');
                      }}
                    />
                  </Row>
                </View>
              ) : (
                <Row>
                  <Button
                    label="Approve listing"
                    size="sm"
                    disabled={busyId === property.id}
                    onPress={() => void verify(property, true)}
                  />
                  <Button
                    label="Reject"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setRejectingId(property.id);
                      setReason('');
                    }}
                  />
                </Row>
              ))}
            {property.status === 'REJECTED' && (
              <Notice tone="warning">
                The host can edit this listing and resubmit for review.
              </Notice>
            )}
          </Card>
        ))
      )}
    </Workspace>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
});
