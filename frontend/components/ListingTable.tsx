import type { ReactNode } from 'react';
import AuditTrail from './AuditTrail';
import StatusBadge from './StatusBadge';
import { centsToDollars } from '@/lib/money';
import { vendorName } from '@/lib/seed';
import type { Listing } from '@/lib/types';

export default function ListingTable({
  listings,
  showVendor = false,
  showReason = false,
  reasonLabel = 'Reason from store admin:',
  actions,
}: {
  listings: Listing[];
  showVendor?: boolean;
  showReason?: boolean;
  reasonLabel?: string;
  actions?: (listing: Listing) => ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product</th>
            <th>Category</th>
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
              <td>
                <span className="chip-cat" data-testid="listing-category">{l.category}</span>
              </td>
              {showVendor && <td>{vendorName(l.vendorId)}</td>}
              <td>{centsToDollars(l.priceCents)}</td>
              <td>
                <StatusBadge status={l.status} />
                {showReason && l.status === 'REJECTED' && (
                  <div className="reason" data-testid="listing-rejection-reason">
                    <strong>{reasonLabel}</strong> {l.rejectionReason || 'No reason given.'}
                  </div>
                )}
                {l.audit?.length > 0 && (
                  <details className="history">
                    <summary>History</summary>
                    <AuditTrail audit={l.audit} />
                  </details>
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
