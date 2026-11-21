'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Loading, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { rideStatusLabels, timeAgo, tzs } from '@/lib/format';
import type { AdminOverview } from '@/lib/types';

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<AdminOverview>('/api/admin/overview')
      .then((overview) => {
        if (active) setData(overview);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Control room"
        title="Platform overview"
        subtitle="Verification queues, live rides, revenue and support in one view."
        actions={
          <div className="inline">
            <Link href="/admin/drivers?verificationStatus=PENDING" className="btn btn-primary btn-sm">
              <Icon name="bike" size={15} /> Verify drivers
              {data && data.metrics.pendingDrivers > 0 && (
                <span className="side-badge">{data.metrics.pendingDrivers}</span>
              )}
            </Link>
            <Link href="/admin/properties?status=PENDING" className="btn btn-outline btn-sm">
              <Icon name="building" size={15} /> Approve listings
            </Link>
          </div>
        }
      />

      {loading || !data ? (
        <Loading label="Loading metrics" />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Live rides"
              value={data.metrics.liveRides}
              hint={`${data.metrics.ridesToday} requested today`}
              icon="bike"
              tone="green"
            />
            <StatCard
              label="Online drivers"
              value={data.metrics.onlineDrivers}
              hint={`${data.metrics.verifiedDrivers} verified · ${data.metrics.pendingDrivers} pending`}
              icon="users"
            />
            <StatCard
              label="Stay inquiries"
              value={data.metrics.pendingInquiries}
              hint={`${data.metrics.activeStays} active stays`}
              icon="bed"
            />
            <StatCard
              label="Commission earned"
              value={tzs(data.metrics.rideCommission)}
              hint={`Stay fees ${tzs(data.metrics.accommodationFees)}`}
              icon="wallet"
              tone="amber"
            />
          </div>

          <div className="stats-grid">
            <StatCard label="Students" value={data.metrics.students} icon="users" />
            <StatCard label="Drivers" value={data.metrics.drivers} icon="bike" />
            <StatCard label="Owners" value={data.metrics.owners} icon="building" />
            <StatCard
              label="Open complaints"
              value={data.metrics.openComplaints}
              hint={`${data.metrics.newContactMessages} new messages`}
              icon="alert"
            />
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <div>
                  <h2>Verification queue</h2>
                  <p>Drivers and listings waiting for a decision.</p>
                </div>
              </div>
              {data.pendingDrivers.length === 0 && data.pendingProperties.length === 0 ? (
                <p className="small muted">Nothing waiting. The queue is clear.</p>
              ) : (
                <div>
                  {data.pendingDrivers.map((driver) => (
                    <div key={driver.userId} className="notif">
                      <span className="notif-icon">
                        <Icon name="bike" size={17} />
                      </span>
                      <div className="notif-body">
                        <strong>{driver.fullName}</strong>
                        <p>Driver verification · {driver.phone}</p>
                        <small>Applied {timeAgo(driver.createdAt)}</small>
                      </div>
                      <div className="notif-action">
                        <Link
                          href="/admin/drivers?verificationStatus=PENDING"
                          className="btn btn-outline btn-sm"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
                  {data.pendingProperties.map((property) => (
                    <div key={property.id} className="notif">
                      <span className="notif-icon">
                        <Icon name="building" size={17} />
                      </span>
                      <div className="notif-body">
                        <strong>{property.name}</strong>
                        <p>
                          {property.ownerName} · {property.type.toLowerCase()}
                        </p>
                        <small>Listed {timeAgo(property.createdAt)}</small>
                      </div>
                      <div className="notif-action">
                        <Link href="/admin/properties?status=PENDING" className="btn btn-outline btn-sm">
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <h2>Recent ride requests</h2>
                  <p>Latest activity across all campuses.</p>
                </div>
                <Link href="/admin/rides" className="card-link">
                  All rides <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              <div className="stack">
                {data.recentRides.map((ride) => (
                  <div key={ride.id} className="doc-row">
                    <StatusBadge status={ride.status} label={rideStatusLabels[ride.status]} />
                    <strong>
                      {ride.studentName} · {ride.universityShortName}
                    </strong>
                    <span>
                      {ride.pickupLabel} → {ride.destLabel}
                    </span>
                    <span className="small muted">{tzs(ride.finalFare ?? ride.estimatedFare)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid-2 mt-24">
            <div className="card">
              <div className="card-head">
                <div>
                  <h2>Recent inquiries</h2>
                  <p>Students reaching out to stay owners.</p>
                </div>
                <Link href="/admin/properties" className="card-link">
                  Listings <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              {data.recentInquiries.length === 0 ? (
                <p className="small muted">No inquiries yet.</p>
              ) : (
                <div>
                  {data.recentInquiries.map((inquiry) => (
                    <div key={inquiry.id} className="notif">
                      <span className="notif-icon">
                        <Icon name="chat" size={17} />
                      </span>
                      <div className="notif-body">
                        <strong>
                          {inquiry.studentFirstName} → {inquiry.propertyName}
                        </strong>
                        <p>Move-in inquiry</p>
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
                <h2>Operations</h2>
              </div>
              <div className="grid-2">
                <Link href="/admin/users" className="link-card card">
                  <Icon name="users" size={20} />
                  <h3>Users</h3>
                  <p>Search accounts and suspend risky users.</p>
                </Link>
                <Link href="/admin/complaints" className="link-card card">
                  <Icon name="alert" size={20} />
                  <h3>Complaints</h3>
                  <p>{data.metrics.openComplaints} open cases to resolve.</p>
                </Link>
                <Link href="/admin/universities" className="link-card card">
                  <Icon name="pin" size={20} />
                  <h3>Universities</h3>
                  <p>Add campuses and adjust geo radii.</p>
                </Link>
                <Link href="/admin/messages" className="link-card card">
                  <Icon name="mail" size={20} />
                  <h3>Messages</h3>
                  <p>{data.metrics.newContactMessages} new contact messages.</p>
                </Link>
              </div>
              <p className="form-note mt-16">
                Administrators cannot suspend other administrators. Every decision is written to
                the audit log with the admin name, action and entity.
              </p>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
