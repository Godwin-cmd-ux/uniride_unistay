'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { mediaUrl, shortDate, timeAgo, tzs } from '@/lib/format';
import type { OwnerProperty } from '@/lib/types';

type Counts = {
  properties: number;
  activeProperties: number;
  pendingProperties: number;
  availableUnits: number;
  occupiedUnits: number;
  pendingInquiries: number;
  activeBookings: number;
  totalSuccessFees: number;
  totalRentValue: number;
};

type RecentInquiry = {
  id: string;
  moveInDate: string;
  durationMonths: number;
  status: string;
  createdAt: string;
  propertyName: string;
  unitLabel: string;
  studentFirstName: string;
};

export default function OwnerOverviewPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<RecentInquiry[]>([]);
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ counts: Counts; recentInquiries: RecentInquiry[] }>('/api/owner/overview'),
      api<OwnerProperty[]>('/api/owner/properties').catch(() => []),
    ])
      .then(([overview, list]) => {
        if (!active) return;
        setCounts(overview.counts);
        setRecent(overview.recentInquiries);
        setProperties(list);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const occupancy =
    counts && counts.availableUnits + counts.occupiedUnits > 0
      ? Math.round((counts.occupiedUnits / (counts.availableUnits + counts.occupiedUnits)) * 100)
      : 0;

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="UNISTAY"
        title="Your hostel, run calmly"
        subtitle="Listings, inquiries and confirmed stays for your properties near campus."
        actions={
          <Link href="/owner/properties/new" className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> Add a property
          </Link>
        }
      />

      {loading ? (
        <Loading label="Loading owner workspace" />
      ) : (
        <>
          {counts && counts.properties === 0 && (
            <div className="notice notice-warn">
              <Icon name="building" size={18} />
              <div>
                <strong>Publish your first listing</strong>
                <p>
                  Add a hostel, rental house, apartment or single room. Listings are reviewed by
                  an administrator before students can see them.
                </p>
              </div>
              <Link href="/owner/properties/new" className="btn btn-outline btn-sm">
                Create listing
              </Link>
            </div>
          )}

          {counts && counts.pendingProperties > 0 && (
            <div className="notice notice-warn">
              <Icon name="clock" size={18} />
              <div>
                <strong>
                  {counts.pendingProperties} listing{counts.pendingProperties === 1 ? '' : 's'} under review
                </strong>
                <p>
                  You can keep editing details and images while an administrator verifies the
                  property. Students only see active listings.
                </p>
              </div>
            </div>
          )}

          <div className="stats-grid">
            <StatCard
              label="Properties"
              value={counts?.properties ?? 0}
              hint={`${counts?.activeProperties ?? 0} live · ${counts?.pendingProperties ?? 0} pending`}
              icon="building"
              tone="green"
            />
            <StatCard
              label="Open inquiries"
              value={counts?.pendingInquiries ?? 0}
              hint="Students waiting for a reply"
              icon="chat"
            />
            <StatCard
              label="Occupancy"
              value={`${occupancy}%`}
              hint={`${counts?.occupiedUnits ?? 0} occupied · ${counts?.availableUnits ?? 0} open`}
              icon="key"
            />
            <StatCard
              label="Rent value booked"
              value={tzs(counts?.totalRentValue ?? 0)}
              hint={`Success fees ${tzs(counts?.totalSuccessFees ?? 0)}`}
              icon="wallet"
              tone="amber"
            />
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <div>
                  <h2>Recent inquiries</h2>
                  <p>Reply quickly — students usually contact several hostels.</p>
                </div>
                <Link href="/owner/inquiries" className="card-link">
                  Manage <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState
                  icon="chat"
                  title="No inquiries yet"
                  description="Once your listing is live, student inquiries will land here with move-in dates and messages."
                />
              ) : (
                <div>
                  {recent.map((inquiry) => (
                    <div key={inquiry.id} className="notif">
                      <span className="notif-icon">
                        <Icon name="chat" size={17} />
                      </span>
                      <div className="notif-body">
                        <strong>
                          {inquiry.studentFirstName} · {inquiry.propertyName}
                        </strong>
                        <p>
                          {inquiry.unitLabel} · move-in {shortDate(inquiry.moveInDate)} ·{' '}
                          {inquiry.durationMonths} month{inquiry.durationMonths === 1 ? '' : 's'}
                        </p>
                        <small>{timeAgo(inquiry.createdAt)}</small>
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
                  <h2>Your listings</h2>
                  <p>Availability and verification at a glance.</p>
                </div>
                <Link href="/owner/properties" className="card-link">
                  All properties <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              {properties.length === 0 ? (
                <EmptyState
                  icon="building"
                  title="No properties yet"
                  description="Create your first listing to start receiving inquiries."
                  action={{ href: '/owner/properties/new', label: 'Add a property' }}
                />
              ) : (
                <div className="stack">
                  {properties.slice(0, 4).map((property) => (
                    <Link
                      key={property.id}
                      href={`/owner/properties/${property.id}`}
                      className="owner-property"
                    >
                      <span className="owner-property-thumb">
                        {property.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(property.imageUrl)} alt="" />
                        ) : (
                          <Icon name="building" size={22} />
                        )}
                      </span>
                      <div className="owner-property-main">
                        <strong>{property.name}</strong>
                        <span>
                          {property.addressArea} · {property.availableUnits}/{property.totalUnits}{' '}
                          units open
                        </span>
                      </div>
                      <div className="owner-property-side">
                        <StatusBadge status={property.status} />
                        {property.pendingInquiries > 0 && (
                          <span className="badge badge-warn">{property.pendingInquiries} new</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid-3 mt-24">
            <Link href="/owner/inquiries" className="card link-card">
              <Icon name="chat" size={22} />
              <h3>Answer inquiries</h3>
              <p>Accept or decline with a message. Accepted inquiries create a booking.</p>
            </Link>
            <Link href="/owner/bookings" className="card link-card">
              <Icon name="key" size={22} />
              <h3>Manage bookings</h3>
              <p>See student contact details, tenancy dates and close completed stays.</p>
            </Link>
            <Link href="/owner/account" className="card link-card">
              <Icon name="user" size={22} />
              <h3>Account settings</h3>
              <p>Update your contact details and password.</p>
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
