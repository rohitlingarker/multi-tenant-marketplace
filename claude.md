# CLAUDE.md

Project-level reference for this repository. Read this before writing or changing any code.

---

## 1. What we are building

A **multi-tenant marketplace platform for regulated products**, built in a 1-hour hackathon.

The platform hosts online stores for many merchants (**tenants**). Each store is a marketplace: independent **vendors** list products into it, and that store's **admin** decides what gets sold. Some products are regulated, so a listing must pass automated compliance checks at submission before an admin ever sees it.

End-to-end flow being demoed: a vendor submits a listing → it passes compliance → the tenant's admin approves it → it appears on that tenant's storefront and no other.

### Glossary — get these right, they are the source of most confusion

| Term | Meaning |
| --- | --- |
| **Platform** | This application. Hosts many stores. Not an actor, has no super-admin. |
| **Tenant** | A store / merchant. Owns a category allow-list and exactly one admin user. Resolved per request. |
| **Vendor** | An independent seller. **Global, not owned by a tenant.** Holds compliance credentials. Can list into multiple tenants. |
| **Product** | A SKU in the shared catalog, with a fixed category. Vendors do not create products. |
| **Listing** | One vendor's offer of one product **inside one tenant**, with its own price, status and audit trail. This is the core entity. |
| **End customer** | **Out of scope.** No accounts, cart, checkout or orders. The storefront is a read-only catalog. |

Key relationship: **vendors and products are global; listings are per-tenant.** Vendor B submitting DME-300 to `sunrise-pharmacy` and to `vitalcare` creates two independent listings, each with its own price and its own approval decision.

### Actors and what they can do

- **Vendor user** — submits listings, views only their own vendor's listings (scoped to the current tenant). Cannot approve anything.
- **Tenant admin** — views their tenant's review queue; approves, rejects (reason required), delists. Only within their own tenant.
- There is **no platform super-admin**. Do not build one.

---

## 2. Business rules

These are the acceptance criteria. Implement them exactly.

1. **Tenant isolation.** Every request resolves a tenant. A tenant must never read or change another tenant's listings. Every repository query is tenant-scoped.
2. **Roles.** Vendor users see only their own vendor's listings. Admin users act only inside their own tenant.
3. **Category allow-list.** Each tenant allows only certain categories. A listing in a disallowed category is rejected at submission → `CATEGORY_NOT_ALLOWED`.
4. **Vendor compliance at submission.**
   - `RX` requires `pharmacyLicenseExpiresAt` in the future → else `RX_VENDOR_NOT_LICENSED`
   - `DME` requires `dmeCredentialExpiresAt` in the future → else `DME_VENDOR_NOT_CREDENTIALED`
   - `OTC` and `WELLNESS` require no vendor credential
   - A **missing** field and an **expired** date both fail. Only a future date passes.
5. **Price.** Integer cents, strictly greater than zero → else `PRICE_INVALID`.
6. **Lifecycle.** `SUBMITTED` → `APPROVED` | `REJECTED`; `APPROVED` → `DELISTED`. Nothing else → `INVALID_STATUS_TRANSITION`. `REJECTED` and `DELISTED` are terminal. Rejecting requires a non-empty reason → else `REJECTION_REASON_REQUIRED`.
7. **Audit trail.** Every status change appends `{ status, byUserId, at, reason? }` to the listing. Never overwrite history, never hard-delete a listing.
8. **Storefront.** `GET /storefront/products` returns only `APPROVED` listings for the resolved tenant.

### Two things that are easy to get wrong

- **Compliance is enforced by the system, not the admin.** A failing submission returns an error and **no listing row is created**. The admin only ever sees compliant listings. Rejection is a separate, human business decision with a free-text reason.
- **Delisting is not approval.** It is the undo *after* approval — pulling a live listing off the storefront (expired credential, recall, pricing error). It keeps the row and the audit trail rather than deleting. Terminal: to go live again the vendor submits fresh and the checks re-run against today's dates.

### Category → required credential

Keep this mapping in one place in the service layer. Adding a category must not require editing existing checks.

