import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { Button } from '@/components/button';
import {
  Body,
  Card,
  Chips,
  Field,
  Heading,
  LoadingView,
  Notice,
  Row,
  StatusBadge,
} from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useToast } from '@/context/toast';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api, apiUpload } from '@/lib/api';
import type { DocumentItem, DriverProfile } from '@/lib/types';

type PendingDoc = { type: string; fileUrl: string; expiresAt: string };

const docTypes = [
  { value: 'LICENSE', label: 'Driving licence' },
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'VEHICLE_INSURANCE', label: 'Vehicle insurance' },
];

export default function DriverVehicle() {
  const theme = useTheme();
  const { push } = useToast();
  const { universities } = useUniversity();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [pending, setPending] = useState<PendingDoc[]>([]);
  const [docType, setDocType] = useState('LICENSE');
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [vehicleType, setVehicleType] = useState('MOTORCYCLE');
  const [trackingDeviceId, setTrackingDeviceId] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ profile: DriverProfile; documents: DocumentItem[] }>(
        '/api/driver/profile',
      );
      setProfile(data.profile);
      setDocuments(data.documents);
      setLicenseNumber(data.profile.licenseNumber ?? '');
      setLicenseExpiry(data.profile.licenseExpiry ?? '');
      setNationalId(data.profile.nationalId ?? '');
      setUniversityId(data.profile.universityId);
      setPlateNumber(data.profile.plateNumber ?? '');
      setMake(data.profile.make ?? '');
      setModel(data.profile.model ?? '');
      setYear(data.profile.year ? String(data.profile.year) : '');
      setVehicleType(data.profile.vehicleType ?? 'MOTORCYCLE');
      setTrackingDeviceId(data.profile.trackingDeviceId ?? '');
      setInsuranceExpiry(data.profile.insuranceExpiry ?? '');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not load driver profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addDocument() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      push('Allow photo access to upload documents', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const uploaded = await apiUpload(
        result.assets[0].uri,
        `${docType.toLowerCase()}.jpg`,
        result.assets[0].mimeType ?? 'image/jpeg',
      );
      setPending((current) => [...current, { type: docType, fileUrl: uploaded.url, expiresAt: '' }]);
      push('Document uploaded. Save your profile to submit it.', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api('/api/driver/profile', {
        method: 'PUT',
        body: {
          universityId,
          licenseNumber,
          licenseExpiry,
          nationalId,
          documents: pending,
        },
      });
      setPending([]);
      push('Profile and documents submitted for review', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveVehicle() {
    setSavingVehicle(true);
    try {
      await api('/api/driver/vehicle', {
        method: 'PUT',
        body: {
          plateNumber,
          make,
          model,
          year: year ? Number(year) : undefined,
          type: vehicleType,
          trackingDeviceId,
          insuranceExpiry,
        },
      });
      push('Vehicle saved', 'success');
      await load();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save vehicle', 'error');
    } finally {
      setSavingVehicle(false);
    }
  }

  return (
    <Workspace
      role="DRIVER"
      title="Vehicle & documents"
      subtitle="Complete verification once. Keep insurance current to stay on the road."
      showTabs={false}>
      {loading ? (
        <LoadingView label="Loading driver profile" />
      ) : (
        <>
          {profile && profile.verificationStatus !== 'VERIFIED' ? (
            <Notice tone={profile.verificationStatus === 'REJECTED' ? 'danger' : 'warning'}>
              {profile.verificationStatus === 'REJECTED'
                ? `Rejected: ${profile.rejectionReason ?? 'Update your documents and resubmit.'}`
                : 'Documents under review. Our team usually responds within one working day.'}
            </Notice>
          ) : null}

          <Card>
            <Row align="space-between">
              <Heading size="sm">Licence & identity</Heading>
              {profile ? <StatusBadge status={profile.verificationStatus} /> : null}
            </Row>
            <Body muted small>
              Campus
            </Body>
            <Chips
              value={universityId}
              onChange={setUniversityId}
              options={universities.map((item) => ({ value: item.id, label: item.shortName }))}
            />
            <Field label="Licence number" value={licenseNumber} onChangeText={setLicenseNumber} />
            <Field
              label="Licence expiry"
              value={licenseExpiry}
              onChangeText={setLicenseExpiry}
              placeholder="YYYY-MM-DD"
            />
            <Field label="National ID (NIDA)" value={nationalId} onChangeText={setNationalId} />
          </Card>

          <Card>
            <Heading size="sm">Verification documents</Heading>
            {documents.length === 0 ? (
              <Body muted small>
                No documents submitted yet.
              </Body>
            ) : (
              documents.map((document) => (
                <Row key={document.id} align="space-between">
                  <Body small>
                    {docTypes.find((item) => item.value === document.type)?.label ?? document.type}
                  </Body>
                  <StatusBadge status={document.status} />
                </Row>
              ))
            )}
            <Body muted small>
              Add a new document
            </Body>
            <Chips value={docType} onChange={setDocType} options={docTypes} />
            <Button
              label={uploading ? 'Uploading…' : 'Choose photo & upload'}
              size="sm"
              variant="secondary"
              onPress={() => void addDocument()}
              disabled={uploading}
              icon="camera-outline"
            />
            {pending.map((item, index) => (
              <Row key={`${item.type}-${index}`} align="space-between">
                <Body small>
                  {docTypes.find((entry) => entry.value === item.type)?.label} ready to submit
                </Body>
                <Pressable
                  onPress={() => setPending((current) => current.filter((_, i) => i !== index))}>
                  <Ionicons name="close-circle" size={18} color={theme.danger} />
                </Pressable>
              </Row>
            ))}
            <Button
              label={savingProfile ? 'Saving…' : 'Save profile & submit documents'}
              onPress={() => void saveProfile()}
              disabled={
                savingProfile || licenseNumber.trim().length < 3 || nationalId.trim().length < 4
              }
              block
            />
          </Card>

          <Card>
            <Heading size="sm">Vehicle</Heading>
            <Field
              label="Plate number"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
              placeholder="MC 123 ABC"
            />
            <Field label="Make" value={make} onChangeText={setMake} placeholder="Bajaj" />
            <Field label="Model" value={model} onChangeText={setModel} placeholder="Boxer" />
            <Row gap={10}>
              <Field
                label="Year"
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                style={{ flex: 1 }}
              />
              <Field
                label="Insurance expiry"
                value={insuranceExpiry}
                onChangeText={setInsuranceExpiry}
                placeholder="YYYY-MM-DD"
                style={{ flex: 1 }}
              />
            </Row>
            <Chips
              value={vehicleType}
              onChange={setVehicleType}
              options={[
                { value: 'MOTORCYCLE', label: 'Motorcycle' },
                { value: 'CAR', label: 'Car' },
              ]}
            />
            <Field
              label="Tracking device ID (optional)"
              value={trackingDeviceId}
              onChangeText={setTrackingDeviceId}
            />
            <Button
              label={savingVehicle ? 'Saving…' : 'Save vehicle'}
              onPress={() => void saveVehicle()}
              disabled={savingVehicle || plateNumber.trim().length < 3 || !make || !model}
              block
              variant="secondary"
            />
          </Card>
        </>
      )}
    </Workspace>
  );
}
