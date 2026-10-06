import type { ListingStatus } from '@/lib/types';

export default function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`} data-testid="listing-status">
      {status}
    </span>
  );
}
