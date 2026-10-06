# QA: Quality Owner (Playwright + TypeScript) Guide

**Role:** Define acceptance criteria, automate tests, verify quality, make ship decision  
**Time:** 50 minutes total (setup 10 min, write tests 15 min, run 15 min, report 10 min)  
**Language:** TypeScript + Playwright  

---

## 🎯 Your Mission (In Priority Order)

```
1. Define top 8 acceptance criteria (share with team at start)
2. Set up Playwright project (config, fixtures, structure)
3. Write API tests:
   - Tenant isolation (sunrise cannot see vitalcare)
   - Category validation (vitalcare rejects RX)
   - License validation (vendor-b rejected for RX)
   - DME credential validation (vendor-c expired)
   - Price validation (zero price rejected)
4. Write UI tests:
   - Happy path: vendor submit → admin approve → storefront
   - Rejection case: show error messages
5. Run tests as features land (standup at 25 min)
6. Report results at demo (45 min)
7. Make ship/no-ship call
```

---

## 📋 Top 8 Acceptance Criteria

These are what MUST work for a "ship" decision:

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Vendor can submit a listing with SKU + price | ? |
| 2 | Submission is rejected for invalid category (vitalcare rejects RX) | ? |
| 3 | Submission is rejected for expired license (vendor-c DME) | ? |
| 4 | Submission is rejected for invalid price (≤0) | ? |
| 5 | Admin can approve a SUBMITTED listing | ? |
| 6 | Approved listing appears on storefront for that tenant only | ? |
| 7 | Rejected listing does not appear on storefront | ? |
| 8 | Tenant isolation: sunrise listings invisible to vitalcare | ? |

---

## 🛠️ Playwright Setup (First 10 Minutes)

### Install & Config

```bash
npm install -D @playwright/test
npx playwright install
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 1,  // Single thread for now
  
  use: {
    baseURL: 'http://localhost:3000',  // Next.js dev server
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run dev',  // Start Next.js
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Test Fixture for API

```typescript
// tests/fixtures.ts
import { test as base, expect } from '@playwright/test';

interface ApiFixture {
  headers: (userId: string, tenantId: string) => Record<string, string>;
  request: (path: string, method: string, body?: any, userId?: string, tenantId?: string) => Promise<any>;
}

export const test = base.extend<ApiFixture>({
  headers: async ({}, use) => {
    await use((userId: string, tenantId: string) => ({
      'X-User-Id': userId,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    }));
  },

  request: async ({ page }, use) => {
    const apiRequest = async (
      path: string,
      method: string = 'GET',
      body?: any,
      userId: string = 'vendor-a-user',
      tenantId: string = 'sunrise-pharmacy'
    ) => {
      const response = await page.request.fetch(
        `http://localhost:8000${path}`,
        {
          method,
          headers: {
            'X-User-Id': userId,
            'X-Tenant-Id': tenantId,
            'Content-Type': 'application/json',
          },
          data: body ? JSON.stringify(body) : undefined,
        }
      );
      return response.json();
    };

    await use(apiRequest);
  },
});

export { expect };
```

---

## 🧪 API Tests (Acceptance Criteria 1-4)

```typescript
// tests/api.spec.ts
import { test, expect } from './fixtures';

