export type Role = 'VENDOR' | 'ADMIN';
export type ListingStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DELISTED';
export type Category = 'RX' | 'OTC' | 'DME' | 'WELLNESS';

export interface AuditEntry {
  status: ListingStatus;
  byUserId: string;
  at: string;
  reason?: string | null;
}

export interface Listing {
  id: string;
  tenantId: string;
  vendorId: string;
  sku: string;
  productName: string;
  category: Category;
  priceCents: number;
  status: ListingStatus;
  rejectionReason: string | null;
  audit: AuditEntry[];
}

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** userId is null while logged out. The tenant always has a value (the store being browsed). */
export interface Identity {
  userId: string | null;
  tenantId: string;
}

/** Shape returned by POST /auth/login. */
export interface LoginUser {
  id: string;
  username: string;
  role: Role;
  vendorId?: string | null;
  tenantId?: string | null;
}
