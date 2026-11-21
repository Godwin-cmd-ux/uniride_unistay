import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Field, Heading, LoadingView, Notice, Row, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api, apiUpload } from '@/lib/api';
import { mediaUrl, propertyTypeLabels, tzs } from '@/lib/format';
import type { OwnerPropertyDetail } from '@/lib/types';

export default function OwnerPropertyManager() {
  const theme = useTheme();
  const router = useRouter();
  const { push } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<OwnerPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addressArea, setAddressArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomPrice, setRoomPrice] = useState('');
  const [roomBeds, setRoomBeds] = useState('1');
  const [addingRoom, setAddingRoom] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await api<OwnerPropertyDetail>(`/api/owner/properties/${id}`);
      setData(detail);
      setName(detail.property.name);
      setDescription(detail.property.description);
      setAddressArea(detail.property.addressArea);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load property', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDetails() {
    if (!data) return;
    setSaving(true);
    try {
      await api(`/api/owner/properties/${data.property.id}`, {
        method: 'PATCH',
        body: { name, description, addressArea },
      });
      push('Listing updated', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update listing', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addPhoto() {
    if (!data) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      push('Allow photo access to add listing photos', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const uploaded = await apiUpload(
        result.assets[0].uri,
        'property.jpg',
        result.assets[0].mimeType ?? 'image/jpeg',
      );
      await api(`/api/owner/properties/${data.property.id}/images`, {
        method: 'POST',
        body: { url: uploaded.url },
      });
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not add photo', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(imageId: string) {
    try {
      await api(`/api/owner/images/${imageId}`, { method: 'DELETE' });
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not remove photo', 'error');
    }
  }

  async function addRoom() {
    if (!data) return;
    setAddingRoom(true);
    try {
      await api(`/api/owner/properties/${data.property.id}/rooms`, {
        method: 'POST',
        body: {
          name: roomName,
          pricePerMonth: Number(roomPrice),
          capacity: 1,
          bedCount: Number(roomBeds),
        },
      });
      setRoomName('');
      setRoomPrice('');
      setRoomBeds('1');
      push('Room added with its bookable units', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not add room', 'error');
    } finally {
      setAddingRoom(false);
    }
  }

  async function deleteRoom(roomId: string) {
    try {
      await api(`/api/owner/rooms/${roomId}`, { method: 'DELETE' });
      push('Room deleted', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not delete room', 'error');
    }
  }

  async function toggleUnit(unitId: string, current: string) {
    try {
      await api(`/api/owner/units/${unitId}`, {
        method: 'PATCH',
        body: { status: current === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE' },
      });
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update unit', 'error');
    }
  }

  return (
    <Workspace role="OWNER" title="Manage listing" subtitle="Photos, rooms and availability." showTabs={false}>
      <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="arrow-back" size={17} color={theme.textMuted} />
        <Text style={{ color: theme.textMuted }}>Back to listings</Text>
      </Pressable>

      {loading ? (
        <LoadingView label="Loading listing" />
      ) : !data ? (
        <Notice tone="danger">Listing not found.</Notice>
      ) : (
        <>
          <Card>
            <Row align="space-between">
              <View style={{ flex: 1 }}>
                <Heading size="sm">{data.property.name}</Heading>
                <Body muted small>
                  {propertyTypeLabels[data.property.type]} · {data.property.addressArea} ·{' '}
                  {tzs(data.property.priceFrom)}/month
                </Body>
              </View>
              <StatusBadge status={data.property.status} />
            </Row>
            {data.property.status === 'PENDING' ? (
              <Notice tone="warning">
                Awaiting admin approval. You can still edit photos and rooms.
              </Notice>
            ) : null}
            {data.property.status === 'REJECTED' ? (
              <Notice tone="danger">
                This listing was rejected. Update the details below and contact support to resubmit.
              </Notice>
            ) : null}
          </Card>

          <Card>
            <Heading size="sm">Photos</Heading>
            {data.images.length === 0 ? (
              <Body muted small>No photos yet.</Body>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {data.images.map((image) => (
                  <View key={image.id} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: mediaUrl(image.url) }}
                      style={{ width: 130, height: 96, borderRadius: 12 }}
                    />
                    <Pressable
                      onPress={() => void removePhoto(image.id)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: theme.card,
                        borderRadius: 10,
                        padding: 2,
                      }}>
                      <Ionicons name="close" size={14} color={theme.danger} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            <Button
              label={uploading ? 'Uploading…' : 'Add photo'}
              size="sm"
              variant="secondary"
              icon="camera-outline"
              onPress={() => void addPhoto()}
              disabled={uploading}
            />
          </Card>

          <Card>
            <Heading size="sm">Listing details</Heading>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Area" value={addressArea} onChangeText={setAddressArea} />
            <Field label="Description" value={description} onChangeText={setDescription} multiline />
            <Button
              label={saving ? 'Saving…' : 'Save details'}
              onPress={() => void saveDetails()}
              disabled={saving || name.trim().length < 3 || description.trim().length < 20}
              block
              variant="secondary"
            />
          </Card>

          <Card>
            <Heading size="sm">Rooms</Heading>
            {data.rooms.length === 0 ? (
              <Body muted small>No rooms yet. Add one below.</Body>
            ) : (
              data.rooms.map((room) => (
                <Row key={room.id} align="space-between">
                  <View style={{ flex: 1 }}>
                    <Body bold small>
                      {room.name}
                    </Body>
                    <Body muted small>
                      {tzs(room.pricePerMonth)}/month · capacity {room.capacity}
                      {room.hasBeds ? ` · ${room.bedCount ?? 0} beds` : ''}
                    </Body>
                  </View>
                  <Pressable onPress={() => void deleteRoom(room.id)}>
                    <Ionicons name="trash-outline" size={17} color={theme.danger} />
                  </Pressable>
                </Row>
              ))
            )}
            <Field
              label="New room name"
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Double room B"
            />
            <Row gap={10}>
              <Field
                label="Price (TZS)"
                value={roomPrice}
                onChangeText={setRoomPrice}
                keyboardType="number-pad"
                placeholder="120000"
              />
              <Field
                label="Beds"
                value={roomBeds}
                onChangeText={setRoomBeds}
                keyboardType="number-pad"
              />
            </Row>
            <Button
              label={addingRoom ? 'Adding…' : 'Add room'}
              size="sm"
              onPress={() => void addRoom()}
              disabled={addingRoom || roomName.trim().length < 1 || Number(roomPrice) < 1000}
            />
          </Card>

          <Card>
            <Heading size="sm">Bookable units</Heading>
            {data.units.length === 0 ? (
              <Body muted small>Units are generated when you add rooms.</Body>
            ) : (
              data.units.map((unit) => (
                <Row key={unit.id} align="space-between">
                  <View style={{ flex: 1 }}>
                    <Body small>{unit.label}</Body>
                    <Body muted small>
                      {tzs(unit.pricePerMonth)}/month · {unit.status.toLowerCase()}
                    </Body>
                  </View>
                  {unit.status !== 'OCCUPIED' ? (
                    <Pressable
                      onPress={() => void toggleUnit(unit.id, unit.status)}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}>
                      <Text style={{ color: theme.text, fontSize: 11 }}>
                        {unit.status === 'AVAILABLE' ? 'Disable' : 'Enable'}
                      </Text>
                    </Pressable>
                  ) : (
                    <StatusBadge status="OCCUPIED" />
                  )}
                </Row>
              ))
            )}
          </Card>
        </>
      )}
    </Workspace>
  );
}
