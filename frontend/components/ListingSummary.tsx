import { centsToDollars } from '@/lib/money';
import { vendorName } from '@/lib/seed';
import type { Listing } from '@/lib/types';

/** Read-only recap of a listing, shown in the approve and reject dialogs. */
export default function ListingSummary({ listing }: { listing: Listing }) {
  const rows: [string, string][] = [
    ['SKU', listing.sku],
    ['Product', listing.productName],
    ['Category', listing.category],
    ['Vendor', vendorName(listing.vendorId)],
    ['Price', centsToDollars(listing.priceCents)],
  ];
  return (
    <dl className="summary" data-testid="listing-summary">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
