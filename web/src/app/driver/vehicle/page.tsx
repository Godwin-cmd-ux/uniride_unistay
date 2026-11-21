'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DocumentUploads, type PendingDocument } from '@/components/DocumentUploads';
import { Icon } from '@/components/Icon';
import { Loading, PageHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/context/toast';
import { useUniversity } from '@/context/university';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import type { DocumentItem, DriverProfile } from '@/lib/types';

const docLabels: Record<string, string> = {
  LICENSE: 'Driving licence',
  NATIONAL_ID: 'National ID (NIDA)',
  VEHICLE_INSURANCE: 'Vehicle insurance',
};

function toDateInput(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function DriverVehiclePage() {
  const { push } = useToast();
  const { universities } = useUniversity();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [newDocs, setNewDocs] = useState<PendingDocument[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  const [vehicle, setVehicle] = useState({
    plateNumber: '',
    make: '',
    model: '',
    year: '',
    type: 'MOTORCYCLE',
    trackingDeviceId: '',
    insuranceExpiry: '',
  });
  const [savingVehicle, setSavingVehicle] = useState(false);

  const apply = useCallback((nextProfile: DriverProfile) => {
    setProfile(nextProfile);
    setLicenseNumber(nextProfile.licenseNumber ?? '');
    setLicenseExpiry(toDateInput(nextProfile.licenseExpiry));
    setNationalId(nextProfile.nationalId ?? '');
    setUniversityId(nextProfile.universityId);
    setVehicle({
      plateNumber: nextProfile.plateNumber ?? '',
      make: nextProfile.make ?? '',
      model: nextProfile.model ?? '',
      year: nextProfile.year ? String(nextProfile.year) : '',
      type: nextProfile.vehicleType ?? 'MOTORCYCLE',
      trackingDeviceId: nextProfile.trackingDeviceId ?? '',
      insuranceExpiry: toDateInput(nextProfile.insuranceExpiry),
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const result = await api<{ profile: DriverProfile; documents: DocumentItem[] }>(
        '/api/driver/profile',
      );
      apply(result.profile);
      setDocuments(result.documents);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load driver profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [apply, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const result = await api<{ profile: DriverProfile; documents: DocumentItem[] }>(
        '/api/driver/profile',
        {
          method: 'PUT',
          body: {
            universityId,
            licenseNumber,
            licenseExpiry,
            nationalId,
            documents: newDocs.map((doc) => ({
              type: doc.type,
              fileUrl: doc.fileUrl,
              expiresAt: doc.expiresAt,
            })),
          },
        },
      );
      apply(result.profile);
      setDocuments(result.documents);
      setNewDocs([]);
      push('Driver details saved. An administrator will review any new documents.', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save driver details', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveVehicle(event: React.FormEvent) {
    event.preventDefault();
    setSavingVehicle(true);
    try {
      const result = await api<DriverProfile>('/api/driver/vehicle', {
        method: 'PUT',
        body: {
          plateNumber: vehicle.plateNumber,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year ? Number(vehicle.year) : undefined,
          type: vehicle.type,
          trackingDeviceId: vehicle.trackingDeviceId,
          insuranceExpiry: vehicle.insuranceExpiry,
        },
      });
      apply(result);
      push('Vehicle saved', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save vehicle', 'error');
    } finally {
      setSavingVehicle(false);
    }
  }

  return (
    <AppShell role="DRIVER">
      <PageHeader
        eyebrow="Verification"
        title="Vehicle & documents"
        subtitle="Keep your licence, ID, insurance and vehicle details current. Administrators review changes before you can drive."
        actions={
          profile ? <StatusBadge status={profile.verificationStatus} label={profile.verificationStatus} /> : undefined
        }
      />

      {loading ? (
        <Loading label="Loading documents" />
      ) : (
        <>
          {profile && profile.verificationStatus === 'REJECTED' && (
            <div className="notice notice-error">
              <Icon name="alert" size={18} />
              <div>
                <strong>Verification was not approved</strong>
                <p>{profile.rejectionReason ?? 'Update the documents below and save to resubmit.'}</p>
              </div>
            </div>
          )}
          {profile && profile.verificationStatus === 'PENDING' && (
            <div className="notice notice-warn">
              <Icon name="clock" size={18} />
              <div>
                <strong>Documents under review</strong>
                <p>
                  You can update details now, but you cannot go online until an administrator
                  approves your account.
                </p>
              </div>
            </div>
          )}

          <div className="grid-2">
            <form className="card" onSubmit={saveProfile}>
              <div className="card-head">
                <div>
                  <h2>Driver details</h2>
                  <p>Use the exact names and numbers printed on your documents.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Operating university</span>
                  <select
                    value={universityId}
                    onChange={(event) => setUniversityId(event.target.value)}
                    required
                  >
                    {universities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.shortName} — {university.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid form-grid-2">
                  <label className="field">
                    <span>Licence number</span>
                    <input
                      value={licenseNumber}
                      onChange={(event) => setLicenseNumber(event.target.value)}
                      minLength={3}
                      maxLength={60}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Licence expiry</span>
                    <input
                      type="date"
                      value={licenseExpiry}
                      onChange={(event) => setLicenseExpiry(event.target.value)}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>National ID (NIDA)</span>
                  <input
                    value={nationalId}
                    onChange={(event) => setNationalId(event.target.value)}
                    minLength={4}
                    maxLength={40}
                    required
                  />
                </label>

                <div>
                  <div className="field">
                    <span>Add verification documents</span>
                  </div>
                  <DocumentUploads documents={newDocs} onChange={setNewDocs} />
                </div>

                <button className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving…' : 'Save & resubmit for review'}
                </button>
              </div>
            </form>

            <div className="stack">
              <form className="card" onSubmit={saveVehicle}>
                <div className="card-head">
                  <div>
                    <h2>Vehicle</h2>
                    <p>Only one active vehicle per driver. The plate must match your insurance.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-grid form-grid-2">
                    <label className="field">
                      <span>Plate number</span>
                      <input
                        value={vehicle.plateNumber}
                        onChange={(event) =>
                          setVehicle({ ...vehicle, plateNumber: event.target.value.toUpperCase() })
                        }
                        placeholder="MC 123 ABC"
                        minLength={3}
                        maxLength={20}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Type</span>
                      <select
                        value={vehicle.type}
                        onChange={(event) => setVehicle({ ...vehicle, type: event.target.value })}
                      >
                        <option value="MOTORCYCLE">Motorcycle (boda)</option>
                        <option value="CAR">Car</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-grid form-grid-2">
                    <label className="field">
                      <span>Make</span>
                      <input
                        value={vehicle.make}
                        onChange={(event) => setVehicle({ ...vehicle, make: event.target.value })}
                        placeholder="Bajaj"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Model</span>
                      <input
                        value={vehicle.model}
                        onChange={(event) => setVehicle({ ...vehicle, model: event.target.value })}
                        placeholder="Boxer 150"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-grid form-grid-2">
                    <label className="field">
                      <span>Year</span>
                      <input
                        type="number"
                        min={1980}
                        max={2100}
                        value={vehicle.year}
                        onChange={(event) => setVehicle({ ...vehicle, year: event.target.value })}
                        placeholder="2022"
                      />
                    </label>
                    <label className="field">
                      <span>Insurance expiry</span>
                      <input
                        type="date"
                        value={vehicle.insuranceExpiry}
                        onChange={(event) =>
                          setVehicle({ ...vehicle, insuranceExpiry: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Tracking device ID (optional)</span>
                    <input
                      value={vehicle.trackingDeviceId}
                      onChange={(event) =>
                        setVehicle({ ...vehicle, trackingDeviceId: event.target.value })
                      }
                      placeholder="GPS unit serial"
                    />
                  </label>
                  <button className="btn btn-dark" disabled={savingVehicle}>
                    {savingVehicle ? 'Saving…' : 'Save vehicle'}
                  </button>
                </div>
              </form>

              <div className="card">
                <div className="card-head">
                  <div>
                    <h2>Submitted documents</h2>
                    <p>Review status of everything you have sent.</p>
                  </div>
                </div>
                {documents.length === 0 ? (
                  <p className="small muted">
                    No documents uploaded yet. Add your licence, NIDA card and insurance above.
                  </p>
                ) : (
                  <div className="stack">
                    {documents.map((doc) => (
                      <div key={doc.id} className="doc-row">
                        <StatusBadge status={doc.status} />
                        <strong>{docLabels[doc.type] ?? doc.type}</strong>
                        <span>
                          {doc.expiresAt ? `expires ${shortDate(doc.expiresAt)}` : 'no expiry'} ·
                          uploaded {shortDate(doc.createdAt)}
                        </span>
                        <a
                          href={
                            doc.fileUrl.startsWith('http')
                              ? doc.fileUrl
                              : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${doc.fileUrl}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                        >
                          Open
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <h2>What happens next?</h2>
                </div>
                <p className="small muted">
                  Administrators check that your licence is valid, your NIDA matches your profile
                  and your vehicle insurance covers your operating campus. Once approved, you can
                  go online from the{' '}
                  <Link href="/driver" style={{ color: 'var(--green)', fontWeight: 600 }}>
                    driver home
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
