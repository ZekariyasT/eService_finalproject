'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'
import type { AppNotification } from '@/lib/types'
import { hrefForNotificationType } from '@/lib/notification-hrefs'

export function useInAppNotifications() {
  const { user, isAuthenticated } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [detail, setDetail] = useState<AppNotification | null>(null)

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isAuthenticated) return
      if (!opts?.silent) setLoading(true)
      try {
        const r = await apiFetch<{ notifications: AppNotification[] }>('/notifications')
        setItems(r.notifications)
      } catch {
        if (!opts?.silent) setItems([])
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [isAuthenticated]
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!isAuthenticated) return
    const t = setInterval(() => void load({ silent: true }), 30_000)
    return () => clearInterval(t)
  }, [isAuthenticated, load])

  const unread = items.filter((n) => !n.isRead).length

  const relatedHref = useMemo(() => {
    if (!detail) return null
    return hrefForNotificationType(detail.type, user?.role)
  }, [detail, user?.role])

  const closeDetail = useCallback(() => setDetail(null), [])

  const markAllRead = async () => {
    if (!items.some((n) => !n.isRead)) return
    setMarkingAll(true)
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' })
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } finally {
      setMarkingAll(false)
    }
  }

  const selectNotification = async (
    n: AppNotification,
    opts?: { onAfterNavigate?: () => void }
  ) => {
    if (!n.isRead) {
      try {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'POST' })
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
      } catch {
        /* still show detail */
      }
    }
    opts?.onAfterNavigate?.()
    setDetail(n)
  }

  return {
    items,
    loading,
    markingAll,
    unread,
    load,
    markAllRead,
    selectNotification,
    detail,
    relatedHref,
    closeDetail,
  }
}
