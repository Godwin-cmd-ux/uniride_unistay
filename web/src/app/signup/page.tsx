'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { OtpInput } from '@/components/OtpInput';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { useUniversity } from '@/context/university';
import { api } from '@/lib/api';
import { mediaUrl, roleHome } from '@/lib/format';
import type { AuthUser } from '@/lib/types';

type SignupRole = 'STUDENT' | 'DRIVER' | 'OWNER';

const roles: { value: SignupRole; label: string; blurb: string; icon: 'bed' | 'bike' | 'building' }[] = [
  { value: 'STUDENT', label: 'Student', blurb: 'Request rides and find verified stays near campus.', icon: 'bed' },
  { value: 'DRIVER', label: 'Driver', blurb: 'Earn on campus trips after licence verification.', icon: 'bike' },
  { value: 'OWNER', label: 'Stay owner', blurb: 'List hostels, rooms and beds to nearby students.', icon: 'building' },
];

export default function SignupPage() {
  const router = useRouter();
  const { push } = useToast();
  const { signIn, user, ready } = useAuth();
  const { universities, selected, select, loading: universitiesLoading } = useUniversity();

  const [next, setNext] = useState('');
  const [role, setRole] = useState<SignupRole>('STUDENT');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const [stage, setStage] = useState<'form' | 'verify'>('form');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('next');
    if (target && target.startsWith('/')) setNext(target);
    const requested = params.get('role');
    if (requested === 'STUDENT' || requested === 'DRIVER' || requested === 'OWNER') {
      setRole(requested);
    }
  }, []);

  useEffect(() => {
    if (selected) setUniversityId(selected.id);
    else if (universities[0]) setUniversityId(universities[0].id);
  }, [selected, universities]);

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(next || roleHome(user.role));
  }, [ready, user, next, router]);

  async function register(event: React.FormEvent) {
    event.preventDefault();
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
          body: {
            fullName,
            phone,
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
      push('Account created. Enter the code we sent to verify your phone.', 'success');
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
        { method: 'POST', body: { phone: verifyPhone } },
      );
      setDevOtp(result.devOtp ?? '');
      setOtp('');
      push('A new code was sent', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not resend code', 'error');
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (otp.length !== 6) {
      push('Enter the 6-digit code', 'error');
      return;
    }
    setVerifyBusy(true);
    try {
      const result = await api<{ token: string; user: AuthUser }>('/api/auth/verify-otp', {
        method: 'POST',
        body: { phone: verifyPhone, code: otp },
      });
      signIn(result.token, result.user);
      push('Phone verified. Your account is ready.', 'success');
      router.replace(next || roleHome(result.user.role));
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not verify code', 'error');
    } finally {
      setVerifyBusy(false);
    }
  }

  const activeRole = roles.find((item) => item.value === role)!;

  return (
    <div className="auth">
      <aside className="auth-art">
        <Logo light href="/" />
        <div className="auth-art-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl('/uploads/seed/hostel-exterior.jpg')} alt="" />
        </div>
        <div className="auth-art-copy">
          <span className="auth-badge">
            <Icon name="spark" size={12} /> Built for Tanzanian campuses
          </span>
          <h2>
            Start with your campus. <em>Everything else</em> follows.
          </h2>
          <p>
            Join {universities.length || 'your'} campus communities on UNIRIDE UNISTAY. Verified
            drivers, real hostel inventory and support that answers.
          </p>
        </div>
      </aside>

      <div className="auth-panel">
        <Link href="/" className="auth-back">
          <Icon name="arrow-left" size={14} /> Back to home
        </Link>
        <div className="auth-card">
          {stage === 'form' ? (
            <>
              <h1>Create your account</h1>
              <p>Choose how you will use the network. You can add details after verifying.</p>

              <div className="auth-tabs" role="tablist" aria-label="Account type">
                {roles.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={role === item.value}
                    className={role === item.value ? 'active' : ''}
                    onClick={() => setRole(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="role-blurb">
                <Icon name={activeRole.icon} size={16} /> {activeRole.blurb}
              </div>

              <form className="form-grid" onSubmit={register}>
                <label className="field">
                  <span>Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="As on your ID"
                    autoComplete="name"
                    required
                  />
                </label>
                <label className="field">
                  <span>Phone number</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+255 712 345 678"
                    autoComplete="tel"
                    required
                  />
                  <small>We verify this number with a one-time code.</small>
                </label>
                <label className="field">
                  <span>Email (optional)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
                <label className="field">
                  <span>University</span>
                  <select
                    value={universityId}
                    onChange={(event) => {
                      const match = universities.find((item) => item.id === event.target.value);
                      if (match) select(match);
                      setUniversityId(event.target.value);
                    }}
                    disabled={universitiesLoading}
                    required
                  >
                    {universities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.shortName} — {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/legal/terms" target="_blank">
                      terms of service
                    </Link>{' '}
                    and{' '}
                    <Link href="/legal/privacy" target="_blank">
                      privacy policy
                    </Link>
                    .
                  </span>
                </label>

                <button className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Creating account…' : `Create ${activeRole.label.toLowerCase()} account`}
                </button>
              </form>

              <div className="auth-foot">
                Already have an account? <Link href="/login">Sign in</Link>
              </div>
            </>
          ) : (
            <>
              <h1>Verify your phone</h1>
              <p>
                We sent a 6-digit code to <b>{verifyPhone}</b>. Enter it to activate your account.
              </p>
              <form className="form-grid" onSubmit={verify}>
                <div className="field">
                  <span>Verification code</span>
                  <OtpInput value={otp} onChange={setOtp} />
                  {devOtp && (
                    <small>
                      Local development code: <b>{devOtp}</b> (no SMS gateway is connected)
                    </small>
                  )}
                </div>
                <button className="btn btn-primary btn-block" disabled={verifyBusy}>
                  {verifyBusy ? 'Verifying…' : 'Verify and continue'}
                </button>
                <div className="inline" style={{ justifyContent: 'space-between' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void resend()}>
                    Resend code
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setStage('form')}
                  >
                    Change number
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
