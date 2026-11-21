import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  Body,
  Card,
  Chips,
  Empty,
  LoadingView,
  Row,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { distanceLabel, rideStatusLabels, tzs } from '@/lib/format';
import type { Ride } from '@/lib/types';

const filters = [
  { value: '', label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'ON_TRIP', label: 'On trip' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminRides() {
  const { push } = useToast();
  const [filter, setFilter] = useState('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRides(await api<Ride[]>('/api/admin/rides'));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load rides', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = filter ? rides.filter((ride) => ride.status === filter) : rides;

  return (
    <Workspace
      role="ADMIN"
      title="Ride log"
      subtitle="Every request, driver assignment and commission across campuses.">
      <Chips options={filters} value={filter} onChange={setFilter} />

      {loading ? (
        <LoadingView label="Loading rides" />
      ) : visible.length === 0 ? (
        <Empty icon="car-outline" title="No rides in this view" description="Ride activity appears here as students book." />
      ) : (
        visible.map((ride) => (
          <Card key={ride.id}>
            <Row align="space-between">
              <View style={{ flex: 1 }}>
                <Body bold>
                  {ride.pickupLabel} → {ride.destLabel}
                </Body>
                <Body muted small>
                  {ride.universityShortName} · {distanceLabel(ride.distanceM)} ·{' '}
                  {rideStatusLabels[ride.status]}
                </Body>
              </View>
              <StatusBadge status={ride.status} />
            </Row>
            <Body small>
              {ride.studentName} · {ride.studentPhone}
            </Body>
            <Body muted small>
              {ride.driverName
                ? `Driver: ${ride.driverName}${ride.driverPhone ? ` · ${ride.driverPhone}` : ''}`
                : 'No driver assigned'}
            </Body>
            <Row align="space-between">
              <Body small>Fare {tzs(ride.finalFare ?? ride.estimatedFare)}</Body>
              <Body muted small>
                Commission {ride.commissionAmount != null ? tzs(ride.commissionAmount) : '—'}
              </Body>
            </Row>
          </Card>
        ))
      )}
    </Workspace>
  );
}
