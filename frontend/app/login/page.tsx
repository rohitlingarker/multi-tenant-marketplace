'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ErrorBanner from '@/components/ErrorBanner';
import { api } from '@/lib/api';
import { useIdentity } from '@/lib/identity';
import { USERS } from '@/lib/seed';
import type { ApiError } from '@/lib/types';

const HIGHLIGHTS = [
  'One login for vendors and store admins',
  'Compliance checked automatically at submission',
  'Admins approve or reject with a clear reason',
  'Approved listings go live on that store only',
];

export default function LoginPage() {
  const router = useRouter();
  const { login, userId, role } = useIdentity();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await api.login(username.trim(), password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error); // backend returns a generic INVALID_CREDENTIALS for any failure
      return;
    }
    login(res.data);
    router.push(res.data.role === 'ADMIN' ? '/admin/review' : '/vendor/submit');
  }

  return (
    <div className="login-layout">
      <section className="login-intro">
        <span className="eyebrow">Welcome back</span>
        <h1>Sell regulated products, safely.</h1>
        <p className="sub">
          {userId
            ? `You are signed in as ${userId} (${role ?? 'unknown role'}). Logging in again switches account.`
            : 'Sign in as a vendor or a store admin to continue.'}
        </p>
        <ul className="checks">
          {HIGHLIGHTS.map((h) => (
            <li key={h}>
              <span className="tick" aria-hidden="true">
                ✓
              </span>
              {h}
            </li>
          ))}
        </ul>
      </section>

      <form className="card login-card" onSubmit={onSubmit} noValidate>
        <h2>Log in</h2>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          data-testid="login-username"
          autoComplete="username"
          placeholder="e.g. vendor-b-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          data-testid="login-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <ErrorBanner error={error} testId="login-error" />
        <button
          type="submit"
          className="btn btn-primary btn-block"
          data-testid="login-submit"
          disabled={busy || !username.trim() || !password}
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>

        <div className="quick">
          <span className="switch-label">Demo accounts</span>
          <div className="quick-chips">
            {USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`chip ${username === u.id ? 'active' : ''}`}
                data-testid={`login-fill-${u.id}`}
                onClick={() => setUsername(u.id)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
