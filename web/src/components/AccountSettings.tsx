'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { useUniversity } from '@/context/university';
import { useToast } from '@/context/toast';
import { shortDate } from '@/lib/format';
import { UploadField } from './UploadField';
import type { AuthUser } from '@/lib/types';

export function AccountSettings() {
  const { user, updateUser, refresh } = useAuth();
  const { universities } = useUniversity();
  const { push } = useToast();
  const [profile, setProfile] = useState({ fullName: '', email: '', universityId: '', avatarUrl: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      fullName: user.fullName,
      email: user.email ?? '',
      universityId: user.universityId ?? '',
      avatarUrl: user.avatarUrl ?? '',
    });
  }, [user]);

  if (!user) return null;

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api<AuthUser>('/api/auth/me', {
        method: 'PATCH',
        body: {
          fullName: profile.fullName,
          email: profile.email,
          ...(profile.universityId ? { universityId: profile.universityId } : {}),
          avatarUrl: profile.avatarUrl,
        },
      });
      updateUser(updated);
      await refresh().catch(() => undefined);
      push('Profile updated', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      push('New passwords do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword },
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      push('Password changed', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid-2">
      <div className="stack">
        <form className="card" onSubmit={saveProfile}>
          <div className="card-head">
            <div>
              <h2>Personal details</h2>
              <p>This is how you appear to other people on the platform.</p>
            </div>
          </div>
          <div className="form-grid">
            <UploadField
              label="Profile photo"
              value={profile.avatarUrl}
              onChange={(avatarUrl) => setProfile({ ...profile, avatarUrl })}
              hint="Optional. A clear face photo helps drivers and hosts recognise you."
            />
            <label className="field">
              <span>Full name</span>
              <input
                value={profile.fullName}
                onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                required
              />
            </label>
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  placeholder="you@campus.ac.tz"
                />
              </label>
              <label className="field">
                <span>Phone (login)</span>
                <input value={user.phone} disabled />
              </label>
            </div>
            <label className="field">
              <span>University</span>
              <select
                value={profile.universityId}
                onChange={(event) => setProfile({ ...profile, universityId: event.target.value })}
              >
                <option value="">Select your campus</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name} ({university.shortName})
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>

        <form className="card" onSubmit={changePassword}>
          <div className="card-head">
            <div>
              <h2>Change password</h2>
              <p>Use at least 8 characters. You stay signed in on this device.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                required
              />
            </label>
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  minLength={8}
                  value={passwords.newPassword}
                  onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  minLength={8}
                  value={passwords.confirm}
                  onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-dark" disabled={savingPassword}>
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-head">
            <h2>Account summary</h2>
          </div>
          <div className="list">
            <div className="list-row">
              <span className="avatar avatar-lg">
                {user.fullName
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </span>
              <div className="list-row-main">
                <strong>{user.fullName}</strong>
                <span>{user.role.toLowerCase()}</span>
              </div>
            </div>
            <div className="list-row">
              <div className="list-row-main">
                <span>Phone verified</span>
                <strong>{user.phoneVerified ? 'Yes' : 'No'}</strong>
              </div>
            </div>
            <div className="list-row">
              <div className="list-row-main">
                <span>Member since</span>
                <strong>{shortDate(user.createdAt)}</strong>
              </div>
            </div>
            {user.universityName && (
              <div className="list-row">
                <div className="list-row-main">
                  <span>Campus</span>
                  <strong>{user.universityName}</strong>
                </div>
              </div>
            )}
            {user.studentIdNumber && (
              <div className="list-row">
                <div className="list-row-main">
                  <span>Student ID</span>
                  <strong>{user.studentIdNumber}</strong>
                </div>
              </div>
            )}
            {user.driverVerificationStatus && (
              <div className="list-row">
                <div className="list-row-main">
                  <span>Driver verification</span>
                  <strong>{user.driverVerificationStatus.toLowerCase()}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Need help?</h2>
          </div>
          <p className="muted small">
            For account issues, safety concerns or data requests, contact our Dodoma team. We
            reply within one working day.
          </p>
          <div className="inline mt-16">
            <a className="btn btn-outline btn-sm" href="mailto:hello@unirideunistay.co.tz">
              Email support
            </a>
            <a className="btn btn-ghost btn-sm" href="/dashboard/support">
              Open a complaint
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
