import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

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
import { initials, mediaUrl, shortDate } from '@/lib/format';
import type { AdminDriver } from '@/lib/types';

const tabs = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
];

const docLabels: Record<string, string> = {
  LICENSE: 'Driver licence',
  NATIONAL_ID: 'National ID (NIDA)',
  VEHICLE_INSURANCE: 'Vehicle insurance',
};

export default function AdminDrivers() {
  const theme = useTheme();
  const { push } = useToast();
  const [tab, setTab] = useState('PENDING');
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = tab ? `?verificationStatus=${tab}` : '';
      setDrivers(await api<AdminDriver[]>(`/api/admin/drivers${query}`));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load drivers', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function verify(driver: AdminDriver, approve: boolean, note?: string) {
    setBusyId(driver.userId);
    try {
      await api(`/api/admin/drivers/${driver.userId}/verify`, {
        method: 'POST',
        body: { approve, reason: note ?? undefined },
      });
      push(approve ? `${driver.fullName} verified` : `${driver.fullName} rejected`, 'success');
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
      title="Driver verification"
      subtitle="Review licences, IDs and vehicle cover before anyone takes a trip.">
      <SegTabs options={tabs} value={tab} onChange={setTab} />

      {loading ? (
        <LoadingView label="Loading drivers" />
      ) : drivers.length === 0 ? (
        <Empty
          icon="shield-checkmark-outline"
          title="Nothing in this queue"
          description="Drivers appear here as they submit verification documents."
        />
      ) : (
        drivers.map((driver) => (
          <Card key={driver.userId}>
            <Row align="space-between">
              <Row>
                <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                  <Text style={{ color: theme.primary, fontWeight: '800' }}>
                    {initials(driver.fullName)}
                  </Text>
                </View>
                <View>
                  <Heading size="sm">{driver.fullName}</Heading>
                  <Body muted small>
                    {driver.universityShortName} · {driver.phone}
                  </Body>
                </View>
              </Row>
              <StatusBadge status={driver.verificationStatus} />
            </Row>

            <KeyValue label="Licence" value={driver.licenseNumber ?? '—'} />
            <KeyValue label="Expiry" value={driver.licenseExpiry ? shortDate(driver.licenseExpiry) : '—'} />
            <KeyValue label="NIDA" value={driver.nationalId ?? '—'} />
            <KeyValue
              label="Vehicle"
              value={
                driver.plateNumber
                  ? `${driver.make ?? ''} ${driver.model ?? ''} · ${driver.plateNumber}`
                  : 'Not submitted'
              }
            />
            <KeyValue
              label="Performance"
              value={`${driver.completedRides} rides · ${Number(driver.ratingAvg).toFixed(1)}★`}
            />

            {driver.rejectionReason && (
              <Notice tone="warning">
                Rejected earlier: {driver.rejectionReason}
              </Notice>
            )}

            <View style={{ gap: 6 }}>
              <Body small>Documents</Body>
              {(driver.documents?.length ?? 0) === 0 ? (
                <Body muted small>
                  No documents uploaded.
                </Body>
              ) : (
                driver.documents?.map((doc) => (
                  <Pressable
                    key={doc.id}
                    onPress={() => {
                      const url = mediaUrl(doc.fileUrl);
                      if (url) void Linking.openURL(url);
                    }}
                    style={{ paddingVertical: 4 }}>
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>
                      {docLabels[doc.type] ?? doc.type} · {doc.status}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            {driver.verificationStatus === 'PENDING' &&
              (rejectingId === driver.userId ? (
                <View style={{ gap: 10 }}>
                  <Field
                    label="Rejection reason"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Tell the driver what to fix"
                    multiline
                  />
                  <Row>
                    <Button
                      label="Confirm reject"
                      variant="danger"
                      size="sm"
                      disabled={reason.trim().length < 3 || busyId === driver.userId}
                      onPress={() => void verify(driver, false, reason.trim())}
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
                    label="Approve"
                    size="sm"
                    disabled={busyId === driver.userId}
                    onPress={() => void verify(driver, true)}
                  />
                  <Button
                    label="Reject"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setRejectingId(driver.userId);
                      setReason('');
                    }}
                  />
                </Row>
              ))}
          </Card>
        ))
      )}
    </Workspace>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
