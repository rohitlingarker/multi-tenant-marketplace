# API Contract Reference (Quick Lookup)

---

## Headers (Every Request)

```
Host: sunrise.example.com  (or use X-Tenant-Id header)
X-User-Id: vendor-a-user
X-Tenant-Id: sunrise-pharmacy  (optional, overrides Host)
Content-Type: application/json
```

---

## Error Codes

| Code | Status | When |
|------|--------|------|
| `CATEGORY_NOT_ALLOWED` | 422 | Tenant doesn't allow category |
| `RX_VENDOR_NOT_LICENSED` | 422 | No valid pharmacy license |
| `DME_VENDOR_NOT_CREDENTIALED` | 422 | No valid DME credential |
| `PRICE_INVALID` | 422 | Price ≤ 0 or not integer |
| `INVALID_STATUS_TRANSITION` | 409 | Status change not allowed |
| `REJECTION_REASON_REQUIRED` | 422 | Reject without reason |
| `FORBIDDEN` | 403 | Role/tenant violation |
| `INVALID_CREDENTIALS` | 401 | Login failed — bad username or password, same message either way |
| (unknown listing in this tenant) | 404 | Resource doesn't exist — no error code, cross-tenant returns 404 too |

---

## Endpoints Summary

### 0️⃣ POST /auth/login
**Role:** public  
**Body:** `{ "username": "vendor-b-user", "password": "plaintext-from-form" }`  
**Status:** 200 OK | 401 Unauthorized  

**Response (200, vendor user):**
```json
{ "id": "vendor-b-user", "role": "VENDOR", "vendorId": "vendor-b", "tenantId": null }
```

**Response (200, admin user):**
```json
{ "id": "admin-sunrise", "role": "ADMIN", "tenantId": "sunrise-pharmacy", "vendorId": null }
```

**Response (401 — unknown username or wrong password, same body either way):**
```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid username or password." } }
```

Passwords are bcrypt hashes in the store — never compare plaintext. After login, the frontend sends `X-User-Id` on every subsequent request.

---

### 1️⃣ POST /listings
**Role:** VENDOR  
**Body:** `{ "sku": "RX-100", "priceCents": 2999 }`  
**Status:** 201 Created | 422 Unprocessable Entity | 403 Forbidden  

**Validation order:**
1. User is VENDOR
2. Tenant valid
3. Product exists
4. Category in tenant's allow list
5. If RX: vendor pharmacy license valid
6. If DME: vendor DME credential valid
7. Price > 0

---

### 2️⃣ GET /listings
**Role:** VENDOR or ADMIN  
**Status:** 200 OK | 403 Forbidden  

**Logic:**
- VENDOR: own vendor's listings only
- ADMIN: all listings in tenant

---

### 3️⃣ POST /listings/{listing_id}/approve
**Role:** ADMIN  
**Body:** (empty)  
**Status:** 200 OK | 404 Not Found | 409 Conflict | 403 Forbidden  

**Checks:**
- ADMIN in this tenant
- Listing in this tenant (else 404 — never 403, don't leak existence of other tenants' data)
- Status is `SUBMITTED` (else `INVALID_STATUS_TRANSITION`, 409)

---

### 4️⃣ POST /listings/{listing_id}/reject
**Role:** ADMIN  
**Body:** `{ "reason": "reason text" }`  
**Status:** 200 OK | 422 Unprocessable Entity | 404 Not Found | 403 Forbidden  

**Checks:**
- ADMIN in this tenant
- Listing in this tenant (else 404)
- Status is `SUBMITTED` (else `INVALID_STATUS_TRANSITION`, 409)
- `reason` is non-empty (else `REJECTION_REASON_REQUIRED`, 422)

---

### 5️⃣ POST /listings/{listing_id}/delist
**Role:** ADMIN  
**Body:** (empty)  
**Status:** 200 OK | 404 Not Found | 409 Conflict | 403 Forbidden  

**Checks:**
- ADMIN in this tenant
- Listing in this tenant (else 404)
- Status is `APPROVED` (only approved can delist, else `INVALID_STATUS_TRANSITION`, 409)

---

### 6️⃣ GET /storefront/products
**Role:** Public (no auth)  
**Status:** 200 OK | 400 Bad Request (unresolvable tenant)  

**Filter:** `status == APPROVED` only, for the resolved tenant

---

## Listing Lifecycle

```
┌─────────────┐
│  SUBMITTED  │ ← Initial state after POST /listings
└──┬──────┬──┘
   │      │
   │      └──→ [Admin rejects] → REJECTED (stores rejectionReason)
   │
   └──────────→ [Admin approves] → APPROVED
                                       │
                                       └──→ [Admin delists] → DELISTED
```

