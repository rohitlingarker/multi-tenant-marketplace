import { test, expect, type Page } from '@playwright/test';
import { TENANTS, USERS, SKUS, TEST_PASSWORD, ERROR_CODES } from './seed-data';

// Exercises the real Next.js screens in frontend/app. Selectors are the
// data-testid attributes those components actually render — see
// frontend/app/login/page.tsx, vendor/submit/page.tsx, admin/review/page.tsx,
// storefront/page.tsx, and components/IdentitySwitcher.tsx.
//
// Requires both servers running: `uvicorn app.main:app --port 8000` in
// backend/, and `npm run dev` in frontend/ (port 3000) — same as api.spec.ts,
// these fail with a clear connection error rather than silently skipping if
// either isn't up.

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

// Same reset as tests/fixtures.ts — keeps each UI test's listings isolated
// from the others on the shared dev backend.
test.beforeEach(async ({ request }) => {
  await request.post(`${BACKEND_URL}/__test__/reset`);
});

async function login(page: Page, username: string, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/(vendor|admin)\//);
}

async function logout(page: Page) {
  await page.getByTestId('logout-button').click();
  await page.waitForURL(/\/login/);
}

// Admins are locked to their own tenant (see IdentitySwitcher.tsx); only
// meaningful for a logged-out visitor or a vendor.
async function switchStore(page: Page, tenantId: string) {
  await page.getByTestId(`identity-tenant-${tenantId}`).click();
}

async function submitListing(page: Page, sku: string, priceCents: number) {
  await page.goto('/vendor/submit');
  await page.getByTestId('submit-sku-select').selectOption(sku);
  await page.getByTestId('submit-price-input').fill(String(priceCents));
  await page.getByTestId('submit-button').click();
}

test.describe('Marketplace UI', () => {
  // Criteria 1, 5, 6
  test('vendor submits, admin approves, listing appears on its own storefront', async ({ page }) => {
    await login(page, USERS.vendorB);
    await submitListing(page, SKUS.dme300, 7999);

    await expect(page).toHaveURL(/\/vendor\/my-listings/);
    await expect(page.getByTestId('submit-success')).toContainText(SKUS.dme300);
    await expect(page.getByTestId('listing-status')).toHaveText('SUBMITTED');

    await logout(page);
    await login(page, USERS.adminSunrise);

    const row = page.locator('tr', { hasText: SKUS.dme300 });
    await expect(row).toBeVisible();
    await row.getByTestId(/^approve-button-/).click();
    // Approving moves the row from the review queue into "Live on
    // storefront" on the same page — it doesn't disappear, it gets a
    // Delist button instead of Approve/Reject.
    await expect(row.getByTestId(/^delist-button-/)).toBeVisible();
    await expect(page.getByTestId('queue-empty')).toBeVisible();

    await page.goto('/storefront');
    await expect(page.getByTestId(`storefront-item-${SKUS.dme300}`)).toBeVisible();
  });

  // Criterion 2
  test('vitalcare rejects RX category with a plain-language error', async ({ page }) => {
    await login(page, USERS.vendorA);
    await switchStore(page, TENANTS.vitalcare);
    await submitListing(page, SKUS.rx100, 2999);

    const banner = page.getByTestId('submit-error');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-error-code', ERROR_CODES.CATEGORY_NOT_ALLOWED);
  });

  // Criterion 3
  test('vendor C sees a DME credential error', async ({ page }) => {
    await login(page, USERS.vendorC);
    await submitListing(page, SKUS.dme301, 5999);

    const banner = page.getByTestId('submit-error');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-error-code', ERROR_CODES.DME_VENDOR_NOT_CREDENTIALED);
  });

  // Criterion 8
  test('vitalcare storefront never shows a sunrise-only listing', async ({ page }) => {
    await login(page, USERS.vendorB);
    await submitListing(page, SKUS.dme300, 7999);

    await logout(page);
    await login(page, USERS.adminSunrise);
    const row = page.locator('tr', { hasText: SKUS.dme300 });
    await row.getByTestId(/^approve-button-/).click();

    await logout(page);
    await switchStore(page, TENANTS.vitalcare);
    await page.goto('/storefront');
    await expect(page.getByTestId(`storefront-item-${SKUS.dme300}`)).not.toBeVisible();
  });
});
