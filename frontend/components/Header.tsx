'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import IdentitySwitcher from './IdentitySwitcher';
import { useIdentity } from '@/lib/identity';

/** Left sidebar: brand, current store, role-based navigation, and the signed-in user. */
export default function Header() {
  const { ready, userId, tenantId, role, logout } = useIdentity();
  const path = usePathname();
  const router = useRouter();
  const links = [
    ...(role === 'VENDOR'
      ? [
          { href: '/vendor/submit', label: 'Submit listing', icon: '+' },
          { href: '/vendor/my-listings', label: 'My listings', icon: '≡' },
        ]
      : []),
    ...(role === 'ADMIN' ? [{ href: '/admin/review', label: 'Review queue', icon: '✓' }] : []),
    { href: '/storefront', label: 'Storefront', icon: '▦' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">Regulated Marketplace</div>

      <div className="store-card" data-testid="current-store">
        <IdentitySwitcher />
      </div>

      <nav aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? 'active' : ''}>
            <span className="nav-icon" aria-hidden="true">
              {l.icon}
            </span>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-foot">
        {ready &&
          (userId ? (
            <>
              <div className="who-block">
                <span className="who" data-testid="current-user">
                  {userId}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                data-testid="logout-button"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm" data-testid="login-link">
              Log in
            </Link>
          ))}
      </div>
    </aside>
  );
}
