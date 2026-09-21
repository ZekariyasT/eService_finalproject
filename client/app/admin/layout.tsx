'use client'

import { useAuth } from '@/lib/auth-context'
import { isAdminUser } from '@/lib/admin-auth'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { DashboardBadgesProvider } from '@/components/layout/dashboard-badges-context'
import { ReactNode, useEffect } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitializing) return
    if (!user || !isAdminUser({ role: user.role })) {
      router.replace('/login')
    }
  }, [isInitializing, router, user])

  if (isInitializing) return null
  if (!user || !isAdminUser({ role: user.role })) return null

  return (
    <DashboardBadgesProvider>
      <div className="flex">
        <AdminSidebar />
        <main className="dashboard-shell flex-1 ml-64 min-h-screen bg-background">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </DashboardBadgesProvider>
  )
}
