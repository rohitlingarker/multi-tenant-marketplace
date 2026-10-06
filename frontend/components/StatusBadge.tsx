import type { ListingStatus } from '@/lib/types';

const LABELS: Record<ListingStatus, string> = {
  SUBMITTED: 'Awaiting review',
  APPROVED: 'Live',
  REJECTED: 'Rejected',
  DELISTED: 'Delisted',
};

export default function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`} data-testid="listing-status" data-status={status}>
      {LABELS[status]}
    </span>
  );
}
