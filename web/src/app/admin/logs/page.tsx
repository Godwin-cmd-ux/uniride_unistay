'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { AdminLog } from '@/lib/types';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api<AdminLog[]>('/api/admin/logs')
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const term = search.trim().toLowerCase();
  const visible = term
    ? logs.filter(
        (log) =>
          log.action.toLowerCase().includes(term) ||
          log.adminName.toLowerCase().includes(term) ||
          log.entityType.toLowerCase().includes(term),
      )
    : logs;

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="Accountability"
        title="Audit log"
        subtitle="Every verification, suspension and campus change is recorded with the administrator responsible."
      />

      <div className="filter-bar">
        <label className="field" style={{ flex: 1, minWidth: 240 }}>
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Action, admin or entity type"
          />
        </label>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <span>Entries</span>
          <strong>{visible.length}</strong>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Loading label="Loading audit log" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="shield"
            title="No entries found"
            description="Administrative decisions will appear here."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((log) => (
                  <tr key={log.id}>
                    <td className="small muted">{dateTime(log.createdAt)}</td>
                    <td>{log.adminName}</td>
                    <td>
                      <strong style={{ fontSize: 13 }}>{log.action.replaceAll('_', ' ')}</strong>
                    </td>
                    <td className="small">
                      {log.entityType}
                      <div className="muted" style={{ fontFamily: 'monospace' }}>
                        {log.entityId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="small muted">
                      {Object.keys(log.details ?? {}).length
                        ? JSON.stringify(log.details)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
