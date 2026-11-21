'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { mediaUrl, propertyTypeLabels, shortDate, tzs } from '@/lib/format';
import type { OwnerProperty } from '@/lib/types';

type Tab = 'ALL' | 'ACTIVE' | 'PENDING' | 'REJECTED';

export default function OwnerPropertiesPage() {
  const { push } = useToast();
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ALL');
  const [archiving, setArchiving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProperties(await api<OwnerProperty[]>('/api/owner/properties'));
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (tab === 'ALL' ? properties : properties.filter((property) => property.status === tab)),
    [properties, tab],
  );

  async function archive(property: OwnerProperty) {
    if (
      !window.confirm(
        `Archive “${property.name}”? It will disappear from student search. Existing bookings stay intact.`,
      )
    ) {
      return;
    }
    setArchiving(property.id);
    try {
      await api(`/api/owner/properties/${property.id}`, { method: 'DELETE' });
      push('Property archived', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not archive property', 'error');
    } finally {
      setArchiving(null);
    }
  }

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Listings"
        title="My properties"
        subtitle="Manage photos, rooms and bed-level inventory. New or edited listings are re-verified."
        actions={
          <Link href="/owner/properties/new" className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> Add a property
          </Link>
        }
      />

      <div className="inline mb-16">
        <div className="seg-tabs" style={{ maxWidth: 420 }}>
          {(['ALL', 'ACTIVE', 'PENDING', 'REJECTED'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {key === 'ALL' ? 'All' : key[0] + key.slice(1).toLowerCase()} (
              {key === 'ALL'
                ? properties.length
                : properties.filter((property) => property.status === key).length}
              )
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading properties" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="building"
            title="No properties in this view"
            description="Create a listing with photos, rooms and prices. Students only see verified, active properties."
            action={{ href: '/owner/properties/new', label: 'Add a property' }}
          />
        </div>
      ) : (
        <div className="stack">
          {visible.map((property) => (
            <div key={property.id} className="owner-property">
              <span className="owner-property-thumb" style={{ width: 120, height: 94 }}>
                {property.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(property.imageUrl)} alt="" />
                ) : (
                  <Icon name="building" size={26} />
                )}
              </span>
              <div className="owner-property-main">
                <div className="inline">
                  <strong>{property.name}</strong>
                  <StatusBadge status={property.status} />
                  {property.pendingInquiries > 0 && (
                    <span className="badge badge-warn">{property.pendingInquiries} inquiries</span>
                  )}
                </div>
                <span>
                  {propertyTypeLabels[property.type]} · {property.addressArea} ·{' '}
                  {property.universityShortName}
                </span>
                <span>
                  {tzs(property.priceFrom)}/month from · {property.availableUnits}/
                  {property.totalUnits} units available · listed {shortDate(property.createdAt)}
                </span>
              </div>
              <div className="owner-property-side">
                <Link href={`/owner/properties/${property.id}`} className="btn btn-primary btn-sm">
                  Manage
                </Link>
                <Link href={`/stays/${property.id}`} className="btn btn-ghost btn-sm">
                  Preview
                </Link>
                <button
                  type="button"
                  className="btn btn-danger-soft btn-sm"
                  disabled={archiving === property.id}
                  onClick={() => void archive(property)}
                >
                  {archiving === property.id ? 'Archiving…' : 'Archive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