| Category | Required credential field |
| --- | --- |
| `RX` | `pharmacyLicenseExpiresAt` |
| `DME` | `dmeCredentialExpiresAt` |
| `OTC` | none |
| `WELLNESS` | none |

---

## 3. Architecture — strict layering

**Every request passes through every layer, in this order. No layer may be skipped.**

```
HTTP request
   ↓
middleware/   tenant resolution → authentication → RBAC
   ↓
api/          routing, request/response schemas, HTTP status mapping. NO business logic.
   ↓
services/     all business logic: validation, lifecycle, audit, authorization decisions
   ↓
repositories/ the only code that touches the JSON store
   ↓
db/           JSON files
```

### Layer rules — non-negotiable

- **`api/`** parses and validates request *shape* (Pydantic), calls exactly one service function, maps the result or domain error to an HTTP response. No `if` statements about business meaning. No repository imports.
- **`services/`** owns every rule in section 2. Raises typed domain errors carrying an error code. Never imports FastAPI, never reads headers, never touches the JSON file directly.
- **`repositories/`** is the only place that reads or writes the JSON store. Pure data access: `get_by_id`, `list_by_tenant`, `create`, `update`. No business rules. **Every listing-facing repo function takes `tenant_id` as a required first argument** — that is how tenant isolation is made structural rather than a thing someone remembers.
- **`middleware/`** resolves tenant and user and enforces RBAC. It attaches a request context; it does not query listings.

A route that reads a JSON file, or a service that returns a `JSONResponse`, is a bug even if the tests pass.

### Suggested layout

```
backend/
  app/
    main.py                  app wiring, middleware registration
    core/
      errors.py              domain error classes + code→HTTP status map
      security.py            bcrypt hash/verify
      context.py             RequestContext (tenant, user, role, vendor_id)
    middleware/
      tenant.py              Host / X-Tenant-Id → tenant
      auth.py                X-User-Id → user
      rbac.py                role checks
    api/
      deps.py                context dependency
      routes/
        auth.py
        listings.py
        storefront.py
    services/
      auth_service.py
      listing_service.py     submit / approve / reject / delist / queries
      compliance.py          validate_listing() + check registry
    repositories/
      json_store.py          load/save, in-memory cache
      users_repo.py
      tenants_repo.py
      vendors_repo.py
      products_repo.py
      listings_repo.py
    models/
      enums.py               Category, ListingStatus, Role
      schemas.py             request/response models
    db/
      seed-data-b.json       given, read-only reference
      store.json             runtime state
frontend/                    Next.js (TypeScript)
e2e/                         Playwright (TypeScript)
```

---

## 4. Mock database

There is **no real database**. A JSON file is the store.

- Load `seed-data-b.json` at startup into an in-memory dict; `repositories/json_store.py` owns it and is the single access point.
- Writes mutate the in-memory structure and persist to `db/store.json`. Keep `seed-data-b.json` untouched so the demo can be reset by restarting.
- Treat the JSON like tables. One top-level key per collection, records keyed or listed by id.
- No ORM, no SQLite, no migrations. Do not spend hackathon time here.

`seed-data-b.json` is the authority on exact field names — **read it before defining schemas** and match its casing rather than inventing fields.

Expected collections:

```
tenants     id, domain, name, allowedCategories[]
vendors     id, name, pharmacyLicenseExpiresAt?, dmeCredentialExpiresAt?
products    sku, name, category
users       id, username, passwordHash, role, tenantId?, vendorId?
listings    id, tenantId, vendorId, sku, priceCents, status,
            rejectionReason?, audit[]
```

Note on users: an **admin user has `tenantId`** and no `vendorId`. A **vendor user has `vendorId`** and no `tenantId`, because vendors are global — the tenant for a vendor request comes from the header or host, not from the user record.

---

## 5. Tenant resolution, login and RBAC

### Tenant resolution (middleware, runs first)

1. If `X-Tenant-Id` is present, use it.
2. Otherwise map the `Host` header to a tenant by `domain` (`sunrise.example.com` → `sunrise-pharmacy`).
3. Unknown or missing on a tenant-scoped route → `400`.

