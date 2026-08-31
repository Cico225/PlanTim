import { User } from '@/types';

const ADMIN_ROLES = ['admin', 'super-admin', 'super_admin', 'super admin'];

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const role = (user.role || '').toLowerCase().trim();
  if (ADMIN_ROLES.includes(role)) {
    return true;
  }

  const roles = (user as User & { roles?: string[] }).roles || [];
  return roles.some((r) => ADMIN_ROLES.includes(String(r).toLowerCase().trim()));
}
