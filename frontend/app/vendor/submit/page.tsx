'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ErrorBanner from '@/components/ErrorBanner';
import RoleGate from '@/components/RoleGate';
import { api } from '@/lib/api';
import { useIdentity } from '@/lib/identity';
import { parseCents } from '@/lib/money';
import { PRODUCTS, TENANTS } from '@/lib/seed';
import type { ApiError } from '@/lib/types';

function SubmitForm() {
  const router = useRouter();
  const { tenantId } = useIdentity();
  const [sku, setSku] = useState(PRODUCTS[0].sku);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const storeName = TENANTS.find((t) => t.id === tenantId)?.name ?? tenantId;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseCents(price);
    if (cents === null || cents <= 0) {
      // server stays authoritative; this just saves a round trip
      setError({ code: 'PRICE_INVALID', message: 'Enter the price in whole cents, greater than 0 (e.g. 7999).' });
      return;
    }
    setBusy(true);
    const res = await api.submitListing(sku, cents);
    setBusy(false);
    if (res.ok) router.push(`/vendor/my-listings?submitted=${encodeURIComponent(sku)}`);
    else setError(res.error);
  }

  return (
    <>
      <h1>Submit a listing</h1>
      <p className="sub">
        Listing into <strong>{storeName}</strong>. Change the store in the header to list somewhere else.
      </p>
      <form className="card" onSubmit={onSubmit} noValidate>
        <label htmlFor="sku">Product</label>
        <select id="sku" data-testid="submit-sku-select" value={sku} onChange={(e) => setSku(e.target.value)}>
          {PRODUCTS.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>

        <label htmlFor="price">Price (in cents)</label>
        <input
          id="price"
          data-testid="submit-price-input"
          inputMode="numeric"
          placeholder="price in cents, e.g. 7999 = $79.99"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <ErrorBanner error={error} testId="submit-error" />
        <div className="row">
          <button type="submit" className="btn btn-primary" data-testid="submit-button" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </>
  );
}

export default function SubmitPage() {
  return (
    <RoleGate role="VENDOR">
      <SubmitForm />
    </RoleGate>
  );
}
