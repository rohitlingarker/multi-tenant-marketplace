import type { Category, Identity, Role } from './types';

// Mirrors backend/app/db/seed-data.json. Products are global and vendors never create them,
// so the submit form's dropdown is static.
export const PRODUCTS: { sku: string; name: string; category: Category }[] = [
  { sku: 'RX-100', name: 'Atorvastatin 20mg, 30 tabs', category: 'RX' },
  { sku: 'OTC-200', name: 'Loratadine 10mg, 30 tabs', category: 'OTC' },
  { sku: 'DME-300', name: 'Digital BP monitor', category: 'DME' },
  { sku: 'DME-301', name: 'Nebulizer kit', category: 'DME' },
  { sku: 'WEL-400', name: 'Vitamin D3 2000 IU', category: 'WELLNESS' },
];

export const TENANTS = [
  { id: 'sunrise-pharmacy', name: 'Sunrise Pharmacy' },
  { id: 'vitalcare', name: 'VitalCare' },
];

export const USERS: { id: string; label: string; role: Role; tenantId?: string }[] = [
  { id: 'vendor-a-user', label: 'Vendor A', role: 'VENDOR' },
  { id: 'vendor-b-user', label: 'Vendor B', role: 'VENDOR' },
  { id: 'vendor-c-user', label: 'Vendor C', role: 'VENDOR' },
  { id: 'admin-sunrise', label: 'Admin Sunrise', role: 'ADMIN', tenantId: 'sunrise-pharmacy' },
  { id: 'admin-vitalcare', label: 'Admin VitalCare', role: 'ADMIN', tenantId: 'vitalcare' },
];

export const DEFAULT_IDENTITY: Identity = { userId: null, tenantId: 'sunrise-pharmacy', role: null };

export function roleOf(userId: string | null): Role | null {
  return USERS.find((u) => u.id === userId)?.role ?? null;
}
