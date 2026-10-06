'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/lib/identity';
import type { Role } from '@/lib/types';

/** Sends logged-out visitors to /login; shows a FORBIDDEN-style notice when the role doesn't fit. */
export default function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const { ready, userId, role: current } = useIdentity();

  useEffect(() => {
    if (ready && !userId) router.replace('/login');
  }, [ready, userId, router]);

  if (!ready || !userId) return <p className="empty">Loading…</p>;
  if (current !== role) {
    return (
      <div className="banner banner-error" role="alert" data-testid="error-banner" data-error-code="FORBIDDEN">
        This screen is for {role === 'ADMIN' ? 'store admins' : 'vendors'}. You are signed in as {userId}.{' '}
        <Link href="/login">Switch account</Link>
      </div>
    );
  }
  return <>{children}</>;
}
