'use client';

import { useIdentity } from '@/lib/identity';
import { TENANTS, USERS } from '@/lib/seed';

// Password-less user jump for demos and local testing. Off by default so login is the real path;
// enable with NEXT_PUBLIC_DEV_SWITCHER=true in frontend/.env.local.
const DEV_SWITCHER = process.env.NEXT_PUBLIC_DEV_SWITCHER === 'true';

// Buttons, not <select>: the submit form owns the page's only <select>.
export default function IdentitySwitcher() {
  const { userId, tenantId, role, setUser, setTenant } = useIdentity();
  // Admins act only in their own store, so other stores aren't shown to them at all.
  const stores = role === 'ADMIN' ? TENANTS.filter((t) => t.id === tenantId) : TENANTS;

  return (
    <div className="switcher">
      {DEV_SWITCHER && (
        <div className="switch-group" data-testid="identity-user-select" role="group" aria-label="Acting as">
          <span className="switch-label">User</span>
          {USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`chip ${u.id === userId ? 'active' : ''}`}
              aria-pressed={u.id === userId}
              data-testid={`identity-user-${u.id}`}
              onClick={() => setUser(u.id)}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}
      <div className="switch-group" data-testid="identity-tenant-select" role="group" aria-label="Store">
        <span className="switch-label">Store</span>
        {stores.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`chip ${t.id === tenantId ? 'active' : ''}`}
            aria-pressed={t.id === tenantId}
            data-testid={`identity-tenant-${t.id}`}
            onClick={() => setTenant(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
