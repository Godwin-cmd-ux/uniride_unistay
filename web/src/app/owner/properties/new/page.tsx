'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { UploadField } from '@/components/UploadField';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { useUniversity } from '@/context/university';
import { api } from '@/lib/api';
import { mediaUrl } from '@/lib/format';
import type { PropertyType } from '@/lib/types';

const amenityOptions = [
  'Running water',
  'Electricity',
  'WiFi',
  'Security guard',
  'Furnished',
  'Parking',
  'Shared kitchen',
  'Study desk',
];

type RoomDraft = {
  name: string;
  capacity: string;
  pricePerMonth: string;
  bedCount: string;
};

const emptyRoom = (index: number): RoomDraft => ({
  name: `Room ${index}`,
  capacity: '1',
  pricePerMonth: '',
  bedCount: '0',
});

export default function NewPropertyPage() {
  const router = useRouter();
  const { push } = useToast();
  const { user } = useAuth();
  const { universities, selected } = useUniversity();

  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('HOSTEL');
  const [description, setDescription] = useState('');
  const [addressArea, setAddressArea] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [amenities, setAmenities] = useState<string[]>(['Running water', 'Electricity', 'Security guard']);
  const [images, setImages] = useState<string[]>([]);
  const [pricingMode, setPricingMode] = useState<'ROOMS' | 'WHOLE'>('ROOMS');
  const [wholePrice, setWholePrice] = useState('');
  const [rooms, setRooms] = useState<RoomDraft[]>([emptyRoom(1)]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selected) setUniversityId(selected.id);
    else if (user?.universityId) setUniversityId(user.universityId);
    else if (universities[0]) setUniversityId(universities[0].id);
  }, [selected, user?.universityId, universities]);

  function toggleAmenity(amenity: string) {
    setAmenities((current) =>
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity],
    );
  }

  function updateRoom(index: number, patch: Partial<RoomDraft>) {
    setRooms((current) =>
      current.map((room, position) => (position === index ? { ...room, ...patch } : room)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pricingMode === 'ROOMS' && rooms.length === 0) {
      push('Add at least one room or switch to whole-property pricing', 'error');
      return;
    }
    if (pricingMode === 'ROOMS' && rooms.some((room) => !room.name || !room.pricePerMonth)) {
      push('Every room needs a name and monthly price', 'error');
      return;
    }
    if (pricingMode === 'WHOLE' && !wholePrice) {
      push('Set the monthly price for the whole property', 'error');
      return;
    }
    setBusy(true);
    try {
      const created = await api<{ id: string }>('/api/owner/properties', {
        method: 'POST',
        body: {
          name,
          type,
          description,
          universityId,
          addressArea,
          amenities,
          images,
          rooms:
            pricingMode === 'ROOMS'
              ? rooms.map((room) => ({
                  name: room.name,
                  capacity: Number(room.capacity || 1),
                  pricePerMonth: Number(room.pricePerMonth),
                  bedCount: Number(room.bedCount || 0),
                }))
              : [],
          ...(pricingMode === 'WHOLE' ? { pricePerMonth: Number(wholePrice) } : {}),
        },
      });
      push('Listing submitted for verification', 'success');
      router.push(`/owner/properties/${created.id}`);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not create property', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="New listing"
        title="Add a property"
        subtitle="Verified listings convert best. Add real photos, honest amenities and room-level pricing."
        actions={
          <Link href="/owner/properties" className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={14} /> Back to properties
          </Link>
        }
      />

      <form className="grid-2" onSubmit={submit} style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Property basics</h2>
                <p>What students will see first.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Listing name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Mwanzo Hostel — Block B"
                  minLength={3}
                  maxLength={120}
                  required
                />
              </label>
              <div className="form-grid form-grid-2">
                <label className="field">
                  <span>Property type</span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as PropertyType)}
                  >
                    <option value="HOSTEL">Hostel</option>
                    <option value="HOUSE">Rental house</option>
                    <option value="APARTMENT">Apartment</option>
                    <option value="ROOM">Private room</option>
                  </select>
                </label>
                <label className="field">
                  <span>University</span>
                  <select
                    value={universityId}
                    onChange={(event) => setUniversityId(event.target.value)}
                    required
                  >
                    {universities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.shortName} — {university.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Area (not exact address)</span>
                <input
                  value={addressArea}
                  onChange={(event) => setAddressArea(event.target.value)}
                  placeholder="e.g. Nzuguni, 1.2 km from UDOM gate"
                  minLength={2}
                  maxLength={120}
                  required
                />
                <small>
                  Exact coordinates and unit numbers stay private. Students see the area and
                  distance from campus only.
                </small>
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the compound, water supply, security, distance to lecture halls, house rules…"
                  rows={5}
                  minLength={20}
                  maxLength={4000}
                  required
                />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>Amenities</h2>
                <p>Select everything that is available today.</p>
              </div>
            </div>
            <div className="inline">
              {amenityOptions.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  className={`chip ${amenities.includes(amenity) ? 'active' : ''}`}
                  onClick={() => toggleAmenity(amenity)}
                >
                  {amenities.includes(amenity) && <Icon name="check" size={12} />} {amenity}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>Photos</h2>
                <p>Upload bright, recent photos. The first image becomes the cover.</p>
              </div>
              <span className="small muted">{images.length}/10</span>
            </div>
            {images.length > 0 && (
              <div className="photo-strip">
                {images.map((image, index) => (
                  <div key={`${image}-${index}`} className="photo-tile">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(image)} alt="" />
                    {index === 0 && <span className="badge badge-success">Cover</span>}
                    <button
                      type="button"
                      className="photo-remove"
                      aria-label="Remove photo"
                      onClick={() => setImages(images.filter((_, i) => i !== index))}
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 10 && (
              <UploadField
                label="Add a photo"
                value=""
                onChange={(url) => {
                  if (url) setImages((current) => [...current, url]);
                }}
                hint="JPG, PNG or WEBP up to 5 MB."
              />
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Pricing & inventory</h2>
                <p>Rooms create bookable beds. Or price the whole property.</p>
              </div>
            </div>
            <div className="auth-tabs" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={pricingMode === 'ROOMS' ? 'active' : ''}
                onClick={() => setPricingMode('ROOMS')}
              >
                Rooms & beds
              </button>
              <button
                type="button"
                className={pricingMode === 'WHOLE' ? 'active' : ''}
                onClick={() => setPricingMode('WHOLE')}
              >
                Whole property
              </button>
            </div>

            {pricingMode === 'WHOLE' ? (
              <label className="field">
                <span>Monthly rent for the whole property (TZS)</span>
                <input
                  type="number"
                  min={1000}
                  value={wholePrice}
                  onChange={(event) => setWholePrice(event.target.value)}
                  placeholder="350000"
                  required
                />
              </label>
            ) : (
              <div className="stack">
                {rooms.map((room, index) => (
                  <div key={index} className="room-draft">
                    <div className="room-draft-head">
                      <strong>Room {index + 1}</strong>
                      {rooms.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setRooms(rooms.filter((_, i) => i !== index))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="form-grid form-grid-2">
                      <label className="field">
                        <span>Room name / number</span>
                        <input
                          value={room.name}
                          onChange={(event) => updateRoom(index, { name: event.target.value })}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Monthly price (TZS)</span>
                        <input
                          type="number"
                          min={1000}
                          value={room.pricePerMonth}
                          onChange={(event) =>
                            updateRoom(index, { pricePerMonth: event.target.value })
                          }
                          placeholder="120000"
                          required
                        />
                      </label>
                    </div>
                    <div className="form-grid form-grid-2">
                      <label className="field">
                        <span>Capacity per unit</span>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={room.capacity}
                          onChange={(event) => updateRoom(index, { capacity: event.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span>Beds to list (0 = one unit)</span>
                        <input
                          type="number"
                          min={0}
                          max={12}
                          value={room.bedCount}
                          onChange={(event) => updateRoom(index, { bedCount: event.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setRooms([...rooms, emptyRoom(rooms.length + 1)])}
                >
                  <Icon name="plus" size={14} /> Add another room
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Ready to publish?</h2>
            </div>
            <p className="small muted">
              Submitting sends the listing to an administrator. You can keep editing while it is
              under review, and it goes live once verified.
            </p>
            <div className="form-actions mt-16">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit for verification'}
              </button>
              <Link href="/owner/properties" className="btn btn-ghost">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
