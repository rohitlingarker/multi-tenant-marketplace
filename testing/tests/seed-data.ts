// Mirrors seed-data-b.json (see API_CONTRACT.md "Seed Data Quick Reference").
// Keep in sync with the seed file — do not invent ids here.

export const TENANTS = {
  sunrise: 'sunrise-pharmacy', // allows RX, OTC, DME, WELLNESS
  vitalcare: 'vitalcare', // allows OTC, DME, WELLNESS (no RX)
} as const;

export const USERS = {
  vendorA: 'vendor-a-user', // valid pharmacy license
  vendorB: 'vendor-b-user', // valid DME credential
  vendorC: 'vendor-c-user', // DME credential expired
  adminSunrise: 'admin-sunrise',
  adminVitalcare: 'admin-vitalcare',
} as const;

export const SKUS = {
  rx100: 'RX-100', // RX
  otc200: 'OTC-200', // OTC
  dme300: 'DME-300', // DME
  dme301: 'DME-301', // DME
  wel400: 'WEL-400', // WELLNESS
} as const;

// Confirmed against backend/app/db/seed-data.json: every seeded user's
// bcrypt hash verifies against this plaintext. Override with TEST_PASSWORD
// if that ever changes.
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

// Matches backend/app/core/errors.py's HTTP_STATUS_BY_CODE.
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  CATEGORY_NOT_ALLOWED: 'CATEGORY_NOT_ALLOWED',
  RX_VENDOR_NOT_LICENSED: 'RX_VENDOR_NOT_LICENSED',
  DME_VENDOR_NOT_CREDENTIALED: 'DME_VENDOR_NOT_CREDENTIALED',
  PRICE_INVALID: 'PRICE_INVALID',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  REJECTION_REASON_REQUIRED: 'REJECTION_REASON_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
} as const;
