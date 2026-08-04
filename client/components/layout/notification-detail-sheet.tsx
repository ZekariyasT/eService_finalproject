'use client'

import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

import type { AppNotification } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type Props = {
  notification: AppNotification | null
  onClose: () => void
  /** When set, shows a button to navigate to the contextual screen (messages, disputes, etc.). */
  relatedHref: string | null
}

export function NotificationDetailSheet({ notification, onClose, relatedHref }: Props) {
  const router = useRouter()
  const open = Boolean(notification)

  const goRelated = () => {
    if (!relatedHref) return
    onClose()
    router.push(relatedHref)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col gap-4 sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left space-y-2">
          <SheetTitle className="pr-8 leading-snug">{notification?.title ?? ''}</SheetTitle>
          {notification?.createdAt ? (
            <SheetDescription>
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground min-h-[4rem]">
          {notification?.body ?? ''}
        </div>
        <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-end mt-auto pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {relatedHref ? (
            <Button type="button" onClick={goRelated}>
              Open related page
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
