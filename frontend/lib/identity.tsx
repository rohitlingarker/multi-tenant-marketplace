'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_IDENTITY, USERS, roleOf } from './seed';
import type { Identity, LoginUser } from './types';

interface IdentityCtx extends Identity {
  ready: boolean;
  /** Bumps on every identity change so screens can drop stale tenant data and refetch. */
  version: number;
  /** Store the user returned by POST /auth/login. */
  login: (user: LoginUser) => void;
  logout: () => void;
  /** Demo-only: jump to a seed user without a password (see IdentitySwitcher). */
  setUser: (userId: string) => void;
  setTenant: (tenantId: string) => void;
}

const Ctx = createContext<IdentityCtx | null>(null);

// Hackathon-grade session (see claude.md section 5): the id lives in localStorage and is sent as X-User-Id.
function persist(identity: Identity) {
  try {
    if (identity.userId) localStorage.setItem('userId', identity.userId);
    else localStorage.removeItem('userId');
    if (identity.role) localStorage.setItem('role', identity.role);
    else localStorage.removeItem('role');
    localStorage.setItem('tenantId', identity.tenantId);
  } catch {
    /* storage blocked: state still works for this tab */
  }
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity>(DEFAULT_IDENTITY);
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    try {
      const userId = localStorage.getItem('userId') || null;
      const stored = localStorage.getItem('role');
      setIdentity({
        userId,
        tenantId: localStorage.getItem('tenantId') || DEFAULT_IDENTITY.tenantId,
        // Sessions saved before the role was persisted fall back to the seed lookup.
        role: stored === 'VENDOR' || stored === 'ADMIN' ? stored : roleOf(userId),
      });
    } catch {
      /* keep defaults */
    }
    setReady(true);
  }, []);

  const apply = useCallback((next: Identity) => {
    persist(next);
    setIdentity(next);
    setVersion((v) => v + 1);
  }, []);

  const login = useCallback(
    (user: LoginUser) => {
      // Admins belong to one tenant; vendors are global and keep the store they were browsing.
      apply({ userId: user.id, tenantId: user.tenantId ?? identity.tenantId, role: user.role });
    },
    [apply, identity.tenantId],
  );

  const logout = useCallback(
    () => apply({ userId: null, tenantId: identity.tenantId, role: null }),
    [apply, identity.tenantId],
  );

  const setUser = useCallback(
    (userId: string) => {
      const adminTenant = USERS.find((u) => u.id === userId)?.tenantId;
      apply({ userId, tenantId: adminTenant ?? identity.tenantId, role: roleOf(userId) });
    },
    [apply, identity.tenantId],
  );

  const setTenant = useCallback(
    (tenantId: string) => {
      if (identity.role === 'ADMIN') return;
      apply({ ...identity, tenantId });
    },
    [apply, identity],
  );

  return (
    <Ctx.Provider
      value={{ ...identity, ready, version, login, logout, setUser, setTenant }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useIdentity(): IdentityCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}
