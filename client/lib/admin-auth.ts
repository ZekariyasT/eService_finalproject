/** Admin panel: JWT `role` must be `admin` or `super-admin` (set in database, not by email). */

export function isSuperAdmin(user?: { role?: string }): boolean {
  return user?.role === 'super-admin'
}

export function isSupportAdmin(user?: { role?: string }): boolean {
  return user?.role === 'admin'
}

export function isAdminUser(user?: { role?: string }): boolean {
  return user?.role === 'admin' || user?.role === 'super-admin'
}

export function getAdminRole(user?: { role?: string }): 'super-admin' | 'admin' | null {
  if (!user?.role) return null
  if (user.role === 'super-admin') return 'super-admin'
  if (user.role === 'admin') return 'admin'
  return null
}
