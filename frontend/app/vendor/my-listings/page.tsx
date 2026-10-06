'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ErrorBanner from '@/components/ErrorBanner';
import ListingTable from '@/components/ListingTable';
import RoleGate from '@/components/RoleGate';
import { api } from '@/lib/api';
import { useIdentity } from '@/lib/identity';
import { TENANTS } from '@/lib/seed';
import { useListings } from '@/lib/useListings';

function MyListings() {
  const params = useSearchParams();
  const submitted = params.get('submitted');
  const { tenantId } = useIdentity();
  const { items, loading, error } = useListings(api.listListings);
  const storeName = TENANTS.find((t) => t.id === tenantId)?.name ?? tenantId;

  return (
    <>
      <h1>My listings</h1>
      <p className="sub">Your listings in {storeName}.</p>
      {submitted && (
        <div className="banner banner-ok" data-testid="submit-success">
          Listing submitted: {submitted} is waiting for the store admin to review.
        </div>
      )}
      <ErrorBanner error={error} />
      {loading ? (
        <p className="empty">Loading…</p>
      ) : items.length === 0 && !error ? (
        <div className="empty" data-testid="listings-empty">
          You have no listings in this store yet. <Link href="/vendor/submit">Submit one</Link>.
        </div>
      ) : (
        items.length > 0 && <ListingTable listings={items} showReason />
      )}
    </>
  );
}

export default function MyListingsPage() {
  return (
    <RoleGate role="VENDOR">
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <MyListings />
      </Suspense>
    </RoleGate>
  );
}
