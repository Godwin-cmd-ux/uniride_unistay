import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Body, Card, Chips, Field, Heading, Notice, Row } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api';
import { roleHome } from '@/lib/format';
import type { AuthUser } from '@/lib/types';

const demoAccounts = [
  { label: 'Student', email: 'student@udom.ac.tz', password: 'Student@1234' },
  { label: 'Driver', email: 'driver@uniride.co.tz', password: 'Driver@1234' },
  { label: 'Owner', email: 'owner@unistay.co.tz', password: 'Owner@1234' },
  { label: 'Admin', email: 'admin@unirideunistay.co.tz', password: 'Admin@1234' },
];

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { signIn, user, ready } = useAuth();
  const { push } = useToast();

  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!ready || !user) return;
    router.replace((next || roleHome(user.role)) as never);
  }, [ready, user, next, router]);

  async function login() {
    setBusy(true);
    setNotice('');
    try {
      const result = await api<{ token: string; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: { identifier: identifier.trim(), password },
        auth: false,
      });
      await signIn(result.token, result.user);
      push(`Welcome back, ${result.user.fullName.split(' ')[0]}`, 'success');
      router.replace((next || roleHome(result.user.role)) as never);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PHONE_NOT_VERIFIED') {
        setPhone(identifier.trim());
        setMode('code');
        setNotice('Verify your phone number to continue. Request a code below.');
      } else {
        push(error instanceof Error ? error.message : 'Could not sign in', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    setBusy(true);
    try {
      const result = await api<{ sent: boolean; phone: string; devOtp?: string }>(
        '/api/auth/request-otp',
        { method: 'POST', body: { phone }, auth: false },
      );
      setDevOtp(result.devOtp ?? '');
      push('Verification code sent', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not send code', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    try {
      const result = await api<{ token: string; user: AuthUser }>('/api/auth/verify-otp', {
        method: 'POST',
        body: { phone, code },
        auth: false,
      });
      await signIn(result.token, result.user);
      router.replace((next || roleHome(result.user.role)) as never);
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

        <View style={{ gap: 6, marginTop: 8 }}>
          <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>
            WELCOME BACK
          </Text>
          <Heading size="xl">Sign in</Heading>
          <Body muted small>
            One account for rides, verified stays and campus life.
          </Body>
        </View>

        <Chips
          value={mode}
          onChange={(value) => setMode(value as 'password' | 'code')}
          options={[
            { value: 'password', label: 'Password' },
            { value: 'code', label: 'Phone code' },
          ]}
        />

        {notice ? <Notice tone="info">{notice}</Notice> : null}

        {mode === 'password' ? (
          <Card>
            <Field
              label="Phone or email"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="0712 000 001"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Your password"
            />
            <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={() => void login()} disabled={busy || !identifier || !password} block />
            <Pressable onPress={() => setMode('code')}>
              <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: '600' }}>
                Sign in with a one-time code
              </Text>
            </Pressable>
          </Card>
        ) : (
          <Card>
            <Field
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0712 000 001"
            />
            <Row>
              <Button
                label={busy ? 'Sending…' : 'Send code'}
                onPress={() => void requestCode()}
                disabled={busy || phone.length < 9}
                size="sm"
              />
              {devOtp ? (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  Dev code: <Text style={{ fontWeight: '800', color: theme.text }}>{devOtp}</Text>
                </Text>
              ) : null}
            </Row>
            <Field
              label="6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />
            <Button
              label={busy ? 'Verifying…' : 'Verify & sign in'}
              onPress={() => void verifyCode()}
              disabled={busy || code.length < 4 || phone.length < 9}
              block
            />
          </Card>
        )}

        <Card>
          <Body bold small>
            Demo accounts
          </Body>
          <Body muted small>
            Development only — never use these passwords in production.
          </Body>
          <Row>
            {demoAccounts.map((account) => (
              <Pressable
                key={account.label}
                onPress={() => {
                  setMode('password');
                  setIdentifier(account.email);
                  setPassword(account.password);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                }}>
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                  {account.label}
                </Text>
              </Pressable>
            ))}
          </Row>
        </Card>

        <Row style={{ justifyContent: 'center' }}>
          <Text style={{ color: theme.textMuted }}>New here?</Text>
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>Create an account</Text>
          </Pressable>
        </Row>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