test.describe('Listing API', () => {
  
  // Criterion 1: Vendor can submit
  test('Vendor submits a valid listing', async ({ request }) => {
    const result = await request(
      '/listings',
      'POST',
      {
        sku: 'DME-300',
        priceCents: 7999,
      },
      'vendor-b-user',
      'sunrise-pharmacy'
    );

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('SUBMITTED');
    expect(result.data.sku).toBe('DME-300');
  });

  // Criterion 2: Rejected for invalid category
  test('Vitalcare rejects RX category', async ({ request }) => {
    const result = await request(
      '/listings',
      'POST',
      {
        sku: 'RX-100',
        priceCents: 2999,
      },
      'vendor-a-user',
      'vitalcare'  // VitalCare doesn't allow RX
    );

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('CATEGORY_NOT_ALLOWED');
  });

  // Criterion 3: Rejected for expired license
  test('Vendor C DME is rejected (credential expired)', async ({ request }) => {
    const result = await request(
      '/listings',
      'POST',
      {
        sku: 'DME-301',
        priceCents: 5999,
      },
      'vendor-c-user',
      'sunrise-pharmacy'
    );

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('DME_VENDOR_NOT_CREDENTIALED');
  });

  // Criterion 4: Rejected for invalid price
  test('Zero price is rejected', async ({ request }) => {
    const result = await request(
      '/listings',
      'POST',
      {
        sku: 'DME-300',
        priceCents: 0,
      },
      'vendor-b-user',
      'sunrise-pharmacy'
    );

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('PRICE_INVALID');
  });

  // Criterion 8: Tenant isolation
  test('Sunrise user cannot see vitalcare listings', async ({ request }) => {
    // First, create a listing in vitalcare
    await request(
      '/listings',
      'POST',
      { sku: 'OTC-200', priceCents: 999 },
      'vendor-b-user',  // Vendor B can sell OTC
      'vitalcare'
    );

    // Now try to fetch listings from sunrise context
    const result = await request(
      '/listings',
      'GET',
      undefined,
      'admin-sunrise',
      'sunrise-pharmacy'
    );

    // Should NOT see the vitalcare listing
    const vitacareListings = result.data.listings.filter(
      (l: any) => l.tenantId === 'vitalcare'
    );
    expect(vitacareListings.length).toBe(0);
  });
});
```

---

## 🎨 UI Tests (Acceptance Criteria 5-7)

```typescript
// tests/ui.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Marketplace UI', () => {
  
  // Criterion 5 & 6: Happy path
  test('Vendor submits, admin approves, appears on storefront', async ({ page }) => {
    // 1. Vendor B submits DME-300
    await page.goto('/vendor/submit');
    await page.selectOption('select', 'DME-300');
    await page.fill('input[placeholder*="price"]', '7999');
    await page.click('button:has-text("Submit")');

    // Wait for success message
    await expect(page.locator('text=submitted')).toBeVisible({ timeout: 5000 });

    // 2. Redirect to my-listings
    await expect(page).toHaveURL('/vendor/my-listings');
    await expect(page.locator('text=DME-300')).toBeVisible();
    await expect(page.locator('text=SUBMITTED')).toBeVisible();

    // 3. Switch to admin + approve
    // (In a real app, would log out vendor-b, log in admin-sunrise)
    // For now, hardcode admin view or use localStorage
    localStorage.setItem('userId', 'admin-sunrise');
    localStorage.setItem('tenantId', 'sunrise-pharmacy');
    
    await page.goto('/admin/review');
    await expect(page.locator('text=DME-300')).toBeVisible();
    await page.click('button:has-text("Approve")');

    // Wait for success
    await expect(page.locator('text=DME-300')).not.toBeVisible({ timeout: 3000 });

    // 4. Check storefront
    await page.goto('/storefront');
    await expect(page.locator('text=DME-300')).toBeVisible();
    await expect(page.locator('text=$79.99')).toBeVisible();
  });

  // Criterion 2: Show rejection error
  test('Vitalcare rejection shows error message', async ({ page }) => {
    await page.goto('/vendor/submit');
    
    // Vendor A tries RX in vitalcare
    localStorage.setItem('userId', 'vendor-a-user');
    localStorage.setItem('tenantId', 'vitalcare');
    
    await page.reload();
    await page.selectOption('select', 'RX-100');
    await page.fill('input[placeholder*="price"]', '2999');
    await page.click('button:has-text("Submit")');

    // Should show error
    await expect(page.locator('text=does not allow')).toBeVisible({ timeout: 5000 });
  });

  // Criterion 3: DME credential error
  test('Expired DME credential shows error', async ({ page }) => {
    await page.goto('/vendor/submit');
    
    localStorage.setItem('userId', 'vendor-c-user');
    localStorage.setItem('tenantId', 'sunrise-pharmacy');
    
    await page.reload();
    await page.selectOption('select', 'DME-301');
    await page.fill('input[placeholder*="price"]', '5999');
    await page.click('button:has-text("Submit")');

    // Should show credential error
    await expect(page.locator('text=credential')).toBeVisible({ timeout: 5000 });
  });

  // Criterion 8: Storefront isolation
  test('Vitalcare storefront only shows vitalcare products', async ({ page }) => {
    // Create a product in sunrise
    localStorage.setItem('userId', 'vendor-b-user');
    localStorage.setItem('tenantId', 'sunrise-pharmacy');
    
    await page.goto('/vendor/submit');
    await page.selectOption('select', 'DME-300');
    await page.fill('input[placeholder*="price"]', '7999');
    await page.click('button:has-text("Submit")');
    
    // Approve it (switch to admin)
    localStorage.setItem('userId', 'admin-sunrise');
    await page.goto('/admin/review');
    await page.click('button:has-text("Approve")');

    // Now check vitalcare storefront
    localStorage.setItem('tenantId', 'vitalcare');
    await page.goto('/storefront');
    
    // DME-300 should NOT be visible on vitalcare storefront
    await expect(page.locator('text=DME-300')).not.toBeVisible();
  });
});
```

---

## 📊 Test Results Template

When you run tests, fill this in:

```
ACCEPTANCE CRITERIA TEST RESULTS
================================

