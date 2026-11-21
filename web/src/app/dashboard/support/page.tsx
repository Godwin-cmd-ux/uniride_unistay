'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { Complaint } from '@/lib/types';

export default function StudentSupportPage() {
  const { push } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sendCopy, setSendCopy] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setComplaints(await api<Complaint[]>('/api/complaints/mine'));
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/api/complaints', {
        method: 'POST',
        body: { subject, description },
      });
      setSubject('');
      setDescription('');
      setSendCopy(false);
      push('Complaint submitted. Our team will review it shortly.', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not submit complaint', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="STUDENT">
      <PageHeader
        eyebrow="Support"
        title="Help & complaints"
        subtitle="Report a safety concern, ride issue or stay problem. Every complaint is tracked with a reference."
      />

      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <div className="card-head">
            <div>
              <h2>Raise a complaint</h2>
              <p>Give us the facts and we will follow up with the people involved.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Driver asked for a higher fare"
                minLength={3}
                maxLength={160}
                required
              />
            </label>
            <label className="field">
              <span>What happened?</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Include the date, route, driver or property, and anyone else involved."
                rows={6}
                minLength={10}
                maxLength={4000}
                required
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={sendCopy}
                onChange={(event) => setSendCopy(event.target.checked)}
              />
              <span>I understand support may contact the driver or owner for details.</span>
            </label>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit complaint'}
            </button>
            <p className="form-note">
              For an emergency, call campus security or the police first. Use this form for
              follow-up and platform-level action.
            </p>
          </div>
        </form>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>My complaints</h2>
                <p>Statuses are updated by UNIRIDE UNISTAY administrators.</p>
              </div>
            </div>
            {loading ? (
              <Loading label="Loading complaints" />
            ) : complaints.length === 0 ? (
              <EmptyState
                icon="shield"
                title="No complaints filed"
                description="If something goes wrong on a ride or with a stay, submit a complaint and keep the reference."
              />
            ) : (
              <div>
                {complaints.map((complaint) => (
                  <div key={complaint.id} className="complaint-row">
                    <div className="complaint-top">
                      <strong>{complaint.subject}</strong>
                      <StatusBadge status={complaint.status} />
                    </div>
                    <p>{complaint.description}</p>
                    {complaint.resolution && (
                      <div className="complaint-resolution">
                        <Icon name="check" size={13} /> {complaint.resolution}
                      </div>
                    )}
                    <span className="small muted">
                      {timeAgo(complaint.createdAt)} · ref {complaint.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="contact-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 19 }}>Still need a person?</h3>
            <p style={{ marginTop: 8 }}>
              Our Dodoma team replies within one working day, Monday to Saturday.
            </p>
            <div className="inline mt-16">
              <a href="tel:+255700000000" className="btn btn-lime btn-sm">
                <Icon name="phone" size={13} /> Call support
              </a>
              <a href="mailto:hello@unirideunistay.co.tz" className="btn btn-glass btn-sm">
                <Icon name="mail" size={13} /> Email us
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
