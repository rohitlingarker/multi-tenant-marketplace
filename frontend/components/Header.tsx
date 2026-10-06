'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import IdentitySwitcher from './IdentitySwitcher';
import { useIdentity } from '@/lib/identity';

export default function Header() {
  const { ready, userId, role, logout } = useIdentity();
  const path = usePathname();
  const router = useRouter();
  const links = [
    ...(role === 'VENDOR'
      ? [
          { href: '/vendor/submit', label: 'Submit listing' },
          { href: '/vendor/my-listings', label: 'My listings' },
        ]
      : []),
    ...(role === 'ADMIN' ? [{ href: '/admin/review', label: 'Review queue' }] : []),
    { href: '/storefront', label: 'Storefront' },
  ];

  return (
    <header className="top">
      <nav>
        <span className="brand">Regulated Marketplace</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? 'active' : ''}>
            {l.label}
          </Link>
        ))}
        <span className="spacer" />
        {ready &&
          (userId ? (
            <>
              <span className="who" data-testid="current-user">
                {userId}
              </span>
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
            <Link href="/login" className={path === '/login' ? 'active' : ''} data-testid="login-link">
              Log in
            </Link>
          ))}
      </nav>
      <IdentitySwitcher />
    </header>
  );
}
