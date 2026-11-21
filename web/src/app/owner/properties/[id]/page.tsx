'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { UploadField } from '@/components/UploadField';
import { Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { mediaUrl, propertyTypeLabels, shortDate, tzs } from '@/lib/format';
import type { OwnerPropertyDetail, PropertyType } from '@/lib/types';

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

export default function OwnerPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { push } = useToast();

  const [data, setData] = useState<OwnerPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [edit, setEdit] = useState({
    name: '',
    type: 'HOSTEL' as PropertyType,
    description: '',
    addressArea: '',
    amenities: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const [roomDraft, setRoomDraft] = useState({
    name: '',
    capacity: '1',
    pricePerMonth: '',
    bedCount: '0',
  });
  const [addingRoom, setAddingRoom] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const result = await api<OwnerPropertyDetail>(`/api/owner/properties/${id}`);
      setData(result);
      setEdit({
        name: result.property.name,
        type: result.property.type,
        description: result.property.description,
        addressArea: result.property.addressArea,
        amenities: result.property.amenities ?? [],
      });
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load property', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, push]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleAmenity(amenity: string) {
    setEdit((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }));
  }

  async function saveProperty(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(`/api/owner/properties/${id}`, { method: 'PATCH', body: edit });
      push('Property updated. Changes may require re-verification.', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update property', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addImage(url: string) {
    if (!url) return;
    setBusy('image');
    try {
      await api(`/api/owner/properties/${id}/images`, { method: 'POST', body: { url } });
      push('Photo added', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not add photo', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function removeImage(imageId: string) {
    if (!window.confirm('Remove this photo from the listing?')) return;
    setBusy(imageId);
    try {
      await api(`/api/owner/images/${imageId}`, { method: 'DELETE' });
      push('Photo removed', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not remove photo', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function addRoom(event: React.FormEvent) {
    event.preventDefault();
    setAddingRoom(true);
    try {
      await api(`/api/owner/properties/${id}/rooms`, {
        method: 'POST',
        body: {
          name: roomDraft.name,
          capacity: Number(roomDraft.capacity || 1),
          pricePerMonth: Number(roomDraft.pricePerMonth),
          bedCount: Number(roomDraft.bedCount || 0),
        },
      });
      setRoomDraft({ name: '', capacity: '1', pricePerMonth: '', bedCount: '0' });
      push('Room and inventory added', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not add room', 'error');
    } finally {
      setAddingRoom(false);
    }
  }

  async function deleteRoom(roomId: string) {
    if (!window.confirm('Delete this room and its bookable units? This cannot be undone.')) return;
    setBusy(roomId);
    try {
      await api(`/api/owner/rooms/${roomId}`, { method: 'DELETE' });
      push('Room removed', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not remove room', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function toggleUnit(unitId: string, status: string) {
    setBusy(unitId);
    try {
      await api(`/api/owner/units/${unitId}`, {
        method: 'PATCH',
        body: { status: status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE' },
      });
      push('Unit availability updated', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update unit', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Listing editor"
        title={data?.property.name ?? 'Property'}
        subtitle="Update details, photos, rooms and unit availability. Students see the area, not exact addresses."
        actions={
          <Link href="/owner/properties" className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={14} /> All properties
          </Link>
        }
      />

      {loading || !data ? (
        <Loading label="Loading property" />
      ) : (
        <>
          <div className="card mb-24">
            <div className="inline" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div className="inline">
                <StatusBadge status={data.property.status} />
                <span className="badge">{propertyTypeLabels[data.property.type]}</span>
                <span className="small muted">
                  {data.property.addressArea} · from {tzs(data.property.priceFrom)}/month
                </span>
              </div>
              <Link href={`/stays/${id}`} className="btn btn-outline btn-sm">
                <Icon name="search" size={13} /> Preview public page
              </Link>
            </div>
            {data.property.status === 'PENDING' && (
              <p className="form-note mt-16">
                This listing is under review. Saving details keeps it in the queue and students
                cannot see it yet.
              </p>
            )}
            {data.property.status === 'REJECTED' && (
              <p className="form-note mt-16">
                This listing was rejected. Edit the details and resubmit; an administrator will
                review it again.
              </p>
            )}
          </div>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="stack">
              <form className="card" onSubmit={saveProperty}>
                <div className="card-head">
                  <div>
                    <h2>Details</h2>
                    <p>Keep the description and amenities accurate.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Listing name</span>
                    <input
                      value={edit.name}
                      onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                      minLength={3}
                      required
                    />
                  </label>
                  <div className="form-grid form-grid-2">
                    <label className="field">
                      <span>Type</span>
                      <select
                        value={edit.type}
                        onChange={(event) =>
                          setEdit({ ...edit, type: event.target.value as PropertyType })
                        }
                      >
                        <option value="HOSTEL">Hostel</option>
                        <option value="HOUSE">Rental house</option>
                        <option value="APARTMENT">Apartment</option>
                        <option value="ROOM">Private room</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Area</span>
                      <input
                        value={edit.addressArea}
                        onChange={(event) => setEdit({ ...edit, addressArea: event.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      rows={5}
                      value={edit.description}
                      onChange={(event) => setEdit({ ...edit, description: event.target.value })}
                      minLength={20}
                      required
                    />
                  </label>
                  <div className="field">
                    <span>Amenities</span>
                    <div className="inline">
                      {amenityOptions.map((amenity) => (
                        <button
                          key={amenity}
                          type="button"
                          className={`chip ${edit.amenities.includes(amenity) ? 'active' : ''}`}
                          onClick={() => toggleAmenity(amenity)}
                        >
                          {edit.amenities.includes(amenity) && <Icon name="check" size={12} />}{' '}
                          {amenity}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save details'}
                  </button>
                </div>
              </form>

              <div className="card">
                <div className="card-head">
                  <div>
                    <h2>Photos</h2>
                    <p>{data.images.length} uploaded · first photo is the cover.</p>
                  </div>
                </div>
                {data.images.length > 0 && (
                  <div className="photo-strip">
                    {data.images.map((image, index) => (
                      <div key={image.id} className="photo-tile">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(image.url)} alt="" />
                        {index === 0 && <span className="badge badge-success">Cover</span>}
                        <button
                          type="button"
                          className="photo-remove"
                          aria-label="Remove photo"
                          disabled={busy === image.id}
                          onClick={() => void removeImage(image.id)}
                        >
                          <Icon name="close" size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <UploadField
                  label="Add a photo"
                  value=""
                  onChange={(url) => void addImage(url)}
                  hint={busy === 'image' ? 'Uploading…' : 'JPG, PNG or WEBP up to 5 MB.'}
                />
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <div>
                    <h2>Rooms</h2>
                    <p>{data.rooms.length} room{data.rooms.length === 1 ? '' : 's'} configured.</p>
                  </div>
                </div>
                {data.rooms.length === 0 ? (
                  <p className="small muted">No rooms yet. Add one below.</p>
                ) : (
                  <div className="stack">
                    {data.rooms.map((room) => (
                      <div key={room.id} className="doc-row">
                        <Icon name="bed" size={15} />
                        <strong>{room.name}</strong>
                        <span>
                          {tzs(room.pricePerMonth)}/month · sleeps {room.capacity}
                          {room.hasBeds ? ' · bed-level inventory' : ''}
                        </span>
                        <button
                          type="button"
                          className="btn btn-danger-soft btn-sm"
                          disabled={busy === room.id}
                          onClick={() => void deleteRoom(room.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form className="room-draft mt-16" onSubmit={addRoom}>
                  <div className="room-draft-head">
                    <strong>Add room</strong>
                  </div>
                  <div className="form-grid form-grid-2">
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={roomDraft.name}
                        onChange={(event) => setRoomDraft({ ...roomDraft, name: event.target.value })}
                        placeholder="Room 4"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Price (TZS/month)</span>
                      <input
                        type="number"
                        min={1000}
                        value={roomDraft.pricePerMonth}
                        onChange={(event) =>
                          setRoomDraft({ ...roomDraft, pricePerMonth: event.target.value })
                        }
                        placeholder="120000"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-grid form-grid-2 mt-16">
                    <label className="field">
                      <span>Capacity</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={roomDraft.capacity}
                        onChange={(event) =>
                          setRoomDraft({ ...roomDraft, capacity: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Beds (0 = one unit)</span>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={roomDraft.bedCount}
                        onChange={(event) =>
                          setRoomDraft({ ...roomDraft, bedCount: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <button className="btn btn-outline btn-sm mt-16" disabled={addingRoom}>
                    {addingRoom ? 'Adding…' : 'Add room & units'}
                  </button>
                </form>
              </div>

              <div className="card">
                <div className="card-head">
                  <div>
                    <h2>Bookable units</h2>
                    <p>Units are what students inquire about. Disable any you cannot rent.</p>
                  </div>
                </div>
                {data.units.length === 0 ? (
                  <p className="small muted">No units yet. Add a room to generate inventory.</p>
                ) : (
                  <div className="stack">
                    {data.units.map((unit) => (
                      <div key={unit.id} className="doc-row">
                        <StatusBadge status={unit.status} />
                        <strong>{unit.label}</strong>
                        <span>{tzs(unit.pricePerMonth)}/month</span>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            unit.status === 'AVAILABLE' ? 'btn-ghost' : 'btn-outline'
                          }`}
                          disabled={busy === unit.id || unit.status === 'OCCUPIED'}
                          onClick={() => void toggleUnit(unit.id, unit.status)}
                        >
                          {unit.status === 'OCCUPIED'
                            ? 'Occupied'
                            : unit.status === 'AVAILABLE'
                              ? 'Disable'
                              : 'Enable'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <h2>Listing history</h2>
                </div>
                <div className="list">
                  <div className="list-row">
                    <div className="list-row-main">
                      <span>Created</span>
                      <strong>{shortDate(data.property.createdAt)}</strong>
                    </div>
                  </div>
                  <div className="list-row">
                    <div className="list-row-main">
                      <span>Verification</span>
                      <strong>
                        {data.property.verifiedAt
                          ? shortDate(data.property.verifiedAt)
                          : 'Not verified yet'}
                      </strong>
                    </div>
                  </div>
                  <div className="list-row">
                    <div className="list-row-main">
                      <span>University</span>
                      <strong>{data.property.universityId.slice(0, 8)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
