'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { OtpInput } from '@/components/OtpInput';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { api, ApiError } from '@/lib/api';
import { roleHome, mediaUrl } from '@/lib/format';
import type { AuthUser } from '@/lib/types';

type DemoAccount = { role: string; email: string; password: string };

const demos: DemoAccount[] = [
  { role: 'Student', email: 'student@udom.ac.tz', password: 'Student@1234' },
  { role: 'Driver', email: 'driver@uniride.co.tz', password: 'Driver@1234' },
  { role: 'Owner', email: 'owner@unistay.co.tz', password: 'Owner@1234' },
  { role: 'Admin', email: 'admin@unirideunistay.co.tz', password: 'Admin@1234' },
];

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const { signIn, user, ready } = useAuth();

  const [next, setNext] = useState('');
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('next');
    if (target && target.startsWith('/')) setNext(target);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(next || roleHome(user.role));
  }, [ready, user, next, router]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api<{ token: string; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
      });
      signIn(result.token, result.user);
      push(`Welcome back, ${result.user.fullName.split(' ')[0]}`, 'success');
      router.replace(next || roleHome(result.user.role));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PHONE_NOT_VERIFIED') {
        setMode('code');
        const looksLikePhone = /^[+\d\s()-]+$/.test(identifier);
        if (looksLikePhone) {
          setPhone(identifier);
          void requestOtp(identifier);
        }
        push('Verify your phone number to continue.', 'info');
      } else {
        push(error instanceof Error ? error.message : 'Could not sign in', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp(rawPhone?: string) {
    const value = (rawPhone ?? phone).trim();
    if (!value) {
      push('Enter the phone number you registered with', 'error');
      return;
    }
    setOtpBusy(true);
    try {
      const result = await api<{ sent: boolean; phone: string; devOtp?: string }>(
        '/api/auth/request-otp',
        { method: 'POST', body: { phone: value } },
      );
      setPhone(result.phone);
      setCodeSent(true);
      setDevOtp(result.devOtp ?? '');
      setOtp('');
      push('Verification code sent', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not send code', 'error');
    } finally {
      setOtpBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (otp.length !== 6) {
      push('Enter the 6-digit code', 'error');
      return;
    }
    setOtpBusy(true);
    try {
      const result = await api<{ token: string; user: AuthUser }>('/api/auth/verify-otp', {
        method: 'POST',
        body: { phone, code: otp },
      });
      signIn(result.token, result.user);
      push('Phone verified. Welcome to UNIRIDE UNISTAY.', 'success');
      router.replace(next || roleHome(result.user.role));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not verify code', 'error');
    } finally {
      setOtpBusy(false);
    }
  }

  function fillDemo(demo: DemoAccount) {
    setMode('password');
    setIdentifier(demo.email);
    setPassword(demo.password);
  }

  return (
    <div className="auth">
      <aside className="auth-art">
        <Logo light href="/" />
        <div className="auth-art-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl('/uploads/seed/hero-campus-ride.jpg')} alt="" />
        </div>
        <div className="auth-art-copy">
          <span className="auth-badge">
            <Icon name="shield" size={12} /> Verified campus network
          </span>
          <h2>
            One account for <em>rides</em>, <em>stays</em> and everything between.
          </h2>
          <p>
            Students, drivers and stay owners sign in to the same trusted network — filtered to
            your university from the first tap.
          </p>
        </div>
      </aside>

      <div className="auth-panel">
        <Link href="/" className="auth-back">
          <Icon name="arrow-left" size={14} /> Back to home
        </Link>
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p>Sign in to request rides, manage stays or run your campus zone.</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'password' ? 'active' : ''}
              onClick={() => setMode('password')}
            >
              Password
            </button>
            <button
              type="button"
              className={mode === 'code' ? 'active' : ''}
              onClick={() => setMode('code')}
            >
              Phone code
            </button>
          </div>

          {mode === 'password' ? (
            <form className="form-grid" onSubmit={login}>
              <label className="field">
                <span>Phone or email</span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="+255 712 345 678"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="form-note">
                New here?{' '}
                <Link href="/signup" style={{ color: 'var(--green)', fontWeight: 600 }}>
                  Create an account
                </Link>
                . Forgot your password? Contact campus support and we will reset it after
                verifying your identity.
              </p>
            </form>
          ) : (
            <form className="form-grid" onSubmit={verify}>
              <label className="field">
                <span>Phone number</span>
                <div className="inline">
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+255 712 345 678"
                    autoComplete="tel"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void requestOtp()}
                    disabled={otpBusy}
                  >
                    {codeSent ? 'Resend' : 'Send code'}
                  </button>
                </div>
              </label>

              {codeSent && (
                <>
                  <div className="field">
                    <span>6-digit code</span>
                    <OtpInput value={otp} onChange={setOtp} />
                    {devOtp && (
                      <small>
                        Local development code: <b>{devOtp}</b> (no SMS gateway is connected)
                      </small>
                    )}
                  </div>
                  <button className="btn btn-primary btn-block" disabled={otpBusy}>
                    {otpBusy ? 'Verifying…' : 'Verify and sign in'}
                  </button>
                </>
              )}
              <p className="form-note">
                Codes expire after 10 minutes. If your number changed, contact support with your
                student or owner details.
              </p>
            </form>
          )}

          <div className="auth-demo">
            <div>Local demo accounts — tap to fill</div>
            <div className="demo-accounts">
              {demos.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  className="demo-account"
                  onClick={() => fillDemo(demo)}
                >
                  <b>{demo.role}</b>
                  <span>{demo.email}</span>
                  <code>{demo.password}</code>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
