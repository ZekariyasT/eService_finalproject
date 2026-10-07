'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api'
import {
  Search,
  RefreshCcw,
  Loader2,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Wallet,
  ShoppingBag,
  Banknote,
} from 'lucide-react'

type TxKind = 'service_order' | 'digital_purchase' | 'wallet'

type AdminTransaction = {
  id: string
  kind: TxKind
  subType: string | null
  refType: string
  refId: string
  payerId: string | null
  payerName: string | null
  payerEmail: string | null
  payeeId: string | null
  payeeName: string | null
  payeeEmail: string | null
  amount: number
  fee: number
  method: string | null
  status: string
  description: string | null
  createdAt: string
}

type Summary = {
  count: number
  platformFees: number
  userVolume: number
  serviceVolume: number
  productVolume: number
  topupVolume: number
  withdrawVolume: number
}

type TxResponse = {
  transactions: AdminTransaction[]
  summary: Summary
}

const KIND_FILTERS: Array<{ value: 'all' | TxKind; label: string }> = [
  { value: 'all', label: 'All kinds' },
  { value: 'service_order', label: 'Service orders' },
  { value: 'digital_purchase', label: 'Digital purchases' },
  { value: 'wallet', label: 'Wallet activity' },
]

function fmt(n: number) {
  return `Br ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}`
}

function kindBadge(kind: TxKind) {
  switch (kind) {
    case 'service_order':
      return { label: 'Service order', className: 'bg-blue-100 text-blue-700' }
    case 'digital_purchase':
      return { label: 'Digital purchase', className: 'bg-purple-100 text-purple-700' }
    case 'wallet':
      return { label: 'Wallet', className: 'bg-amber-100 text-amber-700' }
  }
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'completed' || s === 'success' || s === 'completed_with_fee') return 'bg-primary/10 text-primary'
  if (s === 'pending' || s === 'processing') return 'bg-yellow-100 text-yellow-700'
  if (s === 'failed' || s === 'rejected') return 'bg-red-100 text-red-700'
  return 'bg-secondary text-secondary-foreground'
}

export default function AdminPayments() {
  const [data, setData] = useState<TxResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'all' | TxKind>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<TxResponse>('/admin/transactions')
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!data) return []
    return data.transactions.filter((t) => {
      if (kind !== 'all' && t.kind !== kind) return false
      if (!q) return true
      return (
        (t.payerName ?? '').toLowerCase().includes(q) ||
        (t.payerEmail ?? '').toLowerCase().includes(q) ||
        (t.payeeName ?? '').toLowerCase().includes(q) ||
        (t.payeeEmail ?? '').toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.subType ?? '').toLowerCase().includes(q)
      )
    })
  }, [data, q, kind])

  const summary = data?.summary

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments & Transactions</h1>
          <p className="text-muted-foreground">
            Every payment that has moved between users on the platform — service orders, digital purchases and
            wallet activity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">User-to-user volume</p>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{summary ? fmt(summary.userVolume) : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Service orders + digital purchases</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Service orders</p>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{summary ? fmt(summary.serviceVolume) : '—'}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Wallet top-ups</p>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{summary ? fmt(summary.topupVolume) : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Withdrawals: {summary ? fmt(summary.withdrawVolume) : '—'}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Platform fees</p>
            <Banknote className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{summary ? fmt(summary.platformFees) : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Collected from withdrawals & transfers</p>
        </Card>
      </div>

      <Card className="p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by payer, payee, description or id..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as 'all' | TxKind)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Filter by kind" />
          </SelectTrigger>
          <SelectContent>
            {KIND_FILTERS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {error && (
        <Card className="mb-4 p-4 border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Kind</th>
                <th className="px-4 py-3 font-semibold">From → To</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && !data && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Loading transactions…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No transactions match your filter.
                  </td>
                </tr>
              )}
              {filtered.map((t) => {
                const k = kindBadge(t.kind)
                return (
                  <tr key={`${t.kind}-${t.id}`} className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <Badge className={`border-0 ${k.className}`}>{k.label}</Badge>
                      {t.subType && (
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                          {t.subType}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.payerName || '—'}</p>
                          {t.payerEmail && (
                            <p className="text-xs text-muted-foreground truncate">{t.payerEmail}</p>
                          )}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.payeeName || '—'}</p>
                          {t.payeeEmail && (
                            <p className="text-xs text-muted-foreground truncate">{t.payeeEmail}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.description || '—'}</td>
                    <td className="px-4 py-3 font-medium">{fmt(t.amount)}</td>
                    <td className="px-4 py-3">{t.fee ? fmt(t.fee) : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{t.method || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${statusBadge(t.status)}`}>
                        {t.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
