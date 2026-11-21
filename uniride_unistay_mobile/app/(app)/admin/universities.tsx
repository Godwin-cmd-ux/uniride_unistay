import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import {
  Body,
  Card,
  Chips,
  Empty,
  Field,
  Heading,
  LoadingView,
  Row,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import type { University } from '@/lib/types';

type Draft = {
  id: string | null;
  name: string;
  shortName: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
  driverRadiusKm: string;
  propertyRadiusKm: string;
  status: 'ACTIVE' | 'INACTIVE';
};

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const blank = (): Draft => ({
  id: null,
  name: '',
  shortName: '',
  city: '',
  region: '',
  latitude: '',
  longitude: '',
  driverRadiusKm: '5',
  propertyRadiusKm: '10',
  status: 'ACTIVE',
});

function toDraft(university: University): Draft {
  return {
    id: university.id,
    name: university.name,
    shortName: university.shortName,
    city: university.city,
    region: university.region,
    latitude: String(university.latitude),
    longitude: String(university.longitude),
    driverRadiusKm: String(university.driverRadiusKm),
    propertyRadiusKm: String(university.propertyRadiusKm),
    status: university.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
}

export default function AdminUniversities() {
  const { push } = useToast();
  const [items, setItems] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api<University[]>('/api/admin/universities'));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load campuses', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!draft) return;
    const numbers = {
      latitude: Number(draft.latitude),
      longitude: Number(draft.longitude),
      driverRadiusKm: Number(draft.driverRadiusKm),
      propertyRadiusKm: Number(draft.propertyRadiusKm),
    };
    if (
      draft.name.trim().length < 3 ||
      draft.shortName.trim().length < 2 ||
      draft.city.trim().length < 2 ||
      draft.region.trim().length < 2 ||
      Object.values(numbers).some((value) => !Number.isFinite(value))
    ) {
      push('Check the name, city, coordinates and radii', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        shortName: draft.shortName.trim(),
        city: draft.city.trim(),
        region: draft.region.trim(),
        ...numbers,
        status: draft.status,
      };
      if (draft.id) {
        await api(`/api/admin/universities/${draft.id}`, { method: 'PATCH', body });
      } else {
        await api('/api/admin/universities', { method: 'POST', body });
      }
      push(draft.id ? 'Campus updated' : 'Campus added', 'success');
      setDraft(null);
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save campus', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Workspace
      role="ADMIN"
      title="Campuses"
      subtitle="Service zones, coordinates and radius controls for every university.">
      {draft ? (
        <Card>
          <Heading size="sm">{draft.id ? 'Edit campus' : 'New campus'}</Heading>
          <Field label="University name" value={draft.name} onChangeText={(value) => set('name', value)} />
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Short name" value={draft.shortName} onChangeText={(value) => set('shortName', value)} autoCapitalize="characters" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="City" value={draft.city} onChangeText={(value) => set('city', value)} />
            </View>
          </Row>
          <Field label="Region" value={draft.region} onChangeText={(value) => set('region', value)} />
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Latitude" value={draft.latitude} onChangeText={(value) => set('latitude', value)} keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Longitude" value={draft.longitude} onChangeText={(value) => set('longitude', value)} keyboardType="numbers-and-punctuation" />
            </View>
          </Row>
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Driver radius (km)" value={draft.driverRadiusKm} onChangeText={(value) => set('driverRadiusKm', value)} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Property radius (km)" value={draft.propertyRadiusKm} onChangeText={(value) => set('propertyRadiusKm', value)} keyboardType="number-pad" />
            </View>
          </Row>
          <Body small>Status</Body>
          <Chips options={statusOptions} value={draft.status} onChange={(value) => set('status', value as Draft['status'])} />
          <Row>
            <Button label={saving ? 'Saving…' : 'Save campus'} disabled={saving} onPress={() => void save()} />
            <Button label="Cancel" variant="ghost" onPress={() => setDraft(null)} />
          </Row>
        </Card>
      ) : (
        <Button label="Add campus" size="sm" onPress={() => setDraft(blank())} />
      )}

      {loading ? (
        <LoadingView label="Loading campuses" />
      ) : items.length === 0 ? (
        <Empty icon="school-outline" title="No campuses yet" description="Add the first university to open the platform." />
      ) : (
        items.map((university) => (
          <Card key={university.id}>
            <Row align="space-between">
              <View style={{ flex: 1 }}>
                <Heading size="sm">{university.name}</Heading>
                <Body muted small>
                  {university.shortName} · {university.city}, {university.region}
                </Body>
              </View>
              <StatusBadge status={university.status ?? 'ACTIVE'} />
            </Row>
            <Body small>
              {university.userCount ?? 0} users · {university.propertyCount ?? 0} properties ·{' '}
              {university.driverCount ?? 0} drivers
            </Body>
            <Body muted small>
              {university.latitude.toFixed(4)}, {university.longitude.toFixed(4)} · driver{' '}
              {university.driverRadiusKm} km · property {university.propertyRadiusKm} km
            </Body>
            <Button
              label="Edit campus"
              size="sm"
              variant="secondary"
              onPress={() => setDraft(toDraft(university))}
            />
          </Card>
        ))
      )}
    </Workspace>
  );
}
