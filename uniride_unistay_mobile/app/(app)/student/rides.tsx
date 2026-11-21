import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import {
  Body,
  Card,
  Empty,
  Field,
  Heading,
  LoadingView,
  Row,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useUniversity } from '@/context/university';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { dateTime, distanceLabel, rideStatusLabels, tzs } from '@/lib/format';
import type { Ride } from '@/lib/types';

const presetRoutes = [
  { pickup: 'Campus main gate', dest: 'Lecture halls' },
  { pickup: 'Student hostel', dest: 'Campus main gate' },
  { pickup: 'Campus main gate', dest: 'Town centre' },
  { pickup: 'Market', dest: 'Campus main gate' },
];

type Estimate = { estimatedFare: number; distanceM: number; approximate: boolean };

export default function StudentRides() {
  const theme = useTheme();
  const { selected } = useUniversity();
  const { push } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickup, setPickup] = useState('Campus main gate');
  const [dest, setDest] = useState('Town centre');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      setRides(await api<Ride[]>('/api/rides/mine'));
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const live = useMemo(
    () => rides.find((ride) => ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP'].includes(ride.status)),
    [rides],
  );

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, live ? 9000 : 25000);
    return () => clearInterval(timer);
  }, [load, live]);

  useEffect(() => {
    if (pickup.trim().length < 2 || dest.trim().length < 2) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(() => {
      api<Estimate>('/api/rides/estimate', {
        method: 'POST',
        auth: false,
        body: {},
      })
        .then(setEstimate)
        .catch(() => setEstimate(null));
    }, 250);
    return () => clearTimeout(timer);
  }, [pickup, dest]);

  async function requestRide() {
    setBusy(true);
    try {
      await api('/api/rides', {
        method: 'POST',
        body: {
          universityId: selected?.id,
          pickupLabel: pickup.trim(),
          destLabel: dest.trim(),
        },
      });
      push('Ride requested. Looking for a driver near you.', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not request ride', 'error');
    } finally {
      setBusy(false);
    }
  }

  function cancelRide(ride: Ride) {
    Alert.alert('Cancel ride', 'Cancel this ride request?', [
      { text: 'Keep ride', style: 'cancel' },
      {
        text: 'Cancel ride',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/rides/${ride.id}/cancel`, {
              method: 'POST',
              body: { reason: 'Cancelled from mobile app' },
            });
            push('Ride cancelled', 'success');
            await load();
          } catch (error) {
            push(error instanceof Error ? error.message : 'Could not cancel ride', 'error');
          }
        },
      },
    ]);
  }

  async function rate(ride: Ride) {
    const rating = ratings[ride.id];
    if (!rating) return;
    try {
      await api(`/api/rides/${ride.id}/rate`, { method: 'POST', body: { rating } });
      push('Thanks for rating your driver', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save rating', 'error');
    }
  }

  return (
    <Workspace
      role="STUDENT"
      title="Campus rides"
      subtitle={`Short trips around ${selected?.shortName ?? 'campus'}, priced per kilometre.`}>
      {live ? (
        <Card style={{ borderColor: theme.primary }}>
          <Row align="space-between">
            <Heading size="sm">
              {live.status === 'REQUESTED' ? 'Finding a driver' : 'Your ride'}
            </Heading>
            <StatusBadge status={live.status} />
          </Row>
          <Body small>
            {live.pickupLabel} → {live.destLabel}
          </Body>
          <Row>
            <Body bold>{tzs(live.finalFare ?? live.estimatedFare)}</Body>
            <Body muted small>
              {distanceLabel(live.distanceM)} · {rideStatusLabels[live.status]}
            </Body>
          </Row>
          {live.driverName ? (
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: theme.radius.md,
                padding: 12,
                gap: 4,
              }}>
              <Body bold small>
                {live.driverName} · {live.driverRating ? `${live.driverRating.toFixed(1)}★` : 'New driver'}
              </Body>
              <Body muted small>
                {live.vehicleMake} {live.vehicleModel} · {live.vehiclePlate}
              </Body>
              <Body small>Call {live.driverPhone}</Body>
            </View>
          ) : null}
          <Row>
            <Button label="Refresh" size="sm" variant="secondary" onPress={() => void load()} />
            {['REQUESTED', 'ACCEPTED'].includes(live.status) ? (
              <Button label="Cancel ride" size="sm" variant="danger" onPress={() => cancelRide(live)} />
            ) : null}
          </Row>
        </Card>
      ) : (
        <Card>
          <Heading size="sm">Request a ride</Heading>
          <Field label="Pickup" value={pickup} onChangeText={setPickup} placeholder="Where are you?" />
          <Field label="Destination" value={dest} onChangeText={setDest} placeholder="Where to?" />
          <Row>
            {presetRoutes.map((route) => (
              <Pressable
                key={`${route.pickup}-${route.dest}`}
                onPress={() => {
                  setPickup(route.pickup);
                  setDest(route.dest);
                }}
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                  {route.pickup} → {route.dest}
                </Text>
              </Pressable>
            ))}
          </Row>
          <View
            style={{
              backgroundColor: theme.primarySoft,
              borderRadius: theme.radius.md,
              padding: 12,
              gap: 3,
            }}>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 18 }}>
              {estimate ? tzs(estimate.estimatedFare) : 'Calculating fare…'}
            </Text>
            <Text style={{ color: theme.primary, fontSize: 11 }}>
              {estimate
                ? `${distanceLabel(estimate.distanceM)} · ${estimate.approximate ? 'campus estimate' : 'distance based'}`
                : 'Add pickup and destination'}
            </Text>
          </View>
          <Button
            label={busy ? 'Requesting…' : 'Request this ride'}
            onPress={() => void requestRide()}
            disabled={busy || pickup.trim().length < 2 || dest.trim().length < 2}
            block
          />
          <Body muted small>
            Pay the driver the agreed fare in cash. UNIRIDE records the trip for safety and receipts.
          </Body>
        </Card>
      )}

      <View style={{ gap: 10 }}>
        <Heading size="sm">Recent rides</Heading>
        {loading ? (
          <LoadingView label="Loading rides" />
        ) : rides.length === 0 ? (
          <Card>
            <Empty
              icon="bicycle-outline"
              title="No rides yet"
              description="Request your first campus trip above."
            />
          </Card>
        ) : (
          rides.map((ride) => (
            <Card key={ride.id}>
              <Row align="space-between">
                <Body bold small>
                  {ride.pickupLabel} → {ride.destLabel}
                </Body>
                <StatusBadge status={ride.status} />
              </Row>
              <Body muted small>
                {dateTime(ride.requestedAt)} · {distanceLabel(ride.distanceM)} ·{' '}
                {tzs(ride.finalFare ?? ride.estimatedFare)}
              </Body>
              {ride.driverName ? (
                <Body muted small>
                  Driver: {ride.driverName} {ride.vehiclePlate ? `· ${ride.vehiclePlate}` : ''}
                </Body>
              ) : null}
              {ride.status === 'COMPLETED' ? (
                <View style={{ gap: 6 }}>
                  <Row>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setRatings({ ...ratings, [ride.id]: star })}>
                        <Ionicons
                          name={star <= (ratings[ride.id] ?? 0) ? 'star' : 'star-outline'}
                          size={20}
                          color={theme.gold}
                        />
                      </Pressable>
                    ))}
                  </Row>
                  {ratings[ride.id] ? (
                    <Button label="Submit rating" size="sm" variant="secondary" onPress={() => void rate(ride)} />
                  ) : null}
                </View>
              ) : null}
              {ride.cancellationReason ? (
                <Body muted small>
                  {ride.cancellationReason}
                </Body>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </Workspace>
  );
}
