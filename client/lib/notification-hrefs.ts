import type { UserRole } from '@/lib/types'

/** Fallback when type is unknown — prefer dashboard home over staying on nothing. */
function roleHomeHref(role: UserRole | undefined): string | null {
  if (!role) return null
  if (role === 'admin' || role === 'super-admin') return '/admin/dashboard'
  if (role === 'client') return '/dashboard/client/dashboard'
  if (role === 'freelancer') return '/dashboard/freelancer/dashboard'
  if (role === 'seller') return '/dashboard/seller/dashboard'
  return null
}

/** Target route for an in-app notification row by type and role. */
export function hrefForNotificationType(type: string, role: UserRole | undefined): string | null {
  if (!role) return null
  if (role === 'admin' || role === 'super-admin') {
    switch (type) {
      case 'message':
        return '/admin/messages'
      case 'dispute':
        return '/admin/disputes'
      case 'contact':
        return '/admin/contact-messages'
      case 'verification':
      case 'coins':
        return '/admin/users'
      case 'system':
        return '/admin/notifications'
      default:
        return '/admin/dashboard'
    }
  }
  switch (type) {
    case 'message':
      if (role === 'client') return '/dashboard/client/messages'
      if (role === 'freelancer') return '/dashboard/freelancer/messages'
      if (role === 'seller') return '/dashboard/seller/messages'
      return null
    case 'order_service':
      if (role === 'freelancer') return '/dashboard/freelancer/dashboard'
      if (role === 'client') return '/dashboard/client/dashboard'
      return null
    case 'order_status':
      return '/dashboard/client/my-jobs'
    case 'order_product':
      return '/dashboard/seller/orders'
    case 'review':
      if (role === 'freelancer') return '/dashboard/freelancer/profile'
      if (role === 'seller') return '/dashboard/seller/profile'
      return '/dashboard/client/profile'
    case 'dispute':
      return '/dashboard/disputes'
    case 'verification':
      return '/dashboard/settings'
    case 'welcome':
      if (role === 'client') return '/dashboard/client/dashboard'
      if (role === 'freelancer') return '/dashboard/freelancer/dashboard'
      if (role === 'seller') return '/dashboard/seller/dashboard'
      return null
    case 'complete_profile':
      if (role === 'client') return '/dashboard/client/profile'
      if (role === 'freelancer') return '/dashboard/freelancer/profile'
      if (role === 'seller') return '/dashboard/seller/profile'
      return null
    case 'coins':
      if (role === 'client') return '/dashboard/client/rewards'
      if (role === 'freelancer') return '/dashboard/freelancer/wallet'
      return '/dashboard/seller/dashboard'
    case 'new_job':
      if (role === 'freelancer') return '/dashboard/freelancer/find-jobs'
      return null
    case 'job_proposal':
      if (role === 'client') return '/dashboard/client/proposals'
      return null
    case 'hire_invitation':
      if (role === 'freelancer') return '/dashboard/freelancer/invitations'
      return null
    case 'hire_invitation_accepted':
    case 'hire_invitation_declined':
      if (role === 'client') return '/dashboard/client/invitations'
      return null
    case 'system':
      return '/dashboard/notifications'
    default:
      return roleHomeHref(role) ?? '/dashboard/notifications'
  }
}
