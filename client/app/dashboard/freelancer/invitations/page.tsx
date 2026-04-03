'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { HireInvitationsBoard } from '@/components/hire/hire-invitations-board'
import { toast } from '@/hooks/use-toast'

type HireInvitation = {
  id: string
  clientId: string
  clientName: string
  title: string
  message: string
  proposedAmount: number
  status: string
  serviceTitle: string | null
  jobId: string | null
  createdAt: string
}

export default function FreelancerInvitationsPage() {
  const [invitations, setInvitations] = useState<HireInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ invitations: HireInvitation[] }>('/hire/invitations/received')
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

  const respond = async (id: string, action: 'accept' | 'decline') => {
    setMessage('')
    try {
      await apiFetch(`/hire/invitations/${id}/${action}`, { method: 'POST' })
      toast({
        title: action === 'accept' ? 'Invitation accepted' : 'Invitation declined',
        description:
          action === 'accept'
            ? 'You can follow up with the client from messages.'
            : 'The client has been notified of your decision.',
      })
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not update invitation')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hire invitations</h1>
        <p className="mt-2 text-muted-foreground">Review direct hire requests from clients.</p>
      </div>

      {message ? <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p> : null}

      <HireInvitationsBoard
        mode="received"
        invitations={invitations.map((invitation) => ({
          ...invitation,
          counterpartyName: invitation.clientName,
          counterpartyId: invitation.clientId,
        }))}
        loading={loading}
        emptyTitle="No invitations yet"
        emptyDescription="When a client invites you directly, the request will appear here."
        onAccept={(id) => respond(id, 'accept')}
        onDecline={(id) => respond(id, 'decline')}
      />
    </div>
  )
}
