import { STATUS_LABELS } from './StatusBadge';
import type { AuditEntry } from '@/lib/types';

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Newest first, like the audit timeline in the design: status, who, when, and the reason if any. */
export default function AuditTrail({ audit }: { audit: AuditEntry[] }) {
  return (
    <ol className="timeline" data-testid="audit-trail">
      {[...audit].reverse().map((e, i) => (
        <li key={`${e.at}-${i}`} className={`dot-${e.status.toLowerCase()}`}>
          <strong>{STATUS_LABELS[e.status]}</strong> by {e.byUserId}
          <div className="when">{when(e.at)}</div>
          {e.reason && <div className="reason-note">“{e.reason}”</div>}
        </li>
      ))}
    </ol>
  );
}
