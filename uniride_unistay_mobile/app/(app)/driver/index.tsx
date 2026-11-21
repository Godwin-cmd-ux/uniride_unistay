import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, Heading, LoadingView, Notice, Row, Stat, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { distanceLabel, driverStatusLabels, tzs } from '@/lib/format';
import type { DriverProfile, DocumentItem, DriverRequest, Ride } from '@/lib/types';

type Stats = {
  todayEarnings: number;
  weekEarnings: number;
  totalRideEarnings: number;
  completedRides: number;
  todayRides: number;
};

export default function DriverHome() {
  const theme = useTheme();
  const router = useRouter();
  const { push } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [active, setActive] = useState<Ride | null>(null);
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [statData, activeData, requestData] = await Promise.all([
      api<{ stats: Stats; profile: DriverProfile; documents: DocumentItem[] }>('/api/driver/stats'),
      api<Ride | null>('/api/driver/active').catch(() => null),
      api<{ requests: DriverRequest[]; notice: string | null }>('/api/driver/requests').catch(() => ({
        requests: [],
        notice: null,
      })),
    ]);
    setStats(statData.stats);
    setProfile(statData.profile);
    setDocuments(statData.documents);
    setActive(activeData);
    setRequests(requestData.requests);
    setNotice(requestData.notice ?? '');
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (profile?.status !== 'IDLE') return;
    const timer = setInterval(() => {
      api('/api/driver/heartbeat', { method: 'POST', body: {} }).catch(() => undefined);
    }, 60000);
    return () => clearInterval(timer);
  }, [profile?.status]);

  async function toggleOnline() {
    if (!profile) return;
    setBusy(true);
    try {
      const next = profile.status === 'OFFLINE' ? 'IDLE' : 'OFFLINE';
      await api('/api/driver/status', { method: 'PATCH', body: { status: next } });
      push(next === 'IDLE' ? 'You are online and visible to students.' : 'You are offline.', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not change status', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function tripAction(id: string, action: 'depart' | 'start' | 'complete') {
    const labels = {
      depart: 'Start heading to pickup?',
      start: 'Start the trip once the student is aboard.',
      complete: 'Complete the trip and record the cash fare?',
    };
    Alert.alert('Confirm', labels[action], [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await api(`/api/driver/rides/${id}/${action}`, { method: 'POST' });
            push(
              action === 'complete' ? 'Trip completed. Earnings recorded.' : 'Trip updated',
              'success',
            );
            await load();
          } catch (error) {
            push(error instanceof Error ? error.message : 'Could not update trip', 'error');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Workspace role="DRIVER" title="Driver workspace">
        <LoadingView label="Loading dashboard" />
      </Workspace>
    );
  }

  const verified = profile?.verificationStatus === 'VERIFIED';

  return (
    <Workspace
      role="DRIVER"
      title={profile?.fullName.split(' ')[0] ? `Karibu, ${profile.fullName.split(' ')[0]}` : 'Driver workspace'}
      subtitle={`${profile?.universityShortName ?? 'Campus'} · ${driverStatusLabels[profile?.status ?? 'OFFLINE']}`}>
      {!verified ? (
        <Notice tone="warning">
          {profile?.verificationStatus === 'REJECTED'
            ? `Verification rejected: ${profile.rejectionReason ?? 'Update your documents and resubmit.'}`
            : 'Your documents are under review. You can go online once verified.'}
        </Notice>
      ) : null}

      <Card style={{ borderColor: verified ? theme.primary : theme.border }}>
        <Row align="space-between">
          <View style={{ flex: 1 }}>
            <Body bold>{verified ? 'You are visible to students' : 'Verification needed'}</Body>
            <Body muted small>
              {profile?.vehicleType
                ? `${profile.make} ${profile.model} · ${profile.plateNumber}`
                : 'Register your vehicle to receive requests.'}
            </Body>
          </View>
          <StatusBadge status={profile?.status ?? 'OFFLINE'} />
        </Row>
        <Row>
          <Button
            label={
              busy
                ? 'Saving…'
                : !verified
                  ? 'Open documents'
                  : profile?.status === 'OFFLINE'
                    ? 'Go online'
                    : 'Go offline'
            }
            onPress={() =>
              verified ? void toggleOnline() : router.push('/driver/vehicle')
            }
            disabled={busy}
          />
          <Button
            label="Requests"
            variant="secondary"
            onPress={() => router.push('/driver/requests')}
          />
        </Row>
      </Card>

      <Row gap={10}>
        <Stat label="Today" value={tzs(stats?.todayEarnings ?? 0)} hint={`${stats?.todayRides ?? 0} trips`} />
        <Stat label="This week" value={tzs(stats?.weekEarnings ?? 0)} hint="Net of commission" />
        <Stat label="All time" value={tzs(stats?.totalRideEarnings ?? 0)} hint={`${stats?.completedRides ?? 0} completed`} />
      </Row>

      {active ? (
        <Card style={{ borderColor: theme.primary }}>
          <Row align="space-between">
            <Heading size="sm">Active trip</Heading>
            <StatusBadge status={active.status} />
          </Row>
          <Body small>
            {active.pickupLabel} → {active.destLabel}
          </Body>
          <Body muted small>
            {active.studentName} · {active.studentPhone} · {distanceLabel(active.distanceM)} ·{' '}
            {tzs(active.estimatedFare)}
          </Body>
          <Row>
            {active.status === 'ACCEPTED' ? (
              <Button label="Head to pickup" size="sm" onPress={() => void tripAction(active.id, 'depart')} />
            ) : null}
            {['ACCEPTED', 'DRIVER_EN_ROUTE'].includes(active.status) ? (
              <Button
                label="Start trip"
                size="sm"
                variant="secondary"
                onPress={() => void tripAction(active.id, 'start')}
              />
            ) : null}
            {active.status === 'ON_TRIP' ? (
              <Button label="Complete trip" size="sm" onPress={() => void tripAction(active.id, 'complete')} />
            ) : null}
          </Row>
        </Card>
      ) : (
        <Card>
          <Row align="space-between">
            <Body bold>Open requests nearby</Body>
            <Button label="See all" size="sm" variant="ghost" onPress={() => router.push('/driver/requests')} />
          </Row>
          {notice ? <Notice tone="warning">{notice}</Notice> : null}
          {requests.length === 0 ? (
            <Empty
              icon="bicycle-outline"
              title="No requests right now"
              description="Stay online — new campus trips will appear here automatically."
            />
          ) : (
            requests.slice(0, 3).map((request) => (
              <Card key={request.id} style={{ backgroundColor: theme.surface }}>
                <Body bold small>
                  {request.pickupLabel} → {request.destLabel}
                </Body>
                <Body muted small>
                  {request.studentFirstName} · {distanceLabel(request.distanceM)} ·{' '}
                  {tzs(request.estimatedFare)}
                  {request.driverDistanceToPickupM !== null
                    ? ` · ${distanceLabel(request.driverDistanceToPickupM)} away`
                    : ''}
                </Body>
              </Card>
            ))
          )}
        </Card>
      )}

      <Card>
        <Body bold>Documents</Body>
        {documents.length === 0 ? (
          <Body muted small>
            No documents submitted yet. Add your licence and national ID to get verified.
          </Body>
        ) : (
          documents.map((document) => (
            <Row key={document.id} align="space-between">
              <Body small>{document.type.replaceAll('_', ' ').toLowerCase()}</Body>
              <StatusBadge status={document.status} />
            </Row>
          ))
        )}
        <Button
          label="Manage vehicle & documents"
          size="sm"
          variant="secondary"
          onPress={() => router.push('/driver/vehicle')}
        />
      </Card>
    </Workspace>
  );
}
