import type { ApiError } from './types';

// Fallback only: the UI shows the server's `message` when it sends one.
const FALLBACK: Record<string, string> = {
  CATEGORY_NOT_ALLOWED: "This store doesn't sell this category.",
  RX_VENDOR_NOT_LICENSED: 'Your pharmacy license is missing or expired.',
  DME_VENDOR_NOT_CREDENTIALED: 'Your DME credential is missing or expired.',
  PRICE_INVALID: 'Price must be a whole number of cents greater than 0.',
  INVALID_STATUS_TRANSITION: "This listing can't move to that status from where it is now.",
  REJECTION_REASON_REQUIRED: 'Please give a reason when rejecting a listing.',
  FORBIDDEN: "You don't have permission to do that here.",
  NOT_FOUND: "We couldn't find that listing in this store.",
  UNAUTHENTICATED: 'Your session has expired. Please log in again.',
  TENANT_NOT_RESOLVED: "We couldn't tell which store this is. Pick a store in the header.",
  PRODUCT_NOT_FOUND: "That product isn't in the catalog.",
  INVALID_CREDENTIALS: 'Invalid username or password.',
  NETWORK_ERROR: "Can't reach the server. Is the backend running on port 8000?",
};

export function friendlyMessage(error: ApiError): string {
  return error.message?.trim() || FALLBACK[error.code] || 'Something went wrong. Please try again.';
}
