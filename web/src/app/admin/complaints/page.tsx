'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { Complaint } from '@/lib/types';

const tabs = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: '', label: 'All' },
];

const statuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const;

export default function AdminComplaintsPage() {
  const { push } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ status: string; resolution: string }>({
    status: 'IN_REVIEW',
    resolution: '',
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setComplaints(await api<Complaint[]>('/api/admin/complaints'));
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditing(complaint: Complaint) {
    setEditing(complaint.id);
    setDraft({
      status: complaint.status === 'OPEN' ? 'IN_REVIEW' : complaint.status,
      resolution: complaint.resolution ?? '',
    });
  }

  async function save(complaint: Complaint) {
    setBusy(true);
    try {
      await api(`/api/admin/complaints/${complaint.id}`, {
        method: 'PATCH',
        body: { status: draft.status, resolution: draft.resolution },
      });
      push('Complaint updated and the reporter was notified', 'success');
      setEditing(null);
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update complaint', 'error');
    } finally {
      setBusy(false);
    }
  }

  const visible = filter ? complaints.filter((item) => item.status === filter) : complaints;

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Trust & safety"
        title="Complaints"
        subtitle="Move cases through review, record the outcome and let the reporter know what happened."
      />

      <div className="seg-tabs" style={{ maxWidth: 620 }}>
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={filter === tab.value ? 'active' : ''}
            onClick={() => {
              setFilter(tab.value);
              setEditing(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading complaints" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="shield"
            title="No complaints here"
            description="Reports from students, drivers and owners land in this queue."
          />
        </div>
      ) : (
        <div className="card">
          {visible.map((complaint) => (
            <div key={complaint.id} className="complaint-row">
              <div className="complaint-top">
                <strong>{complaint.subject}</strong>
                <StatusBadge status={complaint.status} />
              </div>
              <p>{complaint.description}</p>
              <div className="small muted">
                By {complaint.complainantName ?? 'Unknown'}
                {complaint.accusedName ? ` · about ${complaint.accusedName}` : ''} ·{' '}
                {timeAgo(complaint.createdAt)} · ref {complaint.id.slice(0, 8).toUpperCase()}
              </div>
              {complaint.resolution && (
                <div className="complaint-resolution">{complaint.resolution}</div>
              )}

              {editing === complaint.id ? (
                <form
                  className="mt-16"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save(complaint);
                  }}
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                      >
                        {statuses.map((value) => (
                          <option key={value} value={value}>
                            {value.replace('_', ' ').toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Resolution note (sent to the reporter)</span>
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={draft.resolution}
                        onChange={(event) =>
                          setDraft({ ...draft, resolution: event.target.value })
                        }
                        placeholder="What did you find and what action was taken?"
                      />
                    </label>
                    <div className="inline">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                        {busy ? 'Saving…' : 'Save case'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="inline mt-16">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => startEditing(complaint)}
                  >
                    Update case
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
