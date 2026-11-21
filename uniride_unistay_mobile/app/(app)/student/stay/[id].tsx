import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Chips, Field, Heading, LoadingView, Notice, Row, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { datePlus, distanceLabel, mediaUrl, propertyTypeLabels, shortDate, tzs } from '@/lib/format';
import type { PropertyDetail } from '@/lib/types';

export default function StayDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { push } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<{ property: PropertyDetail; privacy: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitId, setUnitId] = useState('');
  const [moveInDate, setMoveInDate] = useState(datePlus(7));
  const [duration, setDuration] = useState('3');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ property: PropertyDetail; privacy: string }>(`/api/public/properties/${id}`, {
      auth: false,
    })
      .then((result) => {
        setData(result);
        setUnitId(result.property.units[0]?.id ?? '');
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function inquire() {
    if (!data || !unitId) return;
    setBusy(true);
    try {
      await api('/api/student/inquiries', {
        method: 'POST',
        body: {
          propertyId: data.property.id,
          bookableUnitId: unitId,
          moveInDate,
          durationMonths: Number(duration),
          message: message.trim(),
        },
      });
      push('Inquiry sent. The owner will reply shortly.', 'success');
      router.push('/student/inquiries');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not send inquiry', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace role="STUDENT" title="Stay details" showTabs={false}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={17} color={theme.textMuted} />
        <Text style={{ color: theme.textMuted }}>Back to stays</Text>
      </Pressable>

      {loading ? (
        <LoadingView label="Loading property" />
      ) : !data ? (
        <Card>
          <Notice tone="danger">This listing is no longer available.</Notice>
        </Card>
      ) : (
        <>
          {data.property.images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {data.property.images.map((image) => (
                <Image
                  key={image.id}
                  source={{ uri: mediaUrl(image.url) }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.image, { backgroundColor: theme.cardMuted }]} />
          )}

          <View style={{ gap: 6 }}>
            <Row align="space-between">
              <Heading size="md">{data.property.name}</Heading>
              {data.property.verifiedAt ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="shield-checkmark" size={15} color={theme.success} />
                  <Text style={{ color: theme.success, fontSize: 11, fontWeight: '700' }}>Verified</Text>
                </View>
              ) : null}
            </Row>
            <Body muted small>
              {propertyTypeLabels[data.property.type]} · {data.property.addressArea} ·{' '}
              {distanceLabel(data.property.distanceM)} from {data.property.universityShortName}
            </Body>
            <Body>
              {tzs(data.property.priceFrom)}
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>/month</Text>
            </Body>
          </View>

          <Card>
            <Body bold small>
              About this stay
            </Body>
            <Body muted small>
              {data.property.description}
            </Body>
            <Row>
              {data.property.amenities.map((amenity) => (
                <View
                  key={amenity}
                  style={{
                    backgroundColor: theme.primarySoft,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}>
                  <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '600' }}>
                    {amenity}
                  </Text>
                </View>
              ))}
            </Row>
            <Body muted small>
              Exact address is shared by the host once your inquiry is accepted.
            </Body>
          </Card>

          <Card>
            <Body bold>Available units</Body>
            {data.property.units.length === 0 ? (
              <Body muted small>
                All units are currently taken. Check back next semester.
              </Body>
            ) : (
              data.property.units.map((unit) => (
                <Pressable
                  key={unit.id}
                  onPress={() => setUnitId(unit.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: unitId === unit.id ? theme.primary : theme.border,
                    backgroundColor: unitId === unit.id ? theme.primarySoft : theme.surface,
                    borderRadius: theme.radius.md,
                    padding: 12,
                    gap: 2,
                  }}>
                  <Row align="space-between">
                    <Body bold small>
                      {unit.label}
                    </Body>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                      {tzs(unit.pricePerMonth)}/mo
                    </Text>
                  </Row>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                    {unit.roomName ? `${unit.roomName} · ` : ''}
                    {unit.bedLabel ? `${unit.bedLabel} · ` : ''}
                    {unit.status.toLowerCase()}
                  </Text>
                </Pressable>
              ))
            )}
          </Card>

          {data.property.units.length > 0 ? (
            <Card>
              <Body bold>Send an inquiry</Body>
              <Body muted small>
                No payment now. The host replies to arrange a viewing or confirm the room.
              </Body>
              <Chips
                value={duration}
                onChange={(value) => setDuration(value)}
                options={[
                  { value: '1', label: '1 month' },
                  { value: '3', label: '3 months' },
                  { value: '6', label: '6 months' },
                  { value: '12', label: '1 year' },
                ]}
              />
              <Field
                label="Move-in date"
                value={moveInDate}
                onChangeText={setMoveInDate}
                placeholder="YYYY-MM-DD"
              />
              <Field
                label="Message to the host"
                value={message}
                onChangeText={setMessage}
                multiline
                placeholder="Tell the host about yourself, your course and when you would like to view."
              />
              <Button
                label={busy ? 'Sending…' : 'Send inquiry'}
                onPress={() => void inquire()}
                disabled={busy || !unitId}
                block
              />
            </Card>
          ) : null}

          {data.property.reviews.length > 0 ? (
            <Card>
              <Body bold small>
                Student reviews
              </Body>
              {data.property.reviews.map((review, index) => (
                <View key={index} style={{ gap: 2 }}>
                  <Row>
                    <Text style={{ color: theme.gold, fontWeight: '700' }}>
                      {'★'.repeat(review.rating)}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                      {review.reviewerName} · {shortDate(review.createdAt)}
                    </Text>
                  </Row>
                  <Body muted small>
                    {review.comment}
                  </Body>
                </View>
              ))}
            </Card>
          ) : null}

          <StatusBadge status="VERIFIED" label={`Listed by ${data.property.ownerDisplayName}`} />
        </>
      )}
    </Workspace>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  image: { width: 280, height: 190, borderRadius: 18 },
});
