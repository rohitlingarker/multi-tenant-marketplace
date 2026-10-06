'use client';

import ErrorBanner from '@/components/ErrorBanner';
import { api } from '@/lib/api';
import { useIdentity } from '@/lib/identity';
import { centsToDollars } from '@/lib/money';
import { TENANTS } from '@/lib/seed';
import { useListings } from '@/lib/useListings';

export default function StorefrontPage() {
  const { tenantId } = useIdentity();
  const { items, loading, error } = useListings(api.storefront);
  const storeName = TENANTS.find((t) => t.id === tenantId)?.name ?? tenantId;

  return (
    <>
      <h1>{storeName}</h1>
      <p className="sub">Approved products available in this store.</p>
      <ErrorBanner error={error} />
      {loading ? (
        <p className="empty">Loading…</p>
      ) : items.length === 0 && !error ? (
        <div className="empty" data-testid="storefront-empty">
          No products available in this store yet.
        </div>
      ) : (
        <div className="grid">
          {items.map((l) => (
            <article key={l.id} className="product" data-testid={`storefront-item-${l.sku}`}>
              <strong>{l.productName}</strong>
              <div className="meta">
                {l.sku} · {l.category}
              </div>
              <div className="price">{centsToDollars(l.priceCents)}</div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
