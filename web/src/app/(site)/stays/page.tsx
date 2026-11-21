'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { StudentFrame } from '@/components/StudentFrame';
import { UniversitySelect } from '@/components/UniversitySelect';
import { PropertyCard } from '@/components/PropertyCard';
import { EmptyState, Loading } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useUniversity } from '@/context/university';
import { api } from '@/lib/api';
import type { Paginated, PropertySummary, PropertyType } from '@/lib/types';

const types: { value: '' | PropertyType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'HOSTEL', label: 'Hostels' },
  { value: 'APARTMENT', label: 'Apartments' },
  { value: 'HOUSE', label: 'Houses' },
  { value: 'ROOM', label: 'Private rooms' },
];

const priceBands = [
  { value: '', label: 'Any price' },
  { value: '75000', label: 'Under TZS 75,000' },
  { value: '120000', label: 'Under TZS 120,000' },
  { value: '200000', label: 'Under TZS 200,000' },
];

const sorts = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'nearest', label: 'Closest to campus' },
];

export default function StaysPage() {
  const { selected, universities, select } = useUniversity();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<'' | PropertyType>('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PropertySummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const initialised = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialType = params.get('type');
    if (initialType && types.some((item) => item.value === initialType)) {
      setType(initialType as PropertyType);
    }
    const initialMax = params.get('maxPrice');
    if (initialMax) setMaxPrice(initialMax);
    const initialSort = params.get('sort');
    if (initialSort && sorts.some((item) => item.value === initialSort)) setSort(initialSort);
    const initialSearch = params.get('search');
    if (initialSearch) setSearch(initialSearch);
  }, []);

  useEffect(() => {
    if (initialised.current || universities.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const universityId = params.get('universityId');
    const match = universityId
      ? universities.find((university) => university.id === universityId)
      : null;
    if (match && match.id !== selected?.id) select(match);
    initialised.current = true;
  }, [universities, selected, select]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      universityId: selected.id,
      page: String(page),
      pageSize: '9',
      sort,
    });
    if (type) params.set('type', type);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (debouncedSearch) params.set('search', debouncedSearch);

    setLoading(true);
    setError('');
    api<Paginated<PropertySummary>>(`/api/public/properties?${params.toString()}`, {
      signal: controller.signal,
      auth: false,
    })
      .then(setData)
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Could not load stays');
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selected, page, sort, type, maxPrice, debouncedSearch]);

  function applyFilter(update: () => void) {
    update();
    setPage(1);
  }

  const campusName = selected?.shortName ?? 'your campus';

  return (
    <StudentFrame>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Unistay · verified housing</div>
          <h1>Stays around {campusName}, without the guesswork.</h1>
          <p>
            Every property below is admin-reviewed. You see the real room or bed that is open,
            the monthly price, and how far it sits from campus — no phone numbers blasted in
            group chats.
          </p>
          <div className="page-hero-actions">
            <UniversitySelect />
            <Link href="/rides" className="btn btn-glass">
              <Icon name="bike" size={16} /> Also book a ride
            </Link>
          </div>
        </div>
      </section>

      <div className="page-wrap">
        <div className="container">
          <div className="filter-bar">
            <label className="searchbox">
              <Icon name="search" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or area — Kisasa, Nzuguni…"
                aria-label="Search stays"
              />
            </label>
            <select
              className="filter-select"
              value={type}
              aria-label="Property type"
              onChange={(event) => applyFilter(() => setType(event.target.value as '' | PropertyType))}
            >
              {types.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={maxPrice}
              aria-label="Maximum price"
              onChange={(event) => applyFilter(() => setMaxPrice(event.target.value))}
            >
              {priceBands.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.label}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={sort}
              aria-label="Sort results"
              onChange={(event) => applyFilter(() => setSort(event.target.value))}
            >
              {sorts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="results-row">
            <p>
              {data ? (
                <>
                  <strong>{data.total}</strong> verified stay{data.total === 1 ? '' : 's'} near{' '}
                  {campusName}
                </>
              ) : (
                'Loading verified stays…'
              )}
            </p>
            <span className="badge badge-success">
              <Icon name="shield" size={12} /> Admin reviewed listings
            </span>
          </div>

          {error && <p className="form-error">{error}</p>}

          {loading ? (
            <div className="card-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton-card">
                  <div className="skeleton skeleton-img" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line short" />
                </div>
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="card-grid">
                {data.items.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
              {data.totalPages > 1 && (
                <div className="inline mt-32" style={{ justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <span className="small muted">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon="bed"
              title="No stays match those filters"
              description="Try widening your budget or switching property type. New verified listings are added weekly."
              action={{ href: '/stays', label: 'Clear filters' }}
            />
          )}

          <div className="privacy-note mt-32">
            <Icon name="info" size={15} />
            <span>
              Exact addresses are never shown publicly. Once a host accepts your inquiry, they
              share directions and their phone number in your student dashboard.
            </span>
          </div>
        </div>
      </div>
    </StudentFrame>
  );
}
