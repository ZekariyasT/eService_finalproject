'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'

export function useDashboardNavBadges() {
  const { isAuthenticated } = useAuth()
  const [notificationUnread, setNotificationUnread] = useState(0)
  const [messageUnread, setMessageUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setNotificationUnread(0)
      setMessageUnread(0)
      return
    }
    try {
      const [n, m] = await Promise.all([
        apiFetch<{ unreadCount: number }>('/notifications/unread-count'),
        apiFetch<{ unreadCount: number }>('/messages/unread-count'),
      ])
      setNotificationUnread(typeof n.unreadCount === 'number' ? n.unreadCount : 0)
      setMessageUnread(typeof m.unreadCount === 'number' ? m.unreadCount : 0)
    } catch {
      setNotificationUnread(0)
      setMessageUnread(0)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!isAuthenticated) return
    const t = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(t)
  }, [isAuthenticated, refresh])

  return { notificationUnread, messageUnread, refreshNavBadges: refresh }
}
