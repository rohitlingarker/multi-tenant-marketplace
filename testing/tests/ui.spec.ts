import { test, expect } from '@playwright/test';
import { TENANTS, USERS, SKUS } from './seed-data';

// These exercise the Next.js screens (Dev 2). They assume localStorage-based
// identity switching per QA_QUALITY_OWNER.md's hackathon-grade session model:
// the frontend reads { userId, tenantId } from localStorage and sends them
// as X-User-Id / X-Tenant-Id on every API call.
//
// Skipped until the frontend scaffold exists — flip on by setting
// FRONTEND_READY=1 once /vendor/submit, /admin/review and /storefront land.
test.skip(!process.env.FRONTEND_READY, 'Frontend screens not built yet — set FRONTEND_READY=1 to run');

async function actAs(page: import('@playwright/test').Page, userId: string, tenantId: string) {
  await page.addInitScript(
    ([u, t]) => {
      window.localStorage.setItem('userId', u);
      window.localStorage.setItem('tenantId', t);
    },
    [userId, tenantId]
  );
}

test.describe('Marketplace UI', () => {
  // Criteria 1, 5, 6: happy path end to end
  test('vendor submits, admin approves, listing appears on storefront', async ({ page }) => {
    await actAs(page, USERS.vendorB, TENANTS.sunrise);

    await page.goto('/vendor/submit');
    await page.selectOption('select', SKUS.dme300);
    await page.fill('input[placeholder*="price" i]', '7999');
    await page.click('button:has-text("Submit")');

    await expect(page.locator('text=submitted')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/my-listings/);
    await expect(page.locator(`text=${SKUS.dme300}`)).toBeVisible();
    await expect(page.locator('text=SUBMITTED')).toBeVisible();

    await actAs(page, USERS.adminSunrise, TENANTS.sunrise);
    await page.goto('/admin/review');
    await expect(page.locator(`text=${SKUS.dme300}`)).toBeVisible();
    await page.click('button:has-text("Approve")');
    await expect(page.locator(`text=${SKUS.dme300}`)).not.toBeVisible({ timeout: 3000 });

    await page.goto('/storefront');
    await expect(page.locator(`text=${SKUS.dme300}`)).toBeVisible();
    await expect(page.locator('text=$79.99')).toBeVisible();
  });

  // Criterion 2
  test('vitalcare rejection shows CATEGORY_NOT_ALLOWED in plain language', async ({ page }) => {
    await actAs(page, USERS.vendorA, TENANTS.vitalcare);
    await page.goto('/vendor/submit');
    await page.selectOption('select', SKUS.rx100);
    await page.fill('input[placeholder*="price" i]', '2999');
    await page.click('button:has-text("Submit")');

    await expect(page.locator('text=does not allow')).toBeVisible({ timeout: 5000 });
  });

  // Criterion 3
  test('vendor C sees a plain-language credential error', async ({ page }) => {
    await actAs(page, USERS.vendorC, TENANTS.sunrise);
    await page.goto('/vendor/submit');
    await page.selectOption('select', SKUS.dme301);
    await page.fill('input[placeholder*="price" i]', '5999');
    await page.click('button:has-text("Submit")');

    await expect(page.locator('text=credential')).toBeVisible({ timeout: 5000 });
  });

  // Criterion 8
  test('vitalcare storefront never shows a sunrise-only listing', async ({ page }) => {
    await actAs(page, USERS.vendorB, TENANTS.sunrise);
    await page.goto('/vendor/submit');
    await page.selectOption('select', SKUS.dme300);
    await page.fill('input[placeholder*="price" i]', '7999');
    await page.click('button:has-text("Submit")');

    await actAs(page, USERS.adminSunrise, TENANTS.sunrise);
    await page.goto('/admin/review');
    await page.click('button:has-text("Approve")');

    await actAs(page, USERS.adminSunrise, TENANTS.vitalcare);
    await page.goto('/storefront');
    await expect(page.locator(`text=${SKUS.dme300}`)).not.toBeVisible();
  });
});