**Transitions allowed:**
- SUBMITTED → APPROVED ✓
- SUBMITTED → REJECTED ✓
- APPROVED → DELISTED ✓
- Anything else → 409 INVALID_STATUS_TRANSITION

---

## Tenant Isolation

**Rule:** Every listing must be scoped to the tenant. A listing outside the resolved tenant is treated as if it doesn't exist — return 404, not 403, so existence of another tenant's data is never leaked.

```python
# Dev 1: Middleware
user_tenant = request.state.tenant
listing_tenant = listing["tenantId"]

if user_tenant != listing_tenant:
    raise HTTPException(404, "Listing not found")
```

**Test:**
```
Sunrise user tries to view/edit vitalcare listing → 404
```

---

## Response Shapes

No envelope — the listing (or array of listings) is returned directly, matching CLAUDE.md section 6.

### Success (Status 200/201)
```json
{
  "id": "lst_001",
  "tenantId": "sunrise-pharmacy",
  "vendorId": "vendor-b",
  "sku": "DME-300",
  "productName": "Digital BP monitor",
  "category": "DME",
  "priceCents": 4999,
  "status": "APPROVED",
  "rejectionReason": null,
  "audit": [
    { "status": "SUBMITTED", "byUserId": "vendor-b-user", "at": "2026-10-06T10:00:00Z" },
    { "status": "APPROVED",  "byUserId": "admin-sunrise", "at": "2026-10-06T10:05:00Z" }
  ]
}
```

### Error (Status 422/403/404/409)
```json
{ "error": { "code": "CATEGORY_NOT_ALLOWED", "message": "Sunrise Pharmacy does not allow RX products" } }
```

---

## Seed Data Quick Reference

### Tenants
| ID | Name | Domain | Categories |
|----|------|--------|-----------|
| `sunrise-pharmacy` | Sunrise Pharmacy | sunrise.example.com | RX, OTC, DME, WELLNESS |
| `vitalcare` | VitalCare | vitalcare.example.com | OTC, DME, WELLNESS |

### Vendors
| ID | Pharmacy License | DME Credential |
|----|------------------|---|
| `vendor-a` | ✓ Valid (2028-12-31) | ✗ None |
| `vendor-b` | ✗ None | ✓ Valid (2028-12-31) |
| `vendor-c` | ✗ None | ✗ Expired (2025-06-30) |

### Products
| SKU | Name | Category |
|-----|------|----------|
| RX-100 | Atorvastatin 20mg, 30 tabs | RX |
| OTC-200 | Loratadine 10mg, 30 tabs | OTC |
| DME-300 | Digital BP monitor | DME |
| DME-301 | Nebulizer kit | DME |
| WEL-400 | Vitamin D3 2000 IU | WELLNESS |

### Users
| ID | Role | Tenant/Vendor |
|----|------|---|
| `vendor-a-user` | VENDOR | vendor-a |
| `vendor-b-user` | VENDOR | vendor-b |
| `vendor-c-user` | VENDOR | vendor-c |
| `admin-sunrise` | ADMIN | sunrise-pharmacy |
| `admin-vitalcare` | ADMIN | vitalcare |

---

## Dev 1 Priority Path

1. Middleware: resolve tenant + user
2. Data loader: parse seed-data-b.json
3. Core endpoints:
   - POST /listings (with validation)
   - GET /listings
   - POST /listings/{id}/approve
   - POST /listings/{id}/reject
   - GET /storefront/products
4. Delist endpoint
5. Tests: tenant isolation, lifecycle

---

## Dev 2 Priority Path

1. Compliance validators (pytest tests first!)
   - CategoryAllowed
   - RXLicense
   - DMECredential
   - Price
2. Frontend scaffolds:
   - Context for tenant/user
   - Layout + navbar
3. Vendor screens:
   - /vendor/submit form
   - /vendor/my-listings view
4. Admin screens:
   - /admin/review queue + approve/reject
   - /admin/storefront-preview
5. Public:
   - /storefront

---

## QA Priority Path

1. API tests (Playwright request fixture):
   - Tenant isolation
   - Category validation
   - License/credential validation
2. UI tests:
   - Vendor submit → Admin approve → Storefront
3. Rejection flow:
   - Vendor C DME rejection
   - Vendor A RX-to-vitalcare rejection

---

## Reminders

✓ **Tenant resolution:** X-Tenant-Id first, falls back to Host → domain lookup  
✓ **Every response:** The resource directly on success, `{ error: { code, message } }` on failure — no envelope  
✓ **Every listing:** Belongs to exactly one tenant  
✓ **Vendor can't see:** Other vendors' listings  
✓ **Admin can't see:** Other tenants' listings  
✓ **Delist only works:** On APPROVED listings  
✓ **Reject requires:** Non-empty reason string  
✓ **Storefront shows:** APPROVED only  

---