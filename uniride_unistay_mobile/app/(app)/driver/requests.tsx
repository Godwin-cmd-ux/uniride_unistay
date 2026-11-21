import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Empty, LoadingView, Notice, Row } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { distanceLabel, timeAgo, tzs } from '@/lib/format';
import type { DriverRequest } from '@/lib/types';

export default function DriverRequests() {
  const theme = useTheme();
  const { push } = useToast();
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ requests: DriverRequest[]; notice: string | null }>(
        '/api/driver/requests',
      );
      setRequests(data.requests);
      setNotice(data.notice ?? '');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 12000);
    return () => clearInterval(timer);
  }, [load]);

  function accept(request: DriverRequest) {
    Alert.alert(
      'Accept ride',
      `${request.pickupLabel} → ${request.destLabel} · ${tzs(request.estimatedFare)}`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setBusy(request.id);
            try {
              await api(`/api/driver/rides/${request.id}/accept`, { method: 'POST' });
              push('Ride accepted. Head to the pickup point.', 'success');
              await load();
            } catch (error) {
              push(error instanceof Error ? error.message : 'Could not accept ride', 'error');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <Workspace
      role="DRIVER"
      title="Ride requests"
      subtitle="Open requests from students at your campus. The queue refreshes every few seconds.">
      {notice ? <Notice tone="warning">{notice}</Notice> : null}

      {loading ? (
        <LoadingView label="Loading requests" />
      ) : requests.length === 0 ? (
        <Card>
          <Empty
            icon="bicycle-outline"
            title="No open requests"
            description="Go online from the driver home and stay nearby to catch the next trip."
          />
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <Row align="space-between">
              <Body bold small>
                {request.studentFirstName} needs a ride
              </Body>
              <Body small style={{ color: theme.textMuted }}>
                {timeAgo(request.requestedAt)}
              </Body>
            </Row>
            <Body small>
              {request.pickupLabel} → {request.destLabel}
            </Body>
            <Row>
              <Body bold>{tzs(request.estimatedFare)}</Body>
              <Body muted small>
                {distanceLabel(request.distanceM)} trip
                {request.driverDistanceToPickupM !== null
                  ? ` · ${distanceLabel(request.driverDistanceToPickupM)} to pickup`
                  : ''}
              </Body>
            </Row>
            <Button
              label={busy === request.id ? 'Accepting…' : 'Accept ride'}
              onPress={() => accept(request)}
              disabled={busy !== null}
              size="sm"
            />
          </Card>
        ))
      )}
    </Workspace>
  );
}
