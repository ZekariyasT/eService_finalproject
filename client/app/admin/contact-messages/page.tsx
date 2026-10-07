'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Inbox, Mail, Search, User } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { apiFetch } from '@/lib/api'

type Submission = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function AdminContactMessagesPage() {
  const [list, setList] = useState<Submission[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Submission | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiFetch<{ submissions: Submission[] }>('/admin/contact-messages')
      setList(res.submissions)
      setSelected((current) => (current ? res.submissions.find((s) => s.id === current.id) || null : null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markRead = async (id: string) => {
    setBusyId(id)
    try {
      await apiFetch(`/admin/contact-messages/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
      await load()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  const openDetail = (s: Submission) => {
    setSelected(s)
    if (!s.isRead) void markRead(s.id)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.message.toLowerCase().includes(q)
    )
  }, [list, search])

  const unreadCount = useMemo(() => list.filter((s) => !s.isRead).length, [list])

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="w-8 h-8 text-primary" />
            Contact inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            Messages sent from the public Contact Us page. Admins also receive an in-app notification for each new
            submission.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Badge variant="secondary" className="w-fit">
            {unreadCount} unread
          </Badge>
        ) : null}
      </div>

      {error ? (
        <Card className="p-4 mb-6 border-destructive/50 text-destructive">
          {error}
          <Button variant="outline" size="sm" className="ml-4" type="button" onClick={() => void load()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, subject, or message…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{list.length === 0 ? 'No contact submissions yet.' : 'No matches for your search.'}</p>
          </Card>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openDetail(s)}
              className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                !s.isRead ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                  <span className="font-medium truncate">{s.name}</span>
                  {!s.isRead ? (
                    <Badge className="shrink-0" variant="default">
                      New
                    </Badge>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {s.email}
              </p>
              <p className="font-medium mt-2 line-clamp-1">{s.subject}</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.message}</p>
            </button>
          ))
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject}</SheetTitle>
                <SheetDescription asChild>
                  <div className="space-y-1 text-left">
                    <p>
                      <span className="font-medium text-foreground">{selected.name}</span>
                      {' · '}
                      <a href={`mailto:${selected.email}`} className="underline underline-offset-2">
                        {selected.email}
                      </a>
                    </p>
                    <p className="text-xs">
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{selected.message}</div>
              <p className="mt-6 text-xs text-muted-foreground">
                {!selected.isRead && busyId === selected.id
                  ? 'Marking as read…'
                  : selected.isRead
                    ? 'Marked as read'
                    : 'Opening marks this message as read.'}
              </p>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
