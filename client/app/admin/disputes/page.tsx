'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, MessageSquare, Search, ShieldAlert, User } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { apiFetch } from '@/lib/api'

type DisputeStatus = 'open' | 'reviewing' | 'resolved' | 'rejected'

type Dispute = {
  id: string
  openedBy: string
  respondentId: string
  refType: 'service_order' | 'digital_purchase'
  refId: string
  reason: string
  status: DisputeStatus | string
  resolutionNotes: string | null
  createdAt: string
  openedByName: string | null
  openedByEmail: string | null
  respondentName: string | null
  respondentEmail: string | null
  refTitle: string | null
  refAmount: number | null
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  reviewing: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  resolved: 'bg-primary/15 text-primary',
  rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}

export default function AdminDisputesPage() {
  const [list, setList] = useState<Dispute[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DisputeStatus>('all')
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [draftStatus, setDraftStatus] = useState<DisputeStatus>('reviewing')
  const [draftNotes, setDraftNotes] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiFetch<{ disputes: Dispute[] }>('/admin/disputes')
      setList(res.disputes)
      setSelected((current) => (current ? res.disputes.find((d) => d.id === current.id) || null : null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load disputes')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (id: string, status: DisputeStatus, notes?: string | null) => {
    setBusyId(id)
    try {
      await apiFetch(`/admin/disputes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        json: { status, resolutionNotes: notes ?? null },
      })
      await load()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  const openDetail = (d: Dispute) => {
    setSelected(d)
    setDraftStatus((d.status as DisputeStatus) || 'reviewing')
    setDraftNotes(d.resolutionNotes || '')
  }

  const closeDetail = () => {
    setSelected(null)
    setDraftStatus('reviewing')
    setDraftNotes('')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (!q) return true
      const haystack = [
        d.openedByName,
        d.openedByEmail,
        d.respondentName,
        d.respondentEmail,
        d.refTitle,
        d.reason,
        d.id,
        d.refId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [list, search, statusFilter])

  const counts = useMemo(() => {
    const c = { total: list.length, open: 0, reviewing: 0, resolved: 0, rejected: 0 }
    for (const d of list) {
      if (d.status === 'open') c.open += 1
      else if (d.status === 'reviewing') c.reviewing += 1
      else if (d.status === 'resolved') c.resolved += 1
      else if (d.status === 'rejected') c.rejected += 1
    }
    return c
  }, [list])

  const renderStatusBadge = (s: string) => (
    <Badge className={`capitalize ${STATUS_STYLES[s] || 'bg-secondary text-foreground'}`} variant="secondary">
      {s.replace(/_/g, ' ')}
    </Badge>
  )

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-muted-foreground">Review and resolve disputes between users.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Total {counts.total}</Badge>
          <Badge className={STATUS_STYLES.open}>Open {counts.open}</Badge>
          <Badge className={STATUS_STYLES.reviewing}>Reviewing {counts.reviewing}</Badge>
          <Badge className={STATUS_STYLES.resolved}>Resolved {counts.resolved}</Badge>
          <Badge className={STATUS_STYLES.rejected}>Rejected {counts.rejected}</Badge>
        </div>
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by user, email, title, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | DisputeStatus)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No disputes match this filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => openDetail(d)}
              className="w-full text-left"
            >
              <Card className="p-5 hover:bg-accent/30 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
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
                      <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {renderStatusBadge(d.status)}
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mb-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Filed by</p>
                    <p className="font-medium">{d.openedByName || 'Unknown user'}</p>
                    <p className="text-xs text-muted-foreground">{d.openedByEmail || d.openedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Filed against</p>
                    <p className="font-medium">{d.respondentName || 'Unknown user'}</p>
                    <p className="text-xs text-muted-foreground">{d.respondentEmail || d.respondentId}</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-2">{d.reason}</p>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(o) => (!o ? closeDetail() : null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Dispute detail
                </SheetTitle>
                <SheetDescription>
                  Filed {new Date(selected.createdAt).toLocaleString()} on{' '}
                  {selected.refType.replace(/_/g, ' ')} {selected.refTitle ? `“${selected.refTitle}”` : ''}.
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-4">
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase text-muted-foreground tracking-wider">Status</p>
                    {renderStatusBadge(selected.status)}
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reference:</span>{' '}
                    <span className="font-mono text-xs">{selected.refId}</span>
                  </p>
                  {selected.refAmount != null && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Amount:</span> Br {selected.refAmount.toFixed(2)}
                    </p>
                  )}
                </Card>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Card className="p-4 space-y-1">
                    <p className="text-xs uppercase text-muted-foreground tracking-wider">Filed by</p>
                    <p className="font-medium">{selected.openedByName || 'Unknown user'}</p>
                    {selected.openedByEmail && (
                      <p className="text-xs text-muted-foreground">{selected.openedByEmail}</p>
                    )}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/profile/${encodeURIComponent(selected.openedBy)}`}>
                          <User className="w-4 h-4" /> Profile
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/messages?peer=${encodeURIComponent(selected.openedBy)}`}>
                          <MessageSquare className="w-4 h-4" /> Message
                        </Link>
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 space-y-1">
                    <p className="text-xs uppercase text-muted-foreground tracking-wider">Filed against</p>
                    <p className="font-medium">{selected.respondentName || 'Unknown user'}</p>
                    {selected.respondentEmail && (
                      <p className="text-xs text-muted-foreground">{selected.respondentEmail}</p>
                    )}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/profile/${encodeURIComponent(selected.respondentId)}`}>
                          <User className="w-4 h-4" /> Profile
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/messages?peer=${encodeURIComponent(selected.respondentId)}`}>
                          <MessageSquare className="w-4 h-4" /> Message
                        </Link>
                      </Button>
                    </div>
                  </Card>
                </div>

                <Card className="p-4 space-y-2">
                  <p className="text-xs uppercase text-muted-foreground tracking-wider">Reason</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.reason}</p>
                </Card>

                {selected.resolutionNotes && (
                  <Card className="p-4 border-primary/40 bg-primary/5 space-y-2">
                    <p className="text-xs uppercase text-primary/80 tracking-wider">Latest admin note</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.resolutionNotes}</p>
                  </Card>
                )}

                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                    Resolve dispute
                  </h3>

                  <div>
                    <Label className="block text-sm font-medium mb-2">New status</Label>
                    <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v as DisputeStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="reviewing">Reviewing</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-2">Resolution note (visible to both parties)</Label>
                    <Textarea
                      rows={4}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Document the verdict, refund, or escalation outcome."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() =>
                        void updateStatus(selected.id, 'reviewing', draftNotes.trim() || 'Under review by admin')
                      }
                      disabled={busyId === selected.id}
                    >
                      Mark reviewing
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void updateStatus(selected.id, 'rejected', draftNotes.trim() || 'Rejected.')}
                      disabled={busyId === selected.id}
                    >
                      Reject
                    </Button>
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => void updateStatus(selected.id, 'resolved', draftNotes.trim() || 'Resolved.')}
                      disabled={busyId === selected.id}
                    >
                      Resolve
                    </Button>
                    <Button
                      onClick={() => void updateStatus(selected.id, draftStatus, draftNotes.trim() || null)}
                      disabled={busyId === selected.id}
                    >
                      Save changes
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