The resolved tenant goes into the request context and flows down as an argument. **No layer below middleware reads headers.**

### Login

- `POST /auth/login` with `{ username, password }`.
- Passwords are stored in the JSON store as **bcrypt hashes** (`passwordHash`). Never plaintext, never compare raw strings. Pre-generate the hashes when seeding.
- The call goes through all four layers like any other: route → `auth_service.login()` → `users_repo.get_by_username()` → store.
- On success return the user's id, role, and vendor or tenant association. On failure return a generic `401` — do not reveal whether the username exists.
- Hackathon-grade session: after login the frontend sends `X-User-Id` on subsequent requests, which the auth middleware resolves to a user. This is deliberately not secure and that is fine; do not build JWT refresh flows.

### RBAC (middleware)

- Vendor route + admin user, or admin route + vendor user → `FORBIDDEN`.
- Admin whose `tenantId` ≠ resolved tenant → `FORBIDDEN`.
- Vendor acting on a listing whose `vendorId` ≠ their own → `FORBIDDEN`.
- Fine-grained ownership checks that need the listing itself live in the service layer; coarse role checks live in middleware.

---

## 6. API contract

Agree this before coding; frontend and Playwright tests depend on it.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | public | `{ username, password }` |
| `POST` | `/listings` | vendor | `{ sku, priceCents }` — category is looked up server-side, never sent by the client |
| `GET` | `/listings` | vendor / admin | Vendor: own listings in this tenant. Admin: the tenant's full queue. Same route, role-dependent result. |
| `POST` | `/listings/{id}/approve` | admin | |
| `POST` | `/listings/{id}/reject` | admin | `{ reason }` required and non-empty |
| `POST` | `/listings/{id}/delist` | admin | Only from `APPROVED` |
| `GET` | `/storefront/products` | public | Approved listings for the resolved tenant only |

### Listing response shape

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

### Error shape — one shape for every failure

```json
{ "error": { "code": "DME_VENDOR_NOT_CREDENTIALED", "message": "Vendor C's DME credential expired on 2025-03-01." } }
```

Tests assert on `code`. The UI shows `message` in plain language. Codes:

`CATEGORY_NOT_ALLOWED`, `RX_VENDOR_NOT_LICENSED`, `DME_VENDOR_NOT_CREDENTIALED`, `PRICE_INVALID`, `INVALID_STATUS_TRANSITION`, `REJECTION_REASON_REQUIRED`, `FORBIDDEN`

Status mapping: compliance and validation failures → `422`; `FORBIDDEN` → `403`; `INVALID_STATUS_TRANSITION` → `409`; unknown listing **in this tenant** → `404`.

Cross-tenant access returns `404`, not `403` — do not leak the existence of another tenant's data.

---

## 7. Compliance validation

`services/compliance.py` exposes `validate_listing(tenant, vendor, product, price_cents) -> ErrorCode | None`.

Structure it as a **list of small check functions**, each taking the same context and returning an error code or `None`. The validator iterates the list and returns the first failure. Adding a rule means appending a function — never editing an existing one.

Order: category allow-list → price → vendor credential. Return the **first** failure only.

Compare expiry dates against `datetime.now(timezone.utc)`. Absent credential field = failure, same as expired.

---

## 8. Working agreements

- No database, no auth framework, no pagination, no styling beyond what makes the demo readable.
- Build order, highest value first:
  1. Tenant + user context, JSON store, listing model
  2. `POST /listings` with compliance + `GET /listings`
  3. approve / reject + storefront
  4. Vendor, admin and storefront screens
  5. delist *(cut first if time runs out — it is in the rules but not in the demo)*
- The audit trail stays in regardless of time pressure; it is one field and an explicit requirement.

### The demo must show

1. Vendor B submits DME-300 to `sunrise-pharmacy` → admin approves → appears on sunrise storefront, **not** on vitalcare's
2. Vendor A's RX-100 submission to `vitalcare` → `CATEGORY_NOT_ALLOWED`
3. Vendor C's DME-301 submission → `DME_VENDOR_NOT_CREDENTIALED`

If a piece of work does not serve one of these three, it is below the cut line.