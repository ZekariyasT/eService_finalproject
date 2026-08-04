'use client'

import { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { useInAppNotifications } from '@/hooks/use-in-app-notifications'
import { NotificationDetailSheet } from '@/components/layout/notification-detail-sheet'

export type NotificationMenuProps = {
  /** Visual variant for the bell trigger. Use `light` on dark sidebars and `dark` on light backgrounds. */
  variant?: 'light' | 'dark'
}

export function NotificationMenu({ variant = 'light' }: NotificationMenuProps = {}) {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const {
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
  } = useInAppNotifications()

  useEffect(() => {
    if (open) void load({ silent: true })
  }, [open, load])

  if (!isAuthenticated) return null

  const triggerClass =
    variant === 'dark'
      ? 'relative p-2 hover:bg-secondary rounded-lg transition-colors'
      : 'relative p-2 hover:bg-white/15 rounded-lg transition-colors'
  const bellClass = variant === 'dark' ? 'w-5 h-5 text-foreground' : 'w-5 h-5 text-white'

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass} aria-label="Notifications">
          <Bell className={bellClass} />
          {unread > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] text-white border-0 pointer-events-none">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] p-0 z-[100] border border-border shadow-lg"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs"
            type="button"
            title="Notifications are never deleted; this only marks them as read."
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void markAllRead()
            }}
            disabled={markingAll || unread === 0}
          >
            {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark all read'}
          </Button>
        </div>
        <ScrollArea className="max-h-[min(70vh,24rem)]">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">No notifications yet</p>
          ) : (
            <ul className="py-1">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() =>
                      void selectNotification(n, { onAfterNavigate: () => setOpen(false) })
                    }
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-muted/80',
                      !n.isRead && 'bg-muted/40'
                    )}
                  >
                    <div className="font-medium line-clamp-1">{n.title}</div>
                    <div className="text-muted-foreground line-clamp-2 text-xs mt-0.5">{n.body}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
    <NotificationDetailSheet
      notification={detail}
      onClose={closeDetail}
      relatedHref={relatedHref}
    />
    </>
  )
}
