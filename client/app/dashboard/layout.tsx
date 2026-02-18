'use client'

import Link from 'next/link'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardBadgesProvider } from '@/components/layout/dashboard-badges-context'
import { useAuth } from '@/lib/auth-context'
import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { profileEditPathForRole } from '@/lib/role-dashboard'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isInitializing, router])

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-transparent border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardBadgesProvider>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main className="dashboard-shell flex-1 bg-background">
          {user?.onboardingProfileStatus === 'pending' ? (
            <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50/95">
              <span className="font-medium">Your profile questionnaire is not finished yet.</span>{' '}
              <Link
                href={`/onboarding/profile?next=${encodeURIComponent(profileEditPathForRole(user.role))}`}
                className="underline underline-offset-2 font-medium text-primary"
              >
                Complete it now
              </Link>{' '}
              or fill in the same sections from your profile page whenever you like.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </DashboardBadgesProvider>
  )
}