✅ Criterion 1: Vendor can submit a listing
   Status: PASS
   Test: test_vendor_submits_valid_listing
   Notes: Submission successful, status=SUBMITTED

✅ Criterion 2: Invalid category rejected
   Status: PASS
   Test: test_vitalcare_rejects_rx
   Error code: CATEGORY_NOT_ALLOWED ✓

❌ Criterion 3: Expired credential rejected
   Status: FAIL
   Test: test_vendor_c_dme_rejected
   Error: Expected error code DME_VENDOR_NOT_CREDENTIALED but got PRICE_INVALID
   Notes: May be price validation running first

✅ Criterion 4: Invalid price rejected
   Status: PASS
   Test: test_zero_price_rejected
   Error code: PRICE_INVALID ✓

✅ Criterion 5: Admin can approve
   Status: PASS
   Test: test_happy_path_submit_approve
   Listing status changed: SUBMITTED → APPROVED

✅ Criterion 6: Appears on storefront
   Status: PASS
   Test: test_happy_path_storefront
   Product visible after approval

✅ Criterion 7: Rejected doesn't appear
   Status: PASS
   Test: test_rejected_not_on_storefront
   Only APPROVED products shown

✅ Criterion 8: Tenant isolation
   Status: PASS
   Test: test_tenant_isolation
   Sunrise user cannot see vitalcare listings

SUMMARY
=======
Passed: 7/8
Failed: 1/8

SHIP DECISION: YES (1 minor issue, not blockers)
  - Criterion 3 may be validator ordering issue
  - All critical paths work
  - Tenant isolation solid
  - All error codes firing correctly

NEXT STEPS: Fix validator order if time permits
```

---

## 📝 When to Run Tests

### ✅ As Features Land

**At 20 min (after scaffolds pushed):**
```bash
npm test api.spec.ts  # Run API tests against Dev 1's basic endpoints
```

**At 30 min (after Dev 1 endpoints complete):**
```bash
npm test api.spec.ts  # All API tests should pass
```

**At 35 min (after Dev 2 screens ready):**
```bash
npm test ui.spec.ts   # Run UI tests against Next.js
```

**At 40 min:**
```bash
npm test              # Run ALL tests
```

### 🚨 Standup at 25 minutes

**Report to team:**
- Which tests pass
- Which tests fail (and why)
- What's blocking QA (missing endpoints, broken screens, etc.)

**Example:**
```
QA Report (25 min mark):
- API tests: 3/5 passing (waiting for reject endpoint)
- UI tests: 2/3 passing (happy path works, rejection flow needs work)
- Blocker: /admin/review not returning SUBMITTED listings
- Next: Finish review screen, run full test suite
```

---

## 🎬 Demo Script (45 min mark)

**You own the demo. Here's what to show:**

### Scene 1: Vendor B Submits DME
```
1. Open vendor/submit as vendor-b-user, sunrise-pharmacy
2. Select "Digital BP monitor (DME-300)"
3. Enter price "7999"
4. Click Submit
5. Show success message
6. Verify listing shows SUBMITTED status
```

### Scene 2: Admin Approves
```
1. Switch to admin-sunrise (admin/review)
2. Find the DME-300 listing
3. Click Approve
4. Show listing disappears from queue (status changed)
```

### Scene 3: Appears on Sunrise Storefront Only
```
1. Go to /storefront (as public, sunrise context)
2. Verify DME-300 appears
3. Switch tenant to vitalcare
4. Go to /storefront (vitalcare context)
5. Verify DME-300 is NOT there (empty or other products only)
```

### Scene 4: Rejection Errors
```
1. Go to vendor/submit as vendor-a-user, vitalcare
2. Try to submit RX-100
3. Show error: "does not allow RX products"

