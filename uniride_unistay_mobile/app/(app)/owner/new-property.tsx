import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Chips, Field, Heading, Notice, Row } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api, apiUpload } from '@/lib/api';
import { mediaUrl } from '@/lib/format';

const amenitiesList = [
  'Water',
  'Electricity',
  'WiFi',
  'Security',
  'Parking',
  'Furnished',
  'Kitchen',
  'Laundry',
];

type RoomDraft = { name: string; pricePerMonth: string; capacity: string; bedCount: string };

const emptyRoom: RoomDraft = { name: '', pricePerMonth: '', capacity: '1', bedCount: '1' };

export default function NewProperty() {
  const theme = useTheme();
  const router = useRouter();
  const { push } = useToast();
  const { universities, selected } = useUniversity();

  const [name, setName] = useState('');
  const [type, setType] = useState('HOSTEL');
  const [universityId, setUniversityId] = useState(selected?.id ?? '');
  const [addressArea, setAddressArea] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>(['Water', 'Security']);
  const [pricingMode, setPricingMode] = useState('ROOMS');
  const [wholePrice, setWholePrice] = useState('');
  const [rooms, setRooms] = useState<RoomDraft[]>([{ ...emptyRoom }]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggleAmenity(amenity: string) {
    setAmenities((current) =>
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity],
    );
  }

  async function addPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      push('Allow photo access to upload listing photos', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    if (images.length >= 8) {
      push('You can add up to 8 photos', 'error');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await apiUpload(
        result.assets[0].uri,
        'property.jpg',
        result.assets[0].mimeType ?? 'image/jpeg',
      );
      setImages((current) => [...current, uploaded.url]);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not upload photo', 'error');
    } finally {
      setUploading(false);
    }
  }

  function updateRoom(index: number, patch: Partial<RoomDraft>) {
    setRooms((current) => current.map((room, i) => (i === index ? { ...room, ...patch } : room)));
  }

  async function submit() {
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        type,
        universityId,
        addressArea: addressArea.trim(),
        description: description.trim(),
        amenities,
        images,
        ...(pricingMode === 'ROOMS'
          ? {
              rooms: rooms.map((room) => ({
                name: room.name.trim(),
                pricePerMonth: Number(room.pricePerMonth),
                capacity: Number(room.capacity || 1),
                bedCount: Number(room.bedCount || 0),
              })),
            }
          : { pricePerMonth: Number(wholePrice) }),
      };
      const created = await api<{ id: string }>('/api/owner/properties', { method: 'POST', body });
      push('Listing submitted for review', 'success');
      router.replace(`/owner/property/${created.id}` as never);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not create listing', 'error');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    name.trim().length >= 3 &&
    description.trim().length >= 20 &&
    addressArea.trim().length >= 2 &&
    Boolean(universityId) &&
    (pricingMode === 'WHOLE'
      ? Number(wholePrice) >= 1000
      : rooms.every((room) => room.name.trim() && Number(room.pricePerMonth) >= 1000));

  return (
    <Workspace
      role="OWNER"
      title="New listing"
      subtitle="Add photos, rooms and a transparent monthly price. An admin reviews it before publishing."
      showTabs={false}>
      <Card>
        <Heading size="sm">Property basics</Heading>
        <Field label="Listing name" value={name} onChangeText={setName} placeholder="Riverside Student Hostel" />
        <Body muted small>
          Type
        </Body>
        <Chips
          value={type}
          onChange={setType}
          options={[
            { value: 'HOSTEL', label: 'Hostel' },
            { value: 'APARTMENT', label: 'Apartment' },
            { value: 'HOUSE', label: 'House' },
            { value: 'ROOM', label: 'Single room' },
          ]}
        />
        <Body muted small>
          Campus
        </Body>
        <Chips
          value={universityId}
          onChange={setUniversityId}
          options={universities.map((item) => ({ value: item.id, label: item.shortName }))}
        />
        <Field
          label="Neighbourhood / area"
          value={addressArea}
          onChangeText={setAddressArea}
          placeholder="e.g. Chang'ombe, near main gate"
        />
        <Body muted small>
          Students see the neighbourhood only — never the exact address.
        </Body>
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What makes this a good student stay? Water schedule, security, distance to campus…"
        />
      </Card>

      <Card>
        <Heading size="sm">Amenities</Heading>
        <Row>
          {amenitiesList.map((amenity) => {
            const active = amenities.includes(amenity);
            return (
              <Pressable
                key={amenity}
                onPress={() => toggleAmenity(amenity)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primarySoft : theme.surface,
                  borderRadius: 999,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                }}>
                {active ? <Ionicons name="checkmark" size={12} color={theme.primary} /> : null}
                <Text style={{ color: active ? theme.primary : theme.textMuted, fontSize: 12 }}>
                  {amenity}
                </Text>
              </Pressable>
            );
          })}
        </Row>
      </Card>

      <Card>
        <Heading size="sm">Photos</Heading>
        <ScrollableImages images={images} onRemove={(url) => setImages((current) => current.filter((item) => item !== url))} />
        <Button
          label={uploading ? 'Uploading…' : 'Add photo'}
          size="sm"
          variant="secondary"
          icon="camera-outline"
          onPress={() => void addPhoto()}
          disabled={uploading}
        />
        <Body muted small>
          Real photos of the room, building and surroundings build trust.
        </Body>
      </Card>

      <Card>
        <Heading size="sm">Pricing</Heading>
        <Chips
          value={pricingMode}
          onChange={setPricingMode}
          options={[
            { value: 'ROOMS', label: 'Price per room / bed' },
            { value: 'WHOLE', label: 'Entire property' },
          ]}
        />
        {pricingMode === 'WHOLE' ? (
          <Field
            label="Monthly price (TZS)"
            value={wholePrice}
            onChangeText={setWholePrice}
            keyboardType="number-pad"
            placeholder="250000"
          />
        ) : (
          <>
            {rooms.map((room, index) => (
              <Card key={index} style={{ backgroundColor: theme.surface }}>
                <Row align="space-between">
                  <Body bold small>
                    Room {index + 1}
                  </Body>
                  {rooms.length > 1 ? (
                    <Pressable onPress={() => setRooms((current) => current.filter((_, i) => i !== index))}>
                      <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    </Pressable>
                  ) : null}
                </Row>
                <Field
                  label="Room name"
                  value={room.name}
                  onChangeText={(value) => updateRoom(index, { name: value })}
                  placeholder="Single room A"
                />
                <Field
                  label="Price per month (TZS)"
                  value={room.pricePerMonth}
                  onChangeText={(value) => updateRoom(index, { pricePerMonth: value })}
                  keyboardType="number-pad"
                  placeholder="90000"
                />
                <Row gap={10}>
                  <Field
                    label="Capacity"
                    value={room.capacity}
                    onChangeText={(value) => updateRoom(index, { capacity: value })}
                    keyboardType="number-pad"
                  />
                  <Field
                    label="Beds"
                    value={room.bedCount}
                    onChangeText={(value) => updateRoom(index, { bedCount: value })}
                    keyboardType="number-pad"
                  />
                </Row>
              </Card>
            ))}
            <Button
              label="Add another room"
              size="sm"
              variant="ghost"
              onPress={() => setRooms((current) => [...current, { ...emptyRoom }])}
            />
          </>
        )}
      </Card>

      <Notice tone="info">
        New listings start as PENDING. Our team checks photos and pricing, usually within one working
        day.
      </Notice>

      <Button
        label={busy ? 'Submitting…' : 'Submit listing'}
        onPress={() => void submit()}
        disabled={busy || !canSubmit}
        block
      />
    </Workspace>
  );
}

function ScrollableImages({ images, onRemove }: { images: string[]; onRemove: (url: string) => void }) {
  const theme = useTheme();
  if (images.length === 0) {
    return <Body muted small>No photos yet.</Body>;
  }
  return (
    <Row>
      {images.map((url) => (
        <View key={url} style={{ position: 'relative' }}>
          <Image source={{ uri: mediaUrl(url) }} style={styles.photo} />
          <Pressable
            onPress={() => onRemove(url)}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: theme.card,
              borderRadius: 12,
            }}>
            <Ionicons name="close" size={16} color={theme.danger} />
          </Pressable>
        </View>
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({
  photo: { width: 96, height: 76, borderRadius: 10 },
});
