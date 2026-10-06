# QA — Playwright + TypeScript

Tests the contract in `../claude.md` section 6 against whatever is actually
running. See `../QA_QUALITY_OWNER.md` for the full guide and `../claude.md`
section 9 for the acceptance criteria summary.

**Response envelope — verified live against `backend/app/main.py`:** a
success response is the resource itself, no `{ success, data }` wrapper.
Only errors are wrapped, as `{ error: { code, message } }`. This matches
`claude.md`, not `API_CONTRACT.md`'s `success`/`data` shape — the backend
followed the former, so the fixture does too.

## Setup

```bash
cd testing
npm install
npx playwright install chromium   # first time only
```

## Running

API tests only need the backend running on `http://localhost:8000`
(override with `BACKEND_URL`):

```bash
npm run test:api
```

`tests/auth.spec.ts` covers `POST /auth/login` separately (`npm run test:auth`)
— valid login, wrong password, unknown username (must 401 identically to a
wrong password, so it can't be used to enumerate usernames), and that
`passwordHash` never leaks into a response. All seeded users' bcrypt hashes
verify against `password123` (confirmed against `backend/app/db/seed-data.json`
— no plaintext is committed anywhere); override with `TEST_PASSWORD` if that
ever changes.

UI tests additionally need the frontend running on `http://localhost:3000`
(`npm run dev` in `frontend/`, override with `FRONTEND_URL`) on top of the
backend. They drive the real screens via their `data-testid` attributes —
login, submit, admin review, storefront — and fail with a normal connection
error if either server isn't up, same as the API tests:

```bash
npm run test:ui
```

Everything:

```bash
npm test
npm run report   # open the HTML report from the last run
```

## Layout

- `tests/seed-data.ts` — ids from `seed-data-b.json`, kept in one place so a
  seed change only needs one edit.
- `tests/fixtures.ts` — `apiRequest` fixture: sends `X-User-Id` /
  `X-Tenant-Id`, returns `{ status, ok, body }` where `body` is the raw
  resource on success or `{ error: { code, message } }` on failure.
- `tests/api.spec.ts` — the 8 acceptance criteria that don't need a browser.
- `tests/auth.spec.ts` — `POST /auth/login` (not one of the 8, but still a
  contract endpoint every other spec bypasses via `X-User-Id`).
- `tests/ui.spec.ts` — happy path + rejection flows through the actual
  screens (login, vendor submit, admin review, storefront, tenant switcher).

## Test isolation

Every test (API, auth, and UI) resets the backend's in-memory store back to
`seed-data.json` in a `beforeEach`, via a QA-only route:
`POST /__test__/reset` (`backend/app/api/routes/testing.py`). Not part of the
public API contract — it exists purely so tests don't leak listings into
each other on the one shared dev server.
