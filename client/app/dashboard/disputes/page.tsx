'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, MessageSquare, Plus, ShieldAlert, User } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type Dispute = {
  id: string
  openedBy: string
  respondentId: string
  refType: 'service_order' | 'digital_purchase'
  refId: string
  reason: string
  status: 'open' | 'reviewing' | 'resolved' | 'rejected' | string
  resolutionNotes: string | null
  createdAt: string
  openedByName: string | null
  openedByEmail: string | null
  respondentName: string | null
  respondentEmail: string | null
  refTitle: string | null
  refAmount: number | null
}

type ServiceOrder = {
  id: string
  serviceId: string
  clientId: string
  freelancerId: string
  totalAmount: number
  createdAt: string
  status: string
}

type ProductPurchase = {
  purchaseId: string
  productId: string
  title: string
  amount: number
  purchasedAt: string
}

type RefOption = {
  refType: 'service_order' | 'digital_purchase'
  refId: string
  label: string
  amount: number
  date: string
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  reviewing: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  resolved: 'bg-primary/15 text-primary',
  rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}

export default function UserDisputesPage() {
  const { user } = useAuth()
  const [list, setList] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [refOptions, setRefOptions] = useState<RefOption[]>([])
  const [selectedRef, setSelectedRef] = useState<string>('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const messagePath = useMemo(() => {
    if (user?.role === 'freelancer') return '/dashboard/freelancer/messages'
    if (user?.role === 'seller') return '/dashboard/seller/messages'
    if (user?.role === 'admin' || user?.role === 'super-admin') return '/admin/messages'
    return '/dashboard/client/messages'
  }, [user?.role])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ disputes: Dispute[] }>('/disputes/mine')
      setList(res.disputes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your disputes')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRefOptions = useCallback(async () => {
    try {
      const [orders, purchases] = await Promise.all([
        apiFetch<{ orders: ServiceOrder[] }>('/orders/services').catch(() => ({ orders: [] })),
        apiFetch<{ purchases: ProductPurchase[] }>('/orders/products').catch(() => ({ purchases: [] })),
      ])
      const merged: RefOption[] = [
        ...orders.orders.map((o) => ({
          refType: 'service_order' as const,
          refId: o.id,
          label: `Service order ${o.id.slice(0, 8)}…`,
          amount: Number(o.totalAmount),
          date: o.createdAt,
        })),
        ...purchases.purchases.map((p) => ({
          refType: 'digital_purchase' as const,
          refId: p.purchaseId,
          label: p.title || `Purchase ${p.purchaseId.slice(0, 8)}…`,
          amount: Number(p.amount),
          date: p.purchasedAt,
        })),
      ].sort((a, b) => (a.date < b.date ? 1 : -1))
      setRefOptions(merged)
    } catch {
      setRefOptions([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openForm = () => {
    setReason('')
    setSelectedRef('')
    setFormError(null)
    setOpen(true)
    void loadRefOptions()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!selectedRef) {
      setFormError('Pick the order or purchase the dispute is about.')
      return
    }
    if (!reason.trim()) {
      setFormError('Describe the issue you are experiencing.')
      return
    }
    const ref = refOptions.find((r) => `${r.refType}:${r.refId}` === selectedRef)
    if (!ref) {
      setFormError('Selected order/purchase is no longer available.')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/disputes', {
        method: 'POST',
        json: {
          refType: ref.refType,
          refId: ref.refId,
          reason: reason.trim(),
        },
      })
      setOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not file dispute')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStatus = (s: string) => (
    <Badge className={`capitalize ${STATUS_STYLES[s] || 'bg-secondary text-foreground'}`} variant="secondary">
      {s.replace(/_/g, ' ')}
    </Badge>
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-muted-foreground">
            File a complaint about an order or purchase, and track its progress with our admins.
          </p>
        </div>
        <Button onClick={openForm}>
          <Plus className="w-4 h-4" /> File a dispute
        </Button>
      </div>

      {error && (
        <Card className="p-4 mb-4 border-destructive/50 text-sm text-destructive bg-destructive/5">{error}</Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No disputes on file</p>
          <p className="text-sm text-muted-foreground mb-4">
            If something goes wrong with an order, file a dispute and an admin will review it.
          </p>
          <Button onClick={openForm}>
            <Plus className="w-4 h-4" /> File a dispute
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((d) => {
            const isOpener = d.openedBy === user?.id
            const counter = isOpener
              ? { id: d.respondentId, name: d.respondentName, email: d.respondentEmail }
              : { id: d.openedBy, name: d.openedByName, email: d.openedByEmail }
            return (
              <Card key={d.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {d.refTitle || d.refType.replace(/_/g, ' ')}
                        {d.refAmount != null && (
                          <span className="text-muted-foreground font-normal"> · Br {d.refAmount.toFixed(2)}</span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isOpener ? 'You opened this dispute' : 'Filed against you'} ·{' '}
                        {new Date(d.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {renderStatus(d.status)}
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-3 text-sm">
                  <div className="rounded-md border border-border bg-secondary/40 p-3">
                    <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Reason</p>
                    <p className="whitespace-pre-wrap">{d.reason}</p>
                  </div>
                  <div className="rounded-md border border-border bg-secondary/40 p-3">
                    <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">
                      {isOpener ? 'Filed against' : 'Filed by'}
                    </p>
                    <p className="font-medium">{counter.name || 'User'}</p>
                    {counter.email && <p className="text-xs text-muted-foreground">{counter.email}</p>}
                  </div>
                </div>

                {d.resolutionNotes && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm mb-3">
                    <p className="text-xs uppercase text-primary/80 tracking-wider mb-1">Admin note</p>
                    <p className="whitespace-pre-wrap">{d.resolutionNotes}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {counter.id && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${messagePath}?peer=${encodeURIComponent(counter.id)}`}>
                        <MessageSquare className="w-4 h-4" /> Message {counter.name?.split(' ')[0] || 'user'}
                      </Link>
                    </Button>
                  )}
                  {counter.id && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/profile/${encodeURIComponent(counter.id)}`}>
                        <User className="w-4 h-4" /> View profile
                      </Link>
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File a dispute</DialogTitle>
            <DialogDescription>
              Pick the service order or product purchase you have an issue with. An admin will review your report and
              the other party will be notified.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="block text-sm font-medium mb-2">Order or purchase</Label>
              <Select value={selectedRef} onValueChange={setSelectedRef}>
                <SelectTrigger>
                  <SelectValue placeholder={refOptions.length ? 'Select one…' : 'No orders or purchases found'} />
                </SelectTrigger>
                <SelectContent>
                  {refOptions.map((opt) => (
                    <SelectItem key={`${opt.refType}:${opt.refId}`} value={`${opt.refType}:${opt.refId}`}>
                      <span className="text-xs uppercase text-muted-foreground mr-2">
                        {opt.refType === 'service_order' ? 'Service' : 'Product'}
                      </span>
                      {opt.label} — Br {opt.amount.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">What went wrong?</Label>
              <Textarea
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what went wrong, what you tried, and what outcome you're looking for."
                required
              />
            </div>

            {formError && <p className="text-destructive text-sm">{formError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedRef || !reason.trim()}>
                {submitting ? 'Submitting…' : 'Submit dispute'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
