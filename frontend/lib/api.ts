import { DEFAULT_IDENTITY } from './seed';
import type { ApiResult, Identity, Listing, LoginUser, StorefrontProduct } from './types';

const BASE = '/api'; // proxied to FastAPI by next.config.mjs

export function readIdentity(): Pick<Identity, 'userId' | 'tenantId'> {
  if (typeof window === 'undefined') return DEFAULT_IDENTITY;
  try {
    return {
      userId: localStorage.getItem('userId') || null,
      tenantId: localStorage.getItem('tenantId') || DEFAULT_IDENTITY.tenantId,
    };
  } catch {
    return DEFAULT_IDENTITY;
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const { userId, tenantId } = readIdentity();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}), // omitted while logged out (storefront and login are public)
        'X-Tenant-Id': tenantId,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: '' } };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok) {
    const err = json?.error;
    return { ok: false, error: { code: err?.code ?? `HTTP_${res.status}`, message: err?.message ?? '' } };
  }
  // Tolerate an optional { success, data } envelope.
  const data = json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
  return { ok: true, data: data as T };
}

/** Accepts a bare array or { listings | products | items | data: [...] }. */
function toList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  for (const key of ['listings', 'products', 'items', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

async function list<T>(path: string): Promise<ApiResult<T[]>> {
  const res = await request<unknown>(path);
  return res.ok ? { ok: true, data: toList<T>(res.data) } : res;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginUser>('/auth/login', { method: 'POST', body: { username, password } }),
  submitListing: (sku: string, priceCents: number) =>
    request<Listing>('/listings', { method: 'POST', body: { sku, priceCents } }),
  listListings: () => list<Listing>('/listings'),
  approve: (id: string) => request<Listing>(`/listings/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) => request<Listing>(`/listings/${id}/reject`, { method: 'POST', body: { reason } }),
  delist: (id: string) => request<Listing>(`/listings/${id}/delist`, { method: 'POST' }),
  storefront: () => list<StorefrontProduct>('/storefront/products'),
};
