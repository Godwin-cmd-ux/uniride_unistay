import { useCallback, useEffect, useState } from 'react';

import { Body, Card, Empty, LoadingView, Row, SegTabs, Stat, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { dateTime, distanceLabel, tzs } from '@/lib/format';
import type { DriverProfile, Ride } from '@/lib/types';

type Stats = {
  todayEarnings: number;
  weekEarnings: number;
  totalRideEarnings: number;
  completedRides: number;
  todayRides: number;
};

export default function DriverTrips() {
  const theme = useTheme();
  const [rides, setRides] = useState<Ride[]>([]);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('COMPLETED');

  const load = useCallback(async () => {
    const [rideData, statData] = await Promise.all([
      api<Ride[]>('/api/driver/rides').catch(() => []),
      api<{ stats: Stats; profile: DriverProfile }>('/api/driver/stats').catch(() => null),
    ]);
    setRides(rideData);
    if (statData) {
      setStats(statData.stats);
      setProfile(statData.profile);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = rides.filter((ride) => {
    if (tab === 'ALL') return true;
    if (tab === 'CANCELLED') return ride.status === 'CANCELLED';
    return ride.status === 'COMPLETED';
  });

  return (
    <Workspace
      role="DRIVER"
      title="Trip history"
      subtitle={`Rating ${profile?.ratingAvg ? `${profile.ratingAvg.toFixed(1)}★` : '—'} · ${profile?.completedRides ?? 0} completed rides`}>
      <Row gap={10}>
        <Stat label="Today" value={tzs(stats?.todayEarnings ?? 0)} hint={`${stats?.todayRides ?? 0} trips`} />
        <Stat label="This week" value={tzs(stats?.weekEarnings ?? 0)} hint="Your net earnings" />
        <Stat label="Lifetime" value={tzs(stats?.totalRideEarnings ?? 0)} />
      </Row>

      <SegTabs
        options={[
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'CANCELLED', label: 'Cancelled' },
          { value: 'ALL', label: 'All' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <LoadingView label="Loading trips" />
      ) : visible.length === 0 ? (
        <Card>
          <Empty
            icon="navigate-outline"
            title="No trips in this view"
            description="Accept a request and complete the trip to see it here."
          />
        </Card>
      ) : (
        visible.map((ride) => (
          <Card key={ride.id}>
            <Row align="space-between">
              <Body bold small>
                {ride.pickupLabel} → {ride.destLabel}
              </Body>
              <StatusBadge status={ride.status} />
            </Row>
            <Body muted small>
              {dateTime(ride.requestedAt)} · {distanceLabel(ride.distanceM)} · {ride.studentName}
            </Body>
            <Row>
              <Body bold>{tzs(ride.finalFare ?? ride.estimatedFare)}</Body>
              {ride.commissionAmount !== null ? (
                <Body muted small>
                  Commission {tzs(ride.commissionAmount)} · You earned {tzs(ride.driverEarnings)}
                </Body>
              ) : null}
            </Row>
            {ride.driverRating ? (
              <Body small style={{ color: theme.gold }}>
                {'★'.repeat(ride.driverRating)}
              </Body>
            ) : null}
          </Card>
        ))
      )}
    </Workspace>
  );
}
