import { test as base, expect, type APIResponse } from '@playwright/test';
import { TENANTS, USERS } from './seed-data';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

// Matches the actual backend (see app/main.py's domain_error_handler): a
// success response is the resource itself (object or array), with no
// envelope. Only errors are wrapped, as `{ error: { code, message } }`.
export type ApiResult = {
  error?: { code: string; message: string };
  [key: string]: any;
};

type ApiFixtures = {
  backendURL: string;
  apiRequest: (
    path: string,
    opts?: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      userId?: string;
      tenantId?: string;
    }
  ) => Promise<{ status: number; ok: boolean; body: ApiResult; raw: APIResponse }>;
};

export const test = base.extend<ApiFixtures>({
  backendURL: async ({}, use) => {
    await use(BACKEND_URL);
  },

  apiRequest: async ({ request }, use) => {
    await use(async (path, opts = {}) => {
      const {
        method = 'GET',
        body,
        userId = USERS.vendorA,
        tenantId = TENANTS.sunrise,
      } = opts;

      const raw = await request.fetch(`${BACKEND_URL}${path}`, {
        method,
        headers: {
          'X-User-Id': userId,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json',
        },
        data: body,
      });

      let parsed: ApiResult;
      try {
        parsed = await raw.json();
      } catch {
        parsed = { error: { code: 'NON_JSON_RESPONSE', message: await raw.text() } };
      }

      return { status: raw.status(), ok: raw.ok(), body: parsed, raw };
    });
  },
});

export { expect };
