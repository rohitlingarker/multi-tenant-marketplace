'use client';

import { useState } from 'react';
import ErrorBanner from '@/components/ErrorBanner';
import ListingTable from '@/components/ListingTable';
import RejectDialog from '@/components/RejectDialog';
import RoleGate from '@/components/RoleGate';
import { api } from '@/lib/api';
import { useIdentity } from '@/lib/identity';
import { TENANTS } from '@/lib/seed';
import type { ApiError, Listing } from '@/lib/types';
import { useListings } from '@/lib/useListings';

function ReviewQueue() {
  const { tenantId } = useIdentity();
  const { items, loading, error, refetch } = useListings(api.listListings);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const storeName = TENANTS.find((t) => t.id === tenantId)?.name ?? tenantId;

  const queue = items.filter((l) => l.status === 'SUBMITTED');
  const live = items.filter((l) => l.status === 'APPROVED');

  async function run(listing: Listing, action: (id: string) => ReturnType<typeof api.approve>) {
    setBusyId(listing.id);
    setActionError(null);
    const res = await action(listing.id);
    setBusyId(null);
    if (!res.ok) setActionError(res.error);
    await refetch(); // always refetch so the UI reflects the server's truth, even after an error
  }

  return (
    <>
      <h1>Review queue</h1>
      <p className="sub">Submitted listings for {storeName}. Compliance checks already passed at submission.</p>
      <ErrorBanner error={error} />
      <ErrorBanner error={actionError} testId="action-error" />

      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          {queue.length === 0 ? (
            <div className="empty" data-testid="queue-empty">
              Nothing waiting for review.
            </div>
          ) : (
            <ListingTable
              listings={queue}
              showVendor
              actions={(l) => (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    data-testid={`approve-button-${l.id}`}
                    disabled={busyId === l.id}
                    onClick={() => run(l, api.approve)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn"
                    data-testid={`reject-button-${l.id}`}
                    disabled={busyId === l.id}
                    onClick={() => setRejecting(l)}
                  >
                    Reject
                  </button>
                </>
              )}
            />
          )}

          {live.length > 0 && (
            <>
              <h2>Live on storefront</h2>
              <ListingTable
                listings={live}
                showVendor
                actions={(l) => (
                  <button
                    type="button"
                    className="btn"
                    data-testid={`delist-button-${l.id}`}
                    disabled={busyId === l.id}
                    onClick={() => run(l, api.delist)}
                  >
                    Delist
                  </button>
                )}
              />
            </>
          )}
        </>
      )}

      {rejecting && (
        <RejectDialog
          listing={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            refetch();
          }}
        />
      )}
    </>
  );
}

export default function ReviewPage() {
  return (
    <RoleGate role="ADMIN">
      <ReviewQueue />
    </RoleGate>
  );
}
