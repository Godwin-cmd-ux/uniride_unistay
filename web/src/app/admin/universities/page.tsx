'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import type { University } from '@/lib/types';

type Draft = {
  name: string;
  shortName: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
  driverRadiusKm: string;
  propertyRadiusKm: string;
  status: string;
};

const emptyDraft: Draft = {
  name: '',
  shortName: '',
  city: '',
  region: '',
  latitude: '-6.1730',
  longitude: '35.7419',
  driverRadiusKm: '5',
  propertyRadiusKm: '10',
  status: 'ACTIVE',
};

function toDraft(university: University): Draft {
  return {
    name: university.name,
    shortName: university.shortName,
    city: university.city,
    region: university.region,
    latitude: String(university.latitude),
    longitude: String(university.longitude),
    driverRadiusKm: String(university.driverRadiusKm),
    propertyRadiusKm: String(university.propertyRadiusKm),
    status: university.status ?? 'ACTIVE',
  };
}

export default function AdminUniversitiesPage() {
  const { push } = useToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUniversities(await api<University[]>('/api/admin/universities'));
    } catch {
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function payload(draft: Draft) {
    return {
      name: draft.name,
      shortName: draft.shortName,
      city: draft.city,
      region: draft.region,
      latitude: Number(draft.latitude),
      longitude: Number(draft.longitude),
      driverRadiusKm: Number(draft.driverRadiusKm),
      propertyRadiusKm: Number(draft.propertyRadiusKm),
      status: draft.status,
    };
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/api/admin/universities', { method: 'POST', body: payload(createDraft) });
      push('Campus added', 'success');
      setCreateDraft(emptyDraft);
      setCreating(false);
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not add campus', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function save(university: University) {
    setBusy(true);
    try {
      await api(`/api/admin/universities/${university.id}`, {
        method: 'PATCH',
        body: payload(editDraft),
      });
      push(`${editDraft.shortName} updated`, 'success');
      setEditingId(null);
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update campus', 'error');
    } finally {
      setBusy(false);
    }
  }

  function fields(draft: Draft, setDraft: (next: Draft) => void) {
    return (
      <div className="form-grid">
        <div className="form-grid form-grid-2">
          <label className="field">
            <span>University name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Short name</span>
            <input
              value={draft.shortName}
              onChange={(event) => setDraft({ ...draft, shortName: event.target.value })}
              placeholder="UDOM"
              maxLength={20}
              required
            />
          </label>
        </div>
        <div className="form-grid form-grid-2">
          <label className="field">
            <span>City</span>
            <input
              value={draft.city}
              onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Region</span>
            <input
              value={draft.region}
              onChange={(event) => setDraft({ ...draft, region: event.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-grid form-grid-2">
          <label className="field">
            <span>Latitude</span>
            <input
              value={draft.latitude}
              onChange={(event) => setDraft({ ...draft, latitude: event.target.value })}
              inputMode="decimal"
              required
            />
          </label>
          <label className="field">
            <span>Longitude</span>
            <input
              value={draft.longitude}
              onChange={(event) => setDraft({ ...draft, longitude: event.target.value })}
              inputMode="decimal"
              required
            />
          </label>
        </div>
        <div className="form-grid form-grid-3">
          <label className="field">
            <span>Driver radius (km)</span>
            <input
              value={draft.driverRadiusKm}
              onChange={(event) => setDraft({ ...draft, driverRadiusKm: event.target.value })}
              type="number"
              min={1}
              max={100}
              required
            />
          </label>
          <label className="field">
            <span>Stay radius (km)</span>
            <input
              value={draft.propertyRadiusKm}
              onChange={(event) => setDraft({ ...draft, propertyRadiusKm: event.target.value })}
              type="number"
              min={1}
              max={100}
              required
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>
      </div>
    );
  }

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Coverage"
        title="Campuses"
        subtitle="Each campus sets its own ride radius and catchment area for stays. Only active campuses appear to students."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating((value) => !value)}
          >
            {creating ? 'Close form' : 'Add campus'}
          </button>
        }
      />

      {creating && (
        <form className="card" onSubmit={create}>
          <div className="card-head">
            <div>
              <h2>New campus</h2>
              <p>Coordinates drive the distance and fare calculations.</p>
            </div>
          </div>
          {fields(createDraft, setCreateDraft)}
          <div className="inline mt-16">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Create campus'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCreateDraft(emptyDraft)}
            >
              Reset
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading label="Loading campuses" />
      ) : universities.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="building"
            title="No campuses yet"
            description="Add your first university to open rides and stays in that town."
          />
        </div>
      ) : (
        <div className="stack">
          {universities.map((university) => (
            <div className="card" key={university.id}>
              <div className="card-head">
                <div>
                  <h2>
                    {university.name} <span className="muted">({university.shortName})</span>
                  </h2>
                  <p>
                    {university.city}, {university.region} · rides within{' '}
                    {university.driverRadiusKm} km · stays within {university.propertyRadiusKm} km
                  </p>
                </div>
                <div className="inline">
                  <StatusBadge status={university.status ?? 'ACTIVE'} />
                  <span className="badge badge-muted">
                    {university.userCount ?? 0} people
                  </span>
                  <span className="badge badge-muted">
                    {university.propertyCount ?? 0} listings
                  </span>
                  <span className="badge badge-muted">
                    {university.driverCount ?? 0} drivers
                  </span>
                </div>
              </div>

              {editingId === university.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save(university);
                  }}
                >
                  {fields(editDraft, setEditDraft)}
                  <div className="inline mt-16">
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      {busy ? 'Saving…' : 'Save campus'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="inline mt-16">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setEditingId(university.id);
                      setEditDraft(toDraft(university));
                    }}
                  >
                    Edit campus
                  </button>
                  <span className="small muted">
                    {university.latitude.toFixed(4)}, {university.longitude.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
