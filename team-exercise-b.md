# Team Exercise B (Hour 2)

**Goal:** In 50 minutes, deliver vendor product listings with compliance approval, working end to end: a vendor submits a listing, the store's admin approves it, and it appears on that store's storefront.

| Time | Step |
| --- | --- |
| 10 min | Team design |
| ~30 min | Build (standup at the halfway point: done, next, blocked) |
| 10 min | Team demo and ship call |

---

## The scenario

The platform hosts online stores for many merchants (tenants). Each store is a marketplace: independent vendors list products in it, and the store's admin decides what gets sold. Some products are regulated, so a listing must pass compliance checks before an admin can approve it.

### Business rules

1. **Tenant isolation.** Every request carries a tenant, resolved from the `Host` header or an `X-Tenant-Id` header. A tenant must never see or change another tenant's listings.
2. **Users and roles.** Requests carry an `X-User-Id` header. Vendor users can submit and view only their own vendor's listings. Admin users can review listings only in their own tenant.
3. **Category allow-list.** Each tenant allows only certain product categories. A listing in a category the tenant doesn't allow is rejected at submission.
4. **Vendor compliance at submission.**
   - `RX` listings need a vendor whose `pharmacyLicenseExpiresAt` is in the future.
   - `DME` listings need a vendor whose `dmeCredentialExpiresAt` is in the future.
   - `OTC` and `WELLNESS` have no vendor checks.
5. **Price.** Each listing sets its own price for that tenant, in integer cents, greater than zero.
6. **Listing lifecycle.** `SUBMITTED` → `APPROVED` or `REJECTED`; `APPROVED` → `DELISTED`. No other transitions. Rejecting requires a reason.
7. **Audit trail.** Every status change records who made it and when.
8. **Storefront.** The public catalog shows only `APPROVED` listings for that tenant.

### Seed data

Tenants:

| Tenant | Domain | Allowed categories |
| --- | --- | --- |
| `sunrise-pharmacy` | sunrise.example.com | RX, OTC, DME, WELLNESS |
| `vitalcare` | vitalcare.example.com | OTC, DME, WELLNESS (no RX) |

Vendors:

| Vendor | Pharmacy license | DME credential |
| --- | --- | --- |
| Vendor A | Valid | None |
| Vendor B | None | Valid |
| Vendor C | None | Expired |

Products vendors can list:

| SKU | Name | Category |
| --- | --- | --- |
| RX-100 | Atorvastatin 20mg, 30 tabs | RX |
| OTC-200 | Loratadine 10mg, 30 tabs | OTC |
| DME-300 | Digital BP monitor | DME |
| DME-301 | Nebulizer kit | DME |
| WEL-400 | Vitamin D3 2000 IU | WELLNESS |

Users: `vendor-a-user`, `vendor-b-user`, `vendor-c-user` (one per vendor); `admin-sunrise` and `admin-vitalcare` (one admin per tenant). All data is fictional; full details are in `seed-data-b.json`.

---

## What you have

One shared GitHub repo, and a Codespace each with Python 3.12, Node 20, and Playwright browsers installed.

The repo is empty apart from this scenario and `seed-data-b.json`. **You build everything:**

- A **Python (FastAPI)** backend
- A **TypeScript/Next.js** frontend
- A **Playwright + TypeScript** test project

Each person scaffolds their own part in parallel, pushes it to main early, then builds features.

## Roles

### Developer 1 — tenant safety, listings API, and approval workflow (Python)

- Set up the FastAPI app: load `seed-data-b.json`, resolve the tenant from the `Host` or `X-Tenant-Id` header and the user from `X-User-Id`. Scope every query to the tenant, with a test proving one tenant cannot read another tenant's listings.
- Build the listing endpoints:
  - `POST /listings` (vendor submits `sku` and `priceCents`)
  - `GET /listings` (vendors see their own; admins see their tenant's review queue)
  - `POST /listings/{listing_id}/approve`, `/reject` (with a reason), and `/delist`
  - `GET /storefront/products` (approved listings for the tenant only)
- Enforce the lifecycle and roles, and record every status change in an audit trail.

### Developer 2 — compliance checks (Python) and screens (TypeScript)

- Build the submission checks (category allow-list, pharmacy license, DME credential, valid price) as a `validate_listing()` function with pytest tests. Structure the checks so new ones can be added without editing existing ones.
- Build the Next.js screens:
  - Vendor: submit a listing and see its status, with rejection reasons in plain language
  - Admin: review queue with approve and reject (reason required)
  - Storefront: the tenant's approved products

### QA Engineer — quality owner (TypeScript + Playwright)

- Share your top 8 release cases with the team during design.
- While the developers build, set up the Playwright + TypeScript project, turn this task card into acceptance criteria, and write tests against the contract the team agreed.
- Automate in TypeScript with Playwright, as each piece lands:
  - an API test (`request` fixture) proving vitalcare cannot see sunrise-pharmacy's listings
  - an API test proving invalid submissions are rejected with the right error codes
  - a UI test: an admin approves a listing and it appears on that tenant's storefront only
- Run the tests against each piece as it lands and tell the developers what fails.
- In the team demo, report which acceptance criteria pass and make the ship or no-ship call.

## Error codes

`CATEGORY_NOT_ALLOWED`, `RX_VENDOR_NOT_LICENSED`, `DME_VENDOR_NOT_CREDENTIALED`, `PRICE_INVALID`, `INVALID_STATUS_TRANSITION`, `REJECTION_REASON_REQUIRED`, `FORBIDDEN`

## How the team works

- In the design step, agree the repo layout, the listing request and response shapes, and how errors are returned before anyone starts coding.
- Work on branches and merge to main. Keep main working.
- Standup at the halfway point: done, next, blocked.
- **Done** means the flow works in the screens and the tests pass. Not everything will fit — prioritize together and tell us what you cut.

## Team demo (last 10 minutes)

Show in the screens:

1. Vendor B submits DME-300 to sunrise-pharmacy, the sunrise admin approves it, and it appears on the sunrise storefront but not on vitalcare's
2. Vendor A's RX-100 submission to vitalcare is rejected with `CATEGORY_NOT_ALLOWED`
3. Vendor C's DME-301 submission is rejected with `DME_VENDOR_NOT_CREDENTIALED`

Then QA runs the tests, reports which acceptance criteria pass, and tells the product owner whether to ship.
