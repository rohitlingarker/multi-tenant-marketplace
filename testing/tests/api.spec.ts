import { test, expect } from './fixtures';
import { TENANTS, USERS, SKUS, ERROR_CODES } from './seed-data';

// Acceptance criteria references are the numbers from QA_QUALITY_OWNER.md.
//
// Response shape verified live against backend/app/main.py's
// domain_error_handler: success returns the resource directly (no
// success/data envelope), errors are `{ error: { code, message } }`.

test.describe('Listing submission', () => {
  // Criterion 1
  test('vendor submits a valid listing', async ({ apiRequest }) => {
    const { ok, body } = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.dme300, priceCents: 7999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });

    expect(ok).toBe(true);
    expect(body.status).toBe('SUBMITTED');
    expect(body.sku).toBe(SKUS.dme300);
  });

  // Criterion 2
  test('vitalcare rejects RX category', async ({ apiRequest }) => {
    const { ok, body } = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.rx100, priceCents: 2999 },
      userId: USERS.vendorA,
      tenantId: TENANTS.vitalcare,
    });

    expect(ok).toBe(false);
    expect(body.error?.code).toBe(ERROR_CODES.CATEGORY_NOT_ALLOWED);
  });

  // Criterion 3 — RX vendor without a license
  test('vendor without pharmacy license is rejected for RX', async ({ apiRequest }) => {
    const { ok, body } = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.rx100, priceCents: 2999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });

    expect(ok).toBe(false);
    expect(body.error?.code).toBe(ERROR_CODES.RX_VENDOR_NOT_LICENSED);
  });

  // Criterion 3 — DME vendor with expired credential
  test('vendor C is rejected for DME (credential expired)', async ({ apiRequest }) => {
    const { ok, body } = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.dme301, priceCents: 5999 },
      userId: USERS.vendorC,
      tenantId: TENANTS.sunrise,
    });

    expect(ok).toBe(false);
    expect(body.error?.code).toBe(ERROR_CODES.DME_VENDOR_NOT_CREDENTIALED);
  });

  // Criterion 4
  test('zero price is rejected', async ({ apiRequest }) => {
    const { ok, body } = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.dme300, priceCents: 0 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });

    expect(ok).toBe(false);
    expect(body.error?.code).toBe(ERROR_CODES.PRICE_INVALID);
  });

  test('negative price is rejected', async ({ apiRequest }) => {
    const { ok, body } = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.dme300, priceCents: -100 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });

    expect(ok).toBe(false);
    expect(body.error?.code).toBe(ERROR_CODES.PRICE_INVALID);
  });
});

test.describe('Approval lifecycle', () => {
  // Criterion 5
  test('admin can approve a SUBMITTED listing', async ({ apiRequest }) => {
    const submit = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.dme300, priceCents: 7999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });
    expect(submit.ok).toBe(true);
    const listingId = submit.body.id;

    const approve = await apiRequest(`/listings/${listingId}/approve`, {
      method: 'POST',
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });

    expect(approve.ok).toBe(true);
    expect(approve.body.status).toBe('APPROVED');
  });

  test('rejecting without a reason fails', async ({ apiRequest }) => {
    const submit = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.otc200, priceCents: 999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });
    const listingId = submit.body.id;

    const reject = await apiRequest(`/listings/${listingId}/reject`, {
      method: 'POST',
      body: { reason: '' },
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });

    expect(reject.ok).toBe(false);
    expect(reject.body.error?.code).toBe(ERROR_CODES.REJECTION_REASON_REQUIRED);
  });

  test('approving an already-approved listing is an invalid transition', async ({ apiRequest }) => {
    const submit = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.wel400, priceCents: 1299 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });
    const listingId = submit.body.id;

    await apiRequest(`/listings/${listingId}/approve`, {
      method: 'POST',
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });

    const secondApprove = await apiRequest(`/listings/${listingId}/approve`, {
      method: 'POST',
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });

    expect(secondApprove.ok).toBe(false);
    expect(secondApprove.body.error?.code).toBe(ERROR_CODES.INVALID_STATUS_TRANSITION);
  });
});

test.describe('Storefront', () => {
  // Criterion 6 & 7
  // Asserts by listing id, not sku: multiple listings can legitimately share
  // a sku (same product, resubmitted, or another test run earlier in this
  // suite), so a sku-based check can false-positive/negative on leftover
  // state from prior tests sharing one live server/store.
  test('approved listing appears on its tenant storefront; rejected does not', async ({ apiRequest }) => {
    const approved = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.dme300, priceCents: 7999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });
    const approveResult = await apiRequest(`/listings/${approved.body.id}/approve`, {
      method: 'POST',
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });
    expect(approveResult.ok).toBe(true);

    const rejected = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.wel400, priceCents: 500 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });
    const rejectResult = await apiRequest(`/listings/${rejected.body.id}/reject`, {
      method: 'POST',
      body: { reason: 'Pricing error' },
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });
    expect(rejectResult.ok).toBe(true);

    const storefront = await apiRequest('/storefront/products', {
      tenantId: TENANTS.sunrise,
    });

    // Storefront entries use `listingId`, not `id` like the listing response.
    const ids = storefront.body.map((p: any) => p.listingId);
    expect(ids).toContain(approved.body.id);
    expect(ids).not.toContain(rejected.body.id);
  });

  // Criterion 8
  test('vitalcare storefront never shows sunrise listings', async ({ apiRequest }) => {
    const submit = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.dme300, priceCents: 7999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.sunrise,
    });
    await apiRequest(`/listings/${submit.body.id}/approve`, {
      method: 'POST',
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });

    const vitalcareStorefront = await apiRequest('/storefront/products', {
      tenantId: TENANTS.vitalcare,
    });

    const tenantIds = vitalcareStorefront.body.map((p: any) => p.tenantId);
    expect(tenantIds).not.toContain(TENANTS.sunrise);
  });
});

test.describe('Tenant isolation', () => {
  // Criterion 8
  test('sunrise admin cannot see vitalcare listings via GET /listings', async ({ apiRequest }) => {
    await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.otc200, priceCents: 999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.vitalcare,
    });

    const result = await apiRequest('/listings', {
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });

    const foreignListings = result.body.filter((l: any) => l.tenantId === TENANTS.vitalcare);
    expect(foreignListings.length).toBe(0);
  });

  test('cross-tenant listing lookup returns 404, not 403', async ({ apiRequest }) => {
    const submit = await apiRequest('/listings', {
      method: 'POST',
      body: { sku: SKUS.otc200, priceCents: 999 },
      userId: USERS.vendorB,
      tenantId: TENANTS.vitalcare,
    });
    const listingId = submit.body.id;

    const approve = await apiRequest(`/listings/${listingId}/approve`, {
      method: 'POST',
      userId: USERS.adminSunrise,
      tenantId: TENANTS.sunrise,
    });

    expect(approve.status).toBe(404);
    expect(approve.body.error?.code).toBe(ERROR_CODES.NOT_FOUND);
  });
});
