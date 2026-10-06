import type { ReactNode } from 'react';
import StatusBadge from './StatusBadge';
import { centsToDollars } from '@/lib/money';
import type { Listing } from '@/lib/types';

export default function ListingTable({
  listings,
  showVendor = false,
  showReason = false,
  actions,
}: {
  listings: Listing[];
  showVendor?: boolean;
  showReason?: boolean;
  actions?: (listing: Listing) => ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product</th>
            {showVendor && <th>Vendor</th>}
            <th>Price</th>
            <th>Status</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} data-testid={`listing-row-${l.id}`}>
              <td data-testid="listing-sku">{l.sku}</td>
              <td>{l.productName}</td>
              {showVendor && <td>{l.vendorId}</td>}
              <td>{centsToDollars(l.priceCents)}</td>
              <td>
                <StatusBadge status={l.status} />
                {showReason && l.status === 'REJECTED' && (
                  <div className="reason" data-testid="listing-rejection-reason">
                    <strong>Reason from store admin:</strong> {l.rejectionReason || 'No reason given.'}
                  </div>
                )}
              </td>
              {actions && <td className="actions">{actions(l)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
