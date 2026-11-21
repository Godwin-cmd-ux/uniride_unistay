'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StudentFrame } from '@/components/StudentFrame';
import { Icon } from '@/components/Icon';
import { Stars } from '@/components/Stars';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import {
  datePlus,
  distanceLabel,
  mediaUrl,
  propertyTypeLabels,
  shortDate,
  tzs,
} from '@/lib/format';
import type { PropertyDetail } from '@/lib/types';

type DetailResponse = { property: PropertyDetail; privacy: string };

export default function StayDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { push } = useToast();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [moveIn, setMoveIn] = useState(datePlus(14));
  const [duration, setDuration] = useState(6);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api<DetailResponse>(`/api/public/properties/${id}`, { auth: false })
      .then((response) => {
        setData(response);
        setSelectedUnit(response.property.units[0]?.id ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this stay'))
      .finally(() => setLoading(false));
  }, [id]);

  async function submitInquiry(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== 'STUDENT') {
      push('Stay inquiries are made from a student account.', 'error');
      return;
    }
    if (!selectedUnit) {
      push('Select an open room or bed first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/student/inquiries', {
        method: 'POST',
        body: {
          propertyId: id,
          bookableUnitId: selectedUnit,
          moveInDate: moveIn,
          durationMonths: duration,
          message,
        },
      });
      setSent(true);
      push('Inquiry sent to the host', 'success');
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not send inquiry', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <StudentFrame>
        <div className="page-wrap page-wrap-public">
          <div className="container">
            <Loading label="Loading stay" />
          </div>
        </div>
      </StudentFrame>
    );
  }

  if (error || !data) {
    return (
      <StudentFrame>
        <div className="page-wrap page-wrap-public">
          <div className="container">
            <div className="card card-pad-lg center">
              <h1 className="section-title">Stay not available</h1>
              <p className="lede">{error || 'This listing may have been archived by its owner.'}</p>
              <div className="inline mt-24" style={{ justifyContent: 'center' }}>
                <Link href="/stays" className="btn btn-primary">
                  Browse other stays
                </Link>
              </div>
            </div>
          </div>
        </div>
      </StudentFrame>
    );
  }

  const property = data.property;
  const images = property.images ?? [];
  const unit = property.units.find((item) => item.id === selectedUnit) ?? property.units[0];
  const price = unit?.pricePerMonth ?? property.priceFrom;

  return (
    <StudentFrame>
      <div className="page-wrap page-wrap-public">
        <div className="container">
          <Link href="/stays" className="small muted inline" style={{ marginBottom: 14 }}>
            <Icon name="arrow-left" size={14} /> Back to all stays
          </Link>

          <div className={images.length === 1 ? 'gallery single' : 'gallery'}>
            {images.length === 0 ? (
              <div className="gallery-item gallery-item-fallback" style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}>
                <Icon name="bed" size={40} />
              </div>
            ) : (
              images.slice(0, 3).map((image, index) => (
                <div className="gallery-item" key={image.id} style={images.length === 1 ? { gridColumn: '1 / -1', gridRow: '1 / -1' } : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(image.url)} alt={`${property.name} photo ${index + 1}`} />
                </div>
              ))
            )}
          </div>

          <div className="detail-grid">
            <div>
              <div className="detail-title">
                <div>
                  <div className="property-campus" style={{ marginBottom: 8 }}>
                    <span>{property.universityShortName}</span>
                    <span className="dot" />
                    <span>{propertyTypeLabels[property.type]}</span>
                  </div>
                  <h1>{property.name}</h1>
                </div>
                {property.verifiedAt ? (
                  <span className="badge badge-success">
                    <Icon name="shield" size={12} /> Verified {shortDate(property.verifiedAt)}
                  </span>
                ) : (
                  <span className="badge badge-warn">Pending verification</span>
                )}
              </div>
              <div className="detail-meta">
                <span>
                  <Icon name="pin" size={14} /> {property.addressArea}
                </span>
                <span>
                  <Icon name="route" size={14} /> {distanceLabel(property.distanceM)}
                </span>
                <span>
                  <Icon name="user" size={14} /> {property.ownerDisplayName}
                </span>
                <span>
                  <Icon name="key" size={14} /> {property.units.length} unit
                  {property.units.length === 1 ? '' : 's'} open
                </span>
              </div>

              <div className="detail-section" style={{ paddingTop: 4 }}>
                <h2>About this stay</h2>
                <p>{property.description}</p>
              </div>

              {property.amenities?.length > 0 && (
                <div className="detail-section">
                  <h2>What is included</h2>
                  <div className="amenity-grid">
                    {property.amenities.map((amenity) => (
                      <span className="amenity" key={amenity}>
                        <Icon name="check" size={15} /> {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {property.rooms?.length > 0 && (
                <div className="detail-section">
                  <h2>Rooms and pricing</h2>
                  <div className="room-list">
                    {property.rooms.map((room) => (
                      <div className="room-card" key={room.id}>
                        <div>
                          <strong>{room.name}</strong>
                          <span>
                            Sleeps {room.capacity}
                            {room.bedCount ? ` · ${room.bedCount} beds in room` : ' · whole room'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong>{tzs(room.pricePerMonth)}</strong>
                          <span className="small muted"> per month</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h2>Meet the host</h2>
                <div className="inline">
                  <span className="avatar avatar-lg">{property.ownerDisplayName.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{property.ownerDisplayName}</strong>
                    <p className="small muted">
                      Property reviewed by the UNISTAY team. Phone number is shared after your
                      inquiry is accepted.
                    </p>
                  </div>
                </div>
              </div>

              {property.reviews?.length > 0 && (
                <div className="detail-section">
                  <h2>Student reviews</h2>
                  {property.reviews.map((review, index) => (
                    <div className="review" key={index}>
                      <div className="review-head">
                        <span className="avatar avatar-sm">{review.reviewerName.slice(0, 2).toUpperCase()}</span>
                        <strong>{review.reviewerName}</strong>
                        <Stars value={review.rating} />
                        <span>{shortDate(review.createdAt)}</span>
                      </div>
                      <p>{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="sticky-booking">
              <div className="price-line">
                <strong>{tzs(price)}</strong>
                <span>per month · no broker fee</span>
              </div>

              {sent ? (
                <div className="empty" style={{ borderStyle: 'solid' }}>
                  <span className="empty-icon">
                    <Icon name="check" size={22} />
                  </span>
                  <h3>Inquiry sent</h3>
                  <p>
                    The host can accept or decline. You will get a notification and can follow up
                    from your dashboard.
                  </p>
                  <Link href="/dashboard/inquiries" className="btn btn-primary btn-sm">
                    View my inquiries
                  </Link>
                </div>
              ) : (
                <form onSubmit={submitInquiry}>
                  {property.units.length > 0 ? (
                    <div className="field">
                      <span>Choose an open room or bed</span>
                      <div className="unit-picker">
                        {property.units.map((item) => (
                          <label
                            key={item.id}
                            className={`unit-option ${item.status !== 'AVAILABLE' ? 'disabled' : ''}`}
                          >
                            <input
                              type="radio"
                              name="unit"
                              value={item.id}
                              checked={selectedUnit === item.id}
                              onChange={() => setSelectedUnit(item.id)}
                              disabled={item.status !== 'AVAILABLE'}
                            />
                            {item.label}
                            <span>{tzs(item.pricePerMonth)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="form-error">No units are open at the moment.</p>
                  )}

                  <div className="form-grid form-grid-2 mt-16">
                    <label className="field">
                      <span>Move-in date</span>
                      <input
                        type="date"
                        min={datePlus(1)}
                        value={moveIn}
                        onChange={(event) => setMoveIn(event.target.value)}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Stay duration</span>
                      <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                        {[1, 2, 3, 6, 9, 12, 24].map((months) => (
                          <option key={months} value={months}>
                            {months} month{months === 1 ? '' : 's'}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field mt-16">
                    <span>Message to the host</span>
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Hi, I am a second-year student looking for a quiet room. Is water available all day?"
                    />
                  </label>

                  {user && user.role !== 'STUDENT' ? (
                    <p className="form-note mt-16">
                      You are signed in as a {user.role.toLowerCase()}. Inquiries are placed from
                      student accounts.
                    </p>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary btn-block mt-16"
                      disabled={submitting || property.units.length === 0}
                    >
                      {submitting
                        ? 'Sending…'
                        : user
                          ? 'Send inquiry'
                          : 'Sign in to send inquiry'}
                    </button>
                  )}
                  <p className="form-note mt-8">
                    Free to inquire. No deposit is collected online.
                  </p>
                </form>
              )}

              <div className="privacy-note">
                <Icon name="shield" size={15} />
                <span>{data.privacy}</span>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </StudentFrame>
  );
}
