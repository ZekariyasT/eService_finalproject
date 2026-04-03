import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CalendarDays, Coins } from 'lucide-react'

type InvitationCardProps = {
  title: string
  counterpartyName: string
  counterpartyDirection: 'to' | 'from'
  serviceTitle: string | null
  message: string
  proposedAmount: number
  status: string
  createdAt: string
  actions?: ReactNode
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'accepted':
      return 'border-primary/30 bg-primary/10 text-foreground'
    case 'declined':
      return 'border-rose-200 bg-rose-50 text-rose-900'
    case 'cancelled':
      return 'border-slate-200 bg-slate-50 text-slate-700'
    default:
      return ''
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatBudget(amount: number) {
  return `Br ${amount.toLocaleString()}`
}

function formatSentDate(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'recently'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InvitationCard({
  title,
  counterpartyName,
  counterpartyDirection,
  serviceTitle,
  message,
  proposedAmount,
  status,
  createdAt,
  actions,
}: InvitationCardProps) {
  const directionLabel = counterpartyDirection === 'to' ? 'To' : 'From'
  const initial = counterpartyName.trim().charAt(0).toUpperCase() || '?'

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {initial}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-semibold leading-tight">{title}</h2>
                <p className="text-sm text-muted-foreground">
                  {directionLabel} {counterpartyName}
                  {serviceTitle ? (
                    <>
                      <span className="px-1 text-muted-foreground/70">·</span>
                      <span>{serviceTitle}</span>
                    </>
                  ) : null}
                </p>
              </div>

              <Badge variant="outline" className={cn('capitalize', statusBadgeClass(status))}>
                {formatStatus(status)}
              </Badge>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {proposedAmount > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span>
                    Proposed budget: <span className="font-medium text-foreground">{formatBudget(proposedAmount)}</span>
                  </span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>Sent {formatSentDate(createdAt)}</span>
              </span>
            </div>
          </div>
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[220px] lg:flex-col lg:items-stretch">{actions}</div> : null}
      </div>
    </Card>
  )
}
