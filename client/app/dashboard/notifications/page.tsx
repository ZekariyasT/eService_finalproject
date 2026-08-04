'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useInAppNotifications } from '@/hooks/use-in-app-notifications'
import { useDashboardBadges } from '@/components/layout/dashboard-badges-context'
import { NotificationDetailSheet } from '@/components/layout/notification-detail-sheet'

export default function DashboardNotificationsPage() {
  const { refreshNavBadges } = useDashboardBadges()
  const {
    items,
    loading,
    markingAll,
    unread,
    markAllRead,
    selectNotification,
    detail,
    relatedHref,
    closeDetail,
  } = useInAppNotifications()

  const handleMarkAll = async () => {
    await markAllRead()
    void refreshNavBadges()
  }

  const handleSelect = async (n: Parameters<typeof selectNotification>[0]) => {
    await selectNotification(n)
    void refreshNavBadges()
  }

  return (
    <>
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alerts stay in your history; mark them read when you have seen them.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={markingAll || unread === 0}
          onClick={() => void handleMarkAll()}
        >
          {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark all read'}
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <ScrollArea className="h-[min(70vh,32rem)]">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16 px-4">No notifications yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(n)}
                    className={cn(
                      'w-full text-left px-4 py-4 text-sm transition-colors hover:bg-muted/60',
                      !n.isRead && 'bg-muted/30'
                    )}
                  >
                    <div className="font-medium text-base line-clamp-2">{n.title}</div>
                    <div className="text-muted-foreground line-clamp-3 text-sm mt-1">{n.body}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
    <NotificationDetailSheet
      notification={detail}
      onClose={closeDetail}
      relatedHref={relatedHref}
    />
    </>
  )
}
