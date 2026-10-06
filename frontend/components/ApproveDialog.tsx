'use client';

import { useState } from 'react';
import ErrorBanner from './ErrorBanner';
import ListingSummary from './ListingSummary';
import { api } from '@/lib/api';
import type { ApiError, Listing } from '@/lib/types';

export default function ApproveDialog({
  listing,
  onClose,
  onDone,
}: {
  listing: Listing;
  onClose: () => void;
  onDone: (approved: Listing) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await api.approve(listing.id);
    setBusy(false);
    if (res.ok) onDone(res.data);
    else setError(res.error);
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Approve ${listing.sku}`}>
      <div className="dialog">
        <h3>Approve listing</h3>
        <p className="sub">Are you sure you want to approve this listing? It will go live on your storefront.</p>
        <ListingSummary listing={listing} />
        <ErrorBanner error={error} testId="approve-error" />
        <div className="row">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-testid="approve-confirm"
            onClick={confirm}
            disabled={busy}
          >
            {busy ? 'Approving…' : 'Confirm approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
