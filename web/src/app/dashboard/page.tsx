'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { PropertyCard } from '@/components/PropertyCard';
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import {
  distanceLabel,
  propertyTypeLabels,
  rideStatusLabels,
  shortDate,
  timeAgo,
  tzs,
} from '@/lib/format';
import type {
  Booking,
  Inquiry,
  NotificationItem,
  Ride,
  Summary,
} from '@/lib/types';

type Data = {
  inquiries: Inquiry[];
  bookings: Booking[];
  rides: Ride[];
  summary: Summary | null;
  notifications: NotificationItem[];
};

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Data>({
    inquiries: [],
    bookings: [],
    rides: [],
    summary: null,
    notifications: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const query = user?.universityId ? `?universityId=${user.universityId}` : '';
    Promise.all([
      api<Inquiry[]>('/api/student/inquiries/mine').catch(() => []),
      api<Booking[]>('/api/student/bookings/mine').catch(() => []),
      api<Ride[]>('/api/rides/mine').catch(() => []),
      api<Summary>(`/api/public/summary${query}`, { auth: false }).catch(() => null),
      api<{ items: NotificationItem[] }>('/api/notifications').catch(() => ({ items: [] })),
    ])
      .then(([inquiries, bookings, rides, summary, notifications]) => {
        if (!active) return;
        setData({ inquiries, bookings, rides, summary, notifications: notifications.items.slice(0, 3) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.universityId]);

  const pendingInquiries = data.inquiries.filter((inquiry) => inquiry.status === 'PENDING').length;
  const activeBookings = data.bookings.filter((booking) => booking.status === 'ACTIVE').length;
  const completedRides = data.rides.filter((ride) => ride.status === 'COMPLETED').length;
  const totalRideSpend = data.rides
    .filter((ride) => ride.status === 'COMPLETED')
    .reduce((sum, ride) => sum + Number(ride.finalFare ?? ride.estimatedFare), 0);
  const activeRide = data.rides.find((ride) =>
    ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP'].includes(ride.status),
  );
  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  return (
    <AppShell role="STUDENT">
      <PageHeader
        eyebrow={user?.universityShortName ?? 'Your campus'}
        title={`Karibu, ${firstName}`}
        subtitle="Your rides, stay inquiries and bookings at a glance."
        actions={
          <div className="inline">
            <Link href="/rides" className="btn btn-primary btn-sm">
              <Icon name="bike" size={15} /> Book a ride
            </Link>
            <Link href="/stays" className="btn btn-outline btn-sm">
              <Icon name="bed" size={15} /> Find a stay
            </Link>
          </div>
        }
      />

      {loading ? (
        <Loading label="Loading your workspace" />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Active stay"
              value={activeBookings}
              hint={activeBookings ? 'Confirmed booking in progress' : 'No confirmed booking yet'}
              icon="key"
              tone="green"
            />
            <StatCard
              label="Pending inquiries"
              value={pendingInquiries}
              hint={`${data.inquiries.length} total inquiries`}
              icon="chat"
            />
            <StatCard
              label="Completed rides"
              value={completedRides}
              hint={`${data.rides.length} rides requested`}
              icon="bike"
            />
            <StatCard
              label="Ride spend"
              value={tzs(totalRideSpend)}
              hint="Cash paid on completed trips"
              icon="wallet"
              tone="amber"
            />
          </div>

          {activeRide && (
            <div className="card card-pad-lg mb-24">
              <div className="card-head">
                <div>
                  <h2>Ride in progress</h2>
                  <p>
                    {rideStatusLabels[activeRide.status]} · requested {timeAgo(activeRide.requestedAt)}
                  </p>
                </div>
                <StatusBadge
                  status={activeRide.status}
                  label={rideStatusLabels[activeRide.status]}
                />
              </div>
              <div className="grid-2">
                <div className="route-route">
                  <div className="route-rail">
                    <span className="route-dot" />
                    <span className="route-line" />
                    <span className="route-dot end" />
                  </div>
                  <div className="route-points">
                    <div>
                      <strong>{activeRide.pickupLabel}</strong>
                      <span>Pickup</span>
                    </div>
                    <div>
                      <strong>{activeRide.destLabel}</strong>
                      <span>{distanceLabel(activeRide.distanceM)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="fare-split">
                    <div>
                      <span>Fare</span>
                      <b>{tzs(activeRide.estimatedFare)}</b>
                    </div>
                    {activeRide.driverName && (
                      <div>
                        <span>Driver</span>
                        <b>{activeRide.driverName}</b>
                      </div>
                    )}
                    {activeRide.vehiclePlate && (
                      <div>
                        <span>Plate</span>
                        <b>{activeRide.vehiclePlate}</b>
                      </div>
                    )}
                  </div>
                  <Link href="/dashboard/rides" className="btn btn-soft btn-sm mt-16">
                    Track ride
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <div>
                  <h2>Stay inquiries</h2>
                  <p>Owner responses and confirmed bookings.</p>
                </div>
                <Link href="/dashboard/inquiries" className="card-link">
                  View all <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              {data.inquiries.length === 0 ? (
                <EmptyState
                  icon="bed"
                  title="No inquiries yet"
                  description="Find a verified hostel, room or bed near your campus and send your first inquiry."
                  action={{ href: '/stays', label: 'Browse stays' }}
                />
              ) : (
                <div>
                  {data.inquiries.slice(0, 4).map((inquiry) => (
                    <div key={inquiry.id} className="notif">
                      <span className="notif-icon">
                        <Icon name="bed" size={17} />
                      </span>
                      <div className="notif-body">
                        <strong>{inquiry.propertyName}</strong>
                        <p>
                          {propertyTypeLabels[inquiry.propertyType]} · {inquiry.unitLabel} ·{' '}
                          {tzs(inquiry.pricePerMonth)}/mo
                        </p>
                        <small>
                          {inquiry.status === 'ACCEPTED'
                            ? `Owner accepted · ${inquiry.ownerPhone ?? 'phone on profile'}`
                            : `Sent ${timeAgo(inquiry.createdAt)}`}
                        </small>
                      </div>
                      <div className="notif-action">
                        <StatusBadge status={inquiry.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <h2>Updates</h2>
                  <p>Latest notifications from rides and stays.</p>
                </div>
                <Link href="/notifications" className="card-link">
                  Inbox <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              {data.notifications.length === 0 ? (
                <EmptyState
                  icon="bell"
                  title="No updates yet"
                  description="Ride status changes and owner replies will appear here."
                />
              ) : (
                <div>
                  {data.notifications.map((item) => (
                    <div key={item.id} className={`notif ${item.readAt ? '' : 'unread'}`}>
                      <span className="notif-icon">
                        <Icon name="bell" size={17} />
                      </span>
                      <div className="notif-body">
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                        <small>{timeAgo(item.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {data.bookings.length > 0 && (
            <div className="card mt-24">
              <div className="card-head">
                <div>
                  <h2>Confirmed stays</h2>
                  <p>Bookings confirmed by stay owners.</p>
                </div>
              </div>
              <div className="grid-3">
                {data.bookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="stay-mini">
                    <div className="stay-mini-head">
                      <strong>{booking.propertyName}</strong>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p>
                      {booking.unitLabel} · {booking.addressArea}
                    </p>
                    <div className="stay-mini-meta">
                      <span>
                        <Icon name="calendar" size={13} /> {shortDate(booking.startDate)} →{' '}
                        {shortDate(booking.endDate)}
                      </span>
                      <span>
                        <Icon name="wallet" size={13} /> {tzs(booking.monthlyRent)}/mo
                      </span>
                    </div>
                    {booking.ownerPhone && booking.status === 'ACTIVE' && (
                      <a href={`tel:${booking.ownerPhone}`} className="btn btn-outline btn-sm">
                        <Icon name="phone" size={13} /> {booking.ownerPhone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="section-head mt-24">
            <div className="section-head-copy">
              <div className="eyebrow">Campus stays</div>
              <h2>Verified near {user?.universityShortName ?? 'you'}</h2>
            </div>
            <Link href="/stays" className="btn btn-outline btn-sm">
              Browse all stays <Icon name="arrow-right" size={13} />
            </Link>
          </div>
          <div className="card-grid">
            {(data.summary?.sampleProperties ?? []).slice(0, 3).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
