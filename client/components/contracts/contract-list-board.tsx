'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, CalendarDays, Coins } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { contractTabForStatus, type ContractRecord, type ContractTab } from '@/components/contracts/contract-types'

type ContractListBoardProps = {
  contracts: ContractRecord[]
  loading: boolean
  detailBasePath: string
  counterpartyLabel: string
  getCounterpartyName: (contract: ContractRecord) => string
}

const TAB_LABELS: Record<ContractTab, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
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

export function ContractListBoard({
  contracts,
  loading,
  detailBasePath,
  counterpartyLabel,
  getCounterpartyName,
}: ContractListBoardProps) {
  const [activeTab, setActiveTab] = useState<ContractTab>('active')

  const grouped = useMemo(
    () => ({
      active: contracts.filter((contract) => contractTabForStatus(contract.status) === 'active'),
      completed: contracts.filter((contract) => contractTabForStatus(contract.status) === 'completed'),
      cancelled: contracts.filter((contract) => contractTabForStatus(contract.status) === 'cancelled'),
    }),
    [contracts],
  )

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading contracts…</Card>
  }

  if (contracts.length === 0) {
    return (
      <Card className="p-10 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No contracts yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Accepted hire invitations and proposals will appear here once work starts.
        </p>
      </Card>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContractTab)} className="w-full">
      <TabsList className="mb-6 h-auto flex-wrap">
        {(Object.keys(TAB_LABELS) as ContractTab[]).map((tab) => (
          <TabsTrigger key={tab} value={tab} className="px-4">
            {TAB_LABELS[tab]} ({grouped[tab].length})
          </TabsTrigger>
        ))}
      </TabsList>

      {(Object.keys(TAB_LABELS) as ContractTab[]).map((tab) => (
        <TabsContent key={tab} value={tab} className="space-y-4">
          {grouped[tab].length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No {TAB_LABELS[tab].toLowerCase()} contracts.</Card>
          ) : (
            grouped[tab].map((contract) => (
              <Card key={contract.id} className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <h2 className="text-lg font-semibold">{contract.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {counterpartyLabel} {getCounterpartyName(contract)}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusBadgeClass(contract.status)}>
                        {formatStatus(contract.status)}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{contract.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        {formatBudget(contract)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Started {new Date(contract.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`${detailBasePath}/${contract.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Open contract
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
