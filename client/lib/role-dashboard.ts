import type { UserRole } from './types'

export function dashboardPathForRole(role: string | undefined): string {
  if (role === 'super-admin' || role === 'admin') return '/admin/dashboard'
  return '/dashboard'
}

/** Primary profile settings page for the signed-in user’s role. */
export function profileEditPathForRole(role: string | undefined): string {
  if (role === 'client') return '/dashboard/client/profile'
  if (role === 'freelancer') return '/dashboard/freelancer/profile'
  if (role === 'seller') return '/dashboard/seller/profile'
  return '/dashboard'
}

export function postLoginPath(user: {
  role?: UserRole | string
  onboardingProfileStatus?: string
}): string {
  if (user.onboardingProfileStatus === 'pending') {
    const after = profileEditPathForRole(user.role)
    return `/onboarding/profile?next=${encodeURIComponent(after)}`
  }
  return dashboardPathForRole(user.role)
}
