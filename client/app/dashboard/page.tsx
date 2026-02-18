'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function DashboardRootPage() {
  const router = useRouter()
  const { user, isInitializing } = useAuth()

  useEffect(() => {
    if (isInitializing) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (user.role === 'admin' || user.role === 'super-admin') {
      router.replace('/admin/dashboard')
      return
    }

    if (user.role === 'client') {
      router.replace('/dashboard/client/dashboard')
      return
    }
    if (user.role === 'seller') {
      router.replace('/dashboard/seller/dashboard')
      return
    }
    router.replace('/dashboard/freelancer/dashboard')
  }, [isInitializing, router, user])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
    </div>
  )
}
