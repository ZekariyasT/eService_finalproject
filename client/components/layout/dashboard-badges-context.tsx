'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useDashboardNavBadges } from '@/hooks/use-dashboard-nav-badges'

type DashboardBadgesValue = ReturnType<typeof useDashboardNavBadges>

const DashboardBadgesContext = createContext<DashboardBadgesValue | null>(null)

export function DashboardBadgesProvider({ children }: { children: ReactNode }) {
  const value = useDashboardNavBadges()
  return <DashboardBadgesContext.Provider value={value}>{children}</DashboardBadgesContext.Provider>
}

export function useDashboardBadges() {
  const ctx = useContext(DashboardBadgesContext)
  if (!ctx) {
    throw new Error('useDashboardBadges must be used within DashboardBadgesProvider')
  }
  return ctx
}
