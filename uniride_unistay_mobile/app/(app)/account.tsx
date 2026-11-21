import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Body, Card, Chips, Field, Heading, Notice, Row, StatusBadge } from '@/components/ui';
import { Workspace } from '@/components/workspace';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api, apiUpload } from '@/lib/api';
import { initials, mediaUrl, roleHome, shortDate } from '@/lib/format';
import type { AuthUser } from '@/lib/types';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUser, refresh, signOut } = useAuth();
  const { universities, setSelectedId } = useUniversity();
  const { push } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setEmail(user.email ?? '');
    setUniversityId(user.universityId ?? '');
    setAvatarUrl(user.avatarUrl ?? '');
  }, [user]);

  if (!user) {
    return (
      <Workspace role="STUDENT" title="Profile">
        <Body muted>Loading profile…</Body>
      </Workspace>
    );
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      push('Allow photo access to upload a profile picture', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const uploaded = await apiUpload(
        result.assets[0].uri,
        'avatar.jpg',
        result.assets[0].mimeType ?? 'image/jpeg',
      );
      setAvatarUrl(uploaded.url);
      push('Photo uploaded. Save to apply it.', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await api<AuthUser>('/api/auth/me', {
        method: 'PATCH',
        body: {
          fullName,
          email,
          avatarUrl,
          ...(universityId ? { universityId } : {}),
        },
      });
      await updateUser(updated);
      await refresh().catch(() => undefined);
      if (universityId) setSelectedId(universityId);
      push('Profile updated', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirm) {
      push('New passwords do not match', 'error');
      return;
    }
    setChanging(true);
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      push('Password changed', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not change password', 'error');
    } finally {
      setChanging(false);
    }
  }

  return (
    <Workspace
      role={user.role}
      title="Your profile"
      subtitle="Contact details, campus and security for your UNIRIDE UNISTAY account.">
      <Card>
        <Row gap={14}>
          {avatarUrl ? (
            <Image
              source={{ uri: mediaUrl(avatarUrl) }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: theme.onPrimary, fontSize: 20, fontWeight: '800' }}>
                {initials(user.fullName)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 3 }}>
            <Body bold>{user.fullName}</Body>
            <Body muted small>
              {user.role.toLowerCase()} · joined {shortDate(user.createdAt)}
            </Body>
            <StatusBadge status={user.status} />
          </View>
        </Row>
        <Button
          label={uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
          size="sm"
          variant="secondary"
          onPress={() => void pickPhoto()}
          disabled={uploading}
        />
      </Card>

      <Card>
        <Heading size="sm">Personal details</Heading>
        <Field label="Full name" value={fullName} onChangeText={setFullName} />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@campus.ac.tz"
        />
        <Field label="Phone (login)" value={user.phone} editable={false} />
        <Body muted small>
          Campus
        </Body>
        <Chips
          value={universityId}
          onChange={setUniversityId}
          options={universities.map((item) => ({ value: item.id, label: item.shortName }))}
        />
        <Button
          label={saving ? 'Saving…' : 'Save changes'}
          onPress={() => void saveProfile()}
          disabled={saving || !fullName.trim()}
          block
        />
      </Card>

      {user.role === 'DRIVER' ? (
        <Card>
          <Row align="space-between">
            <Body bold>Driver verification</Body>
            {user.driverVerificationStatus ? (
              <StatusBadge status={user.driverVerificationStatus} />
            ) : null}
          </Row>
          <Body muted small>
            Manage your licence, national ID, insurance and vehicle in the Vehicle tab.
          </Body>
          <Button
            label="Open vehicle & documents"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/driver/vehicle')}
          />
        </Card>
      ) : null}

      <Card>
        <Heading size="sm">Change password</Heading>
        <Field
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Field
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          hint="At least 8 characters."
        />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Button
          label={changing ? 'Updating…' : 'Update password'}
          onPress={() => void changePassword()}
          disabled={changing || !currentPassword || newPassword.length < 8}
          block
          variant="secondary"
        />
      </Card>

      <Card>
        <Body bold>Need a hand?</Body>
        <Body muted small>
          For account or safety issues, contact our Dodoma team at hello@unirideunistay.co.tz.
        </Body>
        <Row>
          <Button
            label="Sign out"
            size="sm"
            variant="danger"
            icon="log-out-outline"
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
          <Button
            label="Back to workspace"
            size="sm"
            variant="ghost"
            onPress={() => router.replace(roleHome(user.role) as never)}
          />
        </Row>
      </Card>

      {user.role !== 'STUDENT' ? (
        <Notice tone="info">
          Demo environment: use the seeded accounts to explore every role. Production passwords are
          managed separately.
        </Notice>
      ) : null}
    </Workspace>
  );
}
