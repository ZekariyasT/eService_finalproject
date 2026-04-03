'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { HireInvitationsBoard } from '@/components/hire/hire-invitations-board'
import { toast } from '@/hooks/use-toast'

type HireInvitation = {
  id: string
  freelancerId: string
  freelancerName: string
  title: string
  message: string
  proposedAmount: number
  status: string
  serviceTitle: string | null
  jobId: string | null
  createdAt: string
}

export default function ClientInvitationsPage() {
  const [invitations, setInvitations] = useState<HireInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ invitations: HireInvitation[] }>('/hire/invitations/sent')
      setInvitations(res.invitations)
      setMessage('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not load invitations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const cancel = async (id: string) => {
    setMessage('')
    try {
      await apiFetch(`/hire/invitations/${id}`, { method: 'DELETE' })
      toast({
        title: 'Invitation cancelled',
        description: 'The freelancer will no longer see this hire request.',
      })
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not cancel invitation')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sent invitations</h1>
        <p className="mt-2 text-muted-foreground">Track hire invitations you sent to freelancers.</p>
      </div>

      {message ? <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p> : null}

      <HireInvitationsBoard
        mode="sent"
        invitations={invitations.map((invitation) => ({
          ...invitation,
          counterpartyName: invitation.freelancerName,
          counterpartyId: invitation.freelancerId,
        }))}
        loading={loading}
        emptyTitle="No invitations sent yet"
        emptyDescription="Browse services and invite a freelancer when you find the right fit."
        onCancel={cancel}
      />
    </div>
  )
}
