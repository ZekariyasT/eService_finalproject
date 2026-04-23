'use client'

import Link from 'next/link'
import { ArrowLeft, CalendarDays, Coins, Info, MessageCircle, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ContractRecord } from '@/components/contracts/contract-types'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type ContractDetailViewProps = {
  contract: ContractRecord
  backHref: string
  messagesHref: string
  counterpartyLabel: string
  counterpartyName: string
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'in_progress':
      return 'border-primary/30 bg-primary/10 text-foreground'
    case 'completed':
      return 'border-slate-200 bg-slate-50 text-slate-700'
    case 'cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-900'
    default:
      return ''
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatBudget(contract: ContractRecord) {
  if (contract.hourlyRate > 0) return `Br ${contract.hourlyRate.toLocaleString()}/hr`
  return `Br ${contract.budget.toLocaleString()}`
}

export function ContractDetailView({
  contract,
  backHref,
  messagesHref,
  counterpartyLabel,
  counterpartyName,
}: ContractDetailViewProps) {
  const [commissionPercent, setCommissionPercent] = useState<number | null>(null)

  useEffect(() => {
    apiFetch<{ commissionPercent: number }>('/platform/commission')
      .then((r) => setCommissionPercent(r.commissionPercent))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to contracts
          </Link>
        </Button>
        <Button asChild>
          <Link href={messagesHref}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Message {counterpartyName}
          </Link>
        </Button>
      </div>

      <Card className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{contract.title}</h1>
            <p className="text-muted-foreground">
              {counterpartyLabel} {counterpartyName}
            </p>
          </div>
          <Badge variant="outline" className={statusBadgeClass(contract.status)}>
            {formatStatus(contract.status)}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Agreed budget</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <Coins className="h-4 w-4 text-primary" />
              {formatBudget(contract)}
            </p>
            {commissionPercent != null && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" /> {commissionPercent}% platform commission on payment
              </p>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="mt-2 text-lg font-semibold">{contract.category}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Started</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              {new Date(contract.createdAt).toLocaleDateString()}
            </p>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <UserRound className="h-4 w-4 text-primary" />
              Client
            </p>
            <p className="font-semibold">{contract.clientName}</p>
          </Card>
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <UserRound className="h-4 w-4 text-primary" />
              Freelancer
            </p>
            <p className="font-semibold">{contract.freelancerName}</p>
          </Card>
        </div>

        <div className="mt-6 rounded-xl border border-border/70 bg-muted/30 p-5">
          <h2 className="mb-3 text-lg font-semibold">Scope and brief</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{contract.description}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {contract.duration ? <span>Duration: {contract.duration}</span> : null}
          {contract.deadline ? <span>Deadline: {new Date(contract.deadline).toLocaleDateString()}</span> : null}
          <span>Last updated: {new Date(contract.updatedAt).toLocaleString()}</span>
        </div>
      </Card>
    </div>
  )
}
