import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Card, Chips, Empty, Field, LoadingView, Row } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { distanceLabel, mediaUrl, propertyTypeLabels, tzs } from '@/lib/format';
import type { Paginated, PropertySummary } from '@/lib/types';

export default function StudentStays() {
  const theme = useTheme();
  const router = useRouter();
  const { universities, selected, setSelectedId } = useUniversity();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [items, setItems] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        universityId: selected.id,
        page: '1',
        pageSize: '20',
        sort: 'newest',
      });
      if (type) params.set('type', type);
      if (search.trim()) params.set('search', search.trim());
      api<Paginated<PropertySummary>>(`/api/public/properties?${params.toString()}`, {
        auth: false,
      })
        .then((data) => {
          if (active) setItems(data.items);
        })
        .catch(() => {
          if (active) setItems([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selected, type, search]);

  return (
    <Workspace
      role="STUDENT"
      title="Student stays"
      subtitle="Neighbourhoods near campus, verified by our team before they go live.">
      <Chips
        value={selected?.id ?? ''}
        onChange={setSelectedId}
        options={universities.map((item) => ({ value: item.id, label: item.shortName }))}
      />
      <Field
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Hostel name, area or amenity"
      />
      <Chips
        value={type}
        onChange={setType}
        options={[
          { value: '', label: 'All types' },
          { value: 'HOSTEL', label: 'Hostels' },
          { value: 'APARTMENT', label: 'Apartments' },
          { value: 'HOUSE', label: 'Houses' },
          { value: 'ROOM', label: 'Rooms' },
        ]}
      />

      {loading ? (
        <LoadingView label="Loading stays" />
      ) : items.length === 0 ? (
        <Card>
          <Empty
            icon="bed-outline"
            title="No stays match"
            description="Try another room type, clear the search or switch campus."
          />
        </Card>
      ) : (
        items.map((property) => (
          <Pressable key={property.id} onPress={() => router.push(`/student/stay/${property.id}` as never)}>
            <Card>
              {property.imageUrl ? (
                <Image
                  source={{ uri: mediaUrl(property.imageUrl) }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.image, { backgroundColor: theme.cardMuted }]} />
              )}
              <Row align="space-between">
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>
                    {property.name}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    {propertyTypeLabels[property.type]} · {property.addressArea} ·{' '}
                    {distanceLabel(property.distanceM)} from campus
                  </Text>
                </View>
                {property.verifiedAt ? (
                  <Ionicons name="shield-checkmark" size={18} color={theme.success} />
                ) : null}
              </Row>
              <Body muted small numberOfLines={2}>
                {property.description}
              </Body>
              <Row align="space-between">
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {tzs(property.priceFrom)}
                  <Text style={{ color: theme.textMuted, fontWeight: '400', fontSize: 12 }}>/month</Text>
                </Text>
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>
                  {property.availableUnits} unit{property.availableUnits === 1 ? '' : 's'} open →
                </Text>
              </Row>
            </Card>
          </Pressable>
        ))
      )}
    </Workspace>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 150, borderRadius: 14 },
});
