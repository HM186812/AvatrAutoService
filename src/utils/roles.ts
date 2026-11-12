import type { ActiveMenu, UserRole } from '../types';

/**
 * The app has exactly two roles. What a person can do depends only on their role.
 * - admin: everything
 * - sales: dashboard, POS, customers, bills (no void/delete), top sales, installments, own profile
 */

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  sales: 'Sales',
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin (ຜູ້ດູແລລະບົບ)' },
  { value: 'sales', label: 'Sales (ພະນັກງານຂາຍ)' },
];

/** Map a role stored in the database to an app role. Legacy 'super_admin' counts as Admin; anything else has no role. */
export function normalizeRole(raw?: string | null): UserRole | null {
  if (raw === 'admin' || raw === 'super_admin') return 'admin';
  if (raw === 'sales') return 'sales';
  return null;
}

export function isAdminRole(user?: { role?: string | null } | null): boolean {
  return user?.role === 'admin';
}

const ADMIN_ONLY_MENUS: ActiveMenu[] = ['inventory', 'stock_in', 'alerts', 'users'];

export function canAccessMenu(user: { role?: string | null } | null | undefined, menu: ActiveMenu): boolean {
  return isAdminRole(user) || !ADMIN_ONLY_MENUS.includes(menu);
}

export const NO_ROLE_MESSAGE = 'ບັນຊີນີ້ຍັງບໍ່ໄດ້ຮັບບົດບາດ Admin ຫຼື Sales. ກະລຸນາຕິດຕໍ່ Admin.';
