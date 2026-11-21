import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Body, Card, Chips, Field, Heading, Notice, Row } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { useUniversity } from '@/context/university';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { roleHome } from '@/lib/format';
import type { AuthUser, Role } from '@/lib/types';

const roles: { value: Exclude<Role, 'ADMIN'>; label: string; hint: string }[] = [
  { value: 'STUDENT', label: 'Student', hint: 'Book rides and request rooms near campus.' },
  { value: 'DRIVER', label: 'Driver', hint: 'Earn per trip. Verification required.' },
  { value: 'OWNER', label: 'Stay owner', hint: 'Publish verified hostels and rooms.' },
];

export default function SignupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { universities, selected } = useUniversity();
  const { signIn, user, ready } = useAuth();
  const { push } = useToast();

  const [role, setRole] = useState<Exclude<Role, 'ADMIN'>>('STUDENT');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const [stage, setStage] = useState<'form' | 'verify'>('form');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [verifyPhone, setVerifyPhone] = useState('');

  useEffect(() => {
    if (params.role === 'STUDENT' || params.role === 'DRIVER' || params.role === 'OWNER') {
      setRole(params.role);
    }
  }, [params.role]);

  useEffect(() => {
    if (selected) setUniversityId(selected.id);
  }, [selected]);

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(roleHome(user.role) as never);
  }, [ready, user, router]);

  async function register() {
    if (password !== confirm) {
      push('Passwords do not match', 'error');
      return;
    }
    if (!universityId) {
      push('Select your university', 'error');
      return;
    }
    if (!accepted) {
      push('Accept the terms to create an account', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ requiresVerification: boolean; phone: string; devOtp?: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          auth: false,
          body: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            password,
            role,
            universityId,
          },
        },
      );
      setVerifyPhone(result.phone);
      setDevOtp(result.devOtp ?? '');
      setStage('verify');
      push('Account created. Enter the code to verify your phone.', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not create account', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      const result = await api<{ sent: boolean; phone: string; devOtp?: string }>(
        '/api/auth/request-otp',
        { method: 'POST', auth: false, body: { phone: verifyPhone } },
      );
      setDevOtp(result.devOtp ?? '');
      setCode('');
      push('A new code was sent', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not resend code', 'error');
    }
  }

  async function verify() {
    setBusy(true);
    try {
      const result = await api<{ token: string; user: AuthUser }>('/api/auth/verify-otp', {
        method: 'POST',
        auth: false,
        body: { phone: verifyPhone, code },
      });
      await signIn(result.token, result.user);
      push('Phone verified. Your account is ready.', 'success');
      router.replace(roleHome(result.user.role) as never);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not verify code', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable onPress={() => router.replace('/')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted }}>Back</Text>
        </Pressable>

        {stage === 'form' ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>
                JOIN THE NETWORK
              </Text>
              <Heading size="xl">Create your account</Heading>
              <Body muted small>
                Choose how you will use the network. You can complete your profile after verifying.
              </Body>
            </View>

            <Chips
              value={role}
              onChange={(value) => setRole(value as Exclude<Role, 'ADMIN'>)}
              options={roles.map((item) => ({ value: item.value, label: item.label }))}
            />
            <Body muted small>
              {roles.find((item) => item.value === role)?.hint}
            </Body>

            <Card>
              <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Asha Mwinyi" />
              <Field
                label="Phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+255 7xx xxx xxx"
              />
              <Field
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@campus.ac.tz"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="At least 8 characters"
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
            </Card>

            <Card>
              <Body bold small>
                Your campus
              </Body>
              <Chips
                value={universityId}
                onChange={setUniversityId}
                options={universities.map((item) => ({
                  value: item.id,
                  label: item.shortName,
                }))}
              />
              <Pressable
                onPress={() => setAccepted((value) => !value)}
                style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 4 }}>
                <Ionicons
                  name={accepted ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={accepted ? theme.primary : theme.textMuted}
                />
                <Text style={{ color: theme.textMuted, fontSize: 12, flex: 1, lineHeight: 18 }}>
                  I agree to the UNIRIDE UNISTAY terms of use, privacy policy and campus safety rules.
                </Text>
              </Pressable>
            </Card>

            <Button
              label={busy ? 'Creating account…' : 'Create account'}
              onPress={() => void register()}
              disabled={busy || !fullName || !phone || !password}
              block
            />
            <Row style={{ justifyContent: 'center' }}>
              <Text style={{ color: theme.textMuted }}>Already have an account?</Text>
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Sign in</Text>
              </Pressable>
            </Row>
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>
                ONE LAST STEP
              </Text>
              <Heading size="xl">Verify your phone</Heading>
              <Body muted small>
                We sent a 6-digit code to {verifyPhone}. Verification keeps drivers and hosts
                accountable.
              </Body>
            </View>

            {devOtp ? <Notice tone="info">Local development code: {devOtp}</Notice> : null}

            <Card>
              <Field
                label="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
              />
              <Button
                label={busy ? 'Verifying…' : 'Verify & enter app'}
                onPress={() => void verify()}
                disabled={busy || code.length < 4}
                block
              />
              <Pressable onPress={() => void resend()}>
                <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: '600' }}>
                  Send a new code
                </Text>
              </Pressable>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