4. Go to vendor/submit as vendor-c-user, sunrise
5. Try to submit DME-301
6. Show error: "credential expired"
```

---

## ✅ Checklist

### Setup
- [ ] Playwright installed + config created
- [ ] Test structure: api.spec.ts + ui.spec.ts
- [ ] Fixtures set up (headers, API request helper)
- [ ] Can run tests: `npm test`

### API Tests
- [ ] Test: Vendor submit success
- [ ] Test: Category validation (vitalcare rejects RX)
- [ ] Test: License validation (vendor-b no RX)
- [ ] Test: DME credential validation (vendor-c expired)
- [ ] Test: Price validation (zero price)
- [ ] Test: Tenant isolation

### UI Tests
- [ ] Test: Happy path (submit → approve → storefront)
- [ ] Test: Error display (category not allowed)
- [ ] Test: Error display (credential expired)
- [ ] Test: Storefront isolation (different tenants)

### Reporting
- [ ] Test results table filled in
- [ ] Standup notes at 25 min
- [ ] Demo script ready at 45 min
- [ ] Ship/no-ship decision made

---

## 📞 Blocking Issues (Escalate if You See These)

| Issue | Who to Tell | Example |
|-------|---|---|
| Endpoint doesn't exist | Dev 1 | "/listings endpoint 404" |
| Endpoint returns wrong format | Dev 1 | "expected 'success' field, got 'error'" |
| Validation doesn't work | Dev 2 | "DME validator not running" |
| Screen doesn't load | Dev 2 | "/admin/review shows blank page" |
| API calls not sending headers | Dev 2 | "X-User-Id header missing" |
| Database state corrupted | Dev 1 | "Listing created but can't be retrieved" |

---

## 🎯 Pass/Fail Criteria

### PASS (Ship It!)
- [x] All 8 acceptance criteria working
- [x] All 3 demo scenarios show correctly
- [x] No critical errors (502, 500, crashes)
- [x] Tenant isolation verified
- [x] Error messages display correctly

### NO-SHIP (Not Ready)
- [ ] Any acceptance criterion failing
- [ ] Tenant data leaking between tenants
- [ ] Crashes or 500 errors on demo path
- [ ] Error codes don't match contract
- [ ] Demo times out or breaks

---

## 📊 Example Test Run Output

```
$ npm test

 ✓ tests/api.spec.ts:17 (Vendor submits a valid listing)
 ✓ tests/api.spec.ts:34 (Vitalcare rejects RX category)
 ✓ tests/api.spec.ts:52 (Vendor C DME is rejected)
 ✓ tests/api.spec.ts:70 (Zero price is rejected)
 ✓ tests/api.spec.ts:88 (Sunrise user cannot see vitalcare listings)
 ✓ tests/ui.spec.ts:12 (Vendor submits, admin approves, appears on storefront)
 ✓ tests/ui.spec.ts:52 (Vitalcare rejection shows error message)
 ✓ tests/ui.spec.ts:71 (Expired DME credential shows error)
 ✓ tests/ui.spec.ts:90 (Vitalcare storefront only shows vitalcare products)

9 passed (45s)

SHIP DECISION: GO ✅
```

---

## 🚀 You're Ready

- Playwright is set up
- Tests are written as stubs
- You know what to test
- You know how to report

**Push your Playwright project to main by 15 min mark.**  
**Run tests as features land.**  
**Report at 25 min (standup).**  
**Demo at 45 min.**  
**Ship decision at 50 min.**

**You got this!** 💪

