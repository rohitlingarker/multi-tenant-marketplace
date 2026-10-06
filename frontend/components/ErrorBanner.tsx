import { friendlyMessage } from '@/lib/errors';
import type { ApiError } from '@/lib/types';

export default function ErrorBanner({ error, testId = 'error-banner' }: { error: ApiError | null; testId?: string }) {
  if (!error) return null;
  return (
    <div className="banner banner-error" role="alert" data-testid={testId} data-error-code={error.code}>
      {friendlyMessage(error)}
    </div>
  );
}
