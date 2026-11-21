'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import type { AdminUser } from '@/lib/types';

const roleTone: Record<string, string> = {
  STUDENT: 'badge-info',
  DRIVER: 'badge-warn',
  OWNER: 'badge-success',
  ADMIN: 'badge-danger',
};

export default function AdminUsersPage() {
  const { push } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (query: { role: string; status: string; search: string }) => {
    const params = new URLSearchParams();
    if (query.role) params.set('role', query.role);
    if (query.status) params.set('status', query.status);
    if (query.search.trim()) params.set('search', query.search.trim());
    try {
      const suffix = params.toString() ? `?${params.toString()}` : '';
      setUsers(await api<AdminUser[]>(`/api/admin/users${suffix}`));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load({ role, status, search });
    }, 300);
    return () => clearTimeout(timer);
  }, [role, status, search, load]);

  async function toggle(user: AdminUser) {
    const next = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const message =
      next === 'SUSPENDED'
        ? `Suspend ${user.fullName}? They will be signed out of new sessions and drivers are forced offline.`
        : `Reinstate ${user.fullName}?`;
    if (!window.confirm(message)) return;
    setBusy(user.id);
    try {
      await api(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: { status: next },
      });
      push(next === 'SUSPENDED' ? 'Account suspended' : 'Account reinstated', 'success');
      await load({ role, status, search });
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update account', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell role="ADMIN">
      <PageHeader
        eyebrow="People"
        title="Users"
        subtitle="Search students, drivers and owners. Suspensions are logged and notify the account holder."
      />

      <div className="filter-bar">
        <label className="field" style={{ minWidth: 160 }}>
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="DRIVER">Drivers</option>
            <option value="OWNER">Owners</option>
            <option value="ADMIN">Admins</option>
          </select>
        </label>
        <label className="field" style={{ minWidth: 150 }}>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </label>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, phone or email"
          />
        </label>
      </div>

      <div className="card">
        {loading ? (
          <Loading label="Loading users" />
        ) : users.length === 0 ? (
          <EmptyState
            icon="users"
            title="No matching users"
            description="Try a different role, status or search term."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Campus</th>
                  <th>Joined</th>
                  <th className="actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="row-title">
                        <div>
                          <strong>{user.fullName}</strong>
                          <span>
                            {user.phone}
                            {user.email ? ` · ${user.email}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleTone[user.role] ?? ''}`}>
                        {user.role.toLowerCase()}
                      </span>
                      {user.role === 'DRIVER' && user.driverVerificationStatus && (
                        <div style={{ marginTop: 4 }}>
                          <StatusBadge status={user.driverVerificationStatus} />
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="small muted">{user.universityShortName ?? '—'}</td>
                    <td className="small muted">{shortDate(user.createdAt)}</td>
                    <td className="actions">
                      {user.role === 'ADMIN' ? (
                        <span className="small muted">Protected</span>
                      ) : (
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            user.status === 'SUSPENDED' ? 'btn-outline' : 'btn-danger-soft'
                          }`}
                          disabled={busy === user.id}
                          onClick={() => void toggle(user)}
                        >
                          {busy === user.id
                            ? 'Saving…'
                            : user.status === 'SUSPENDED'
                              ? 'Reinstate'
                              : 'Suspend'}
                        </button>
                      )}
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
