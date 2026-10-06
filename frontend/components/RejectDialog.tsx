'use client';

import { useState } from 'react';
import ErrorBanner from './ErrorBanner';
import { api } from '@/lib/api';
import type { ApiError, Listing } from '@/lib/types';

export default function RejectDialog({
  listing,
  onClose,
  onDone,
}: {
  listing: Listing;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await api.reject(listing.id, reason.trim());
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.error); // e.g. REJECTION_REASON_REQUIRED, INVALID_STATUS_TRANSITION
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Reject ${listing.sku}`}>
      <div className="dialog">
        <h3>
          Reject {listing.productName} ({listing.sku})
        </h3>
        <label htmlFor="reject-reason">Reason (the vendor will see this)</label>
        <textarea
          id="reject-reason"
          data-testid="reject-reason-input"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Product photos missing"
        />
        <ErrorBanner error={error} testId="reject-error" />
        <div className="row">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            data-testid="reject-confirm"
            onClick={confirm}
            disabled={busy || reason.trim() === ''}
          >
            {busy ? 'Rejecting…' : 'Confirm reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
