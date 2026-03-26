'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

type Proposal = {
  id: string
  jobId: string
  jobTitle: string
  freelancerId: string
  freelancerName: string
  bidAmount: number
  coverLetter: string
  cvFileName?: string | null
  status: string
  createdAt?: string
}

export default function ProposalsPage() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selected, setSelected] = useState<Proposal | null>(null)
  const [sortBy, setSortBy] = useState('bid_low')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setMessage('')
    try {
      const res = await apiFetch<{ proposals: Proposal[] }>('/jobs/proposals/incoming')
      setProposals(res.proposals)
    } catch (e) {
      setProposals([])
      setMessage(e instanceof Error ? e.message : 'Could not load proposals.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    const next = [...proposals]
    if (sortBy === 'bid_low') next.sort((a, b) => Number(a.bidAmount) - Number(b.bidAmount))
    if (sortBy === 'date') next.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    return next
  }, [proposals, sortBy])

  const updateProposal = async (proposal: Proposal, status: 'accepted' | 'rejected') => {
    setMessage('')
    try {
      await apiFetch(`/jobs/proposals/${proposal.id}`, {
        method: 'PATCH',
        json: { status },
      })
      await load()
      setSelected((prev) => (prev?.id === proposal.id ? { ...prev, status } : prev))
      setMessage(status === 'accepted' ? 'Proposal accepted. Job moved to in progress.' : 'Proposal rejected.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Update failed')
    }
  }

  const messageFreelancer = (proposal: Proposal) => {
    if (!proposal.freelancerId) return
    router.push(`/dashboard/client/messages?peer=${encodeURIComponent(proposal.freelancerId)}`)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Proposals Received</h1>
          <p className="text-muted-foreground">Review freelancers, compare offers, and hire the best match.</p>
        </div>
        <select className="px-3 py-2 border border-input rounded-lg bg-background" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="bid_low">Bid (low to high)</option>
          <option value="date">Newest first</option>
        </select>
      </div>
      {message && <p className="text-sm text-muted-foreground mb-4">{message}</p>}
      {loading && <p className="text-muted-foreground mb-4">Loading…</p>}

      <div className="space-y-4">
        {!loading && sorted.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No proposals yet. Post a job to receive proposals.</Card>
        ) : (
          sorted.map((proposal) => (
            <Card key={proposal.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {proposal.freelancerName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{proposal.freelancerName}</h3>
                      <Badge variant="secondary">{proposal.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{proposal.jobTitle}</p>
                    {proposal.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(proposal.createdAt).toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{proposal.coverLetter}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="font-semibold">${proposal.bidAmount}</p>
                  <Button size="sm" type="button" onClick={() => setSelected(proposal)}>
                    View
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">{selected.freelancerName}</h2>
                <p className="text-sm text-muted-foreground">{selected.jobTitle}</p>
              </div>
              <Button variant="outline" type="button" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{selected.coverLetter}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Proposed price</p>
                <p className="font-bold">${selected.bidAmount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">CV / file name</p>
                <p className="font-bold">{selected.cvFileName || '—'}</p>
              </Card>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void updateProposal(selected, 'accepted')}
                disabled={selected.status === 'accepted' || selected.status === 'rejected'}
              >
                {selected.status === 'accepted' ? 'Accepted' : 'Accept Proposal'}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => void updateProposal(selected, 'rejected')}
                disabled={selected.status === 'accepted' || selected.status === 'rejected'}
              >
                {selected.status === 'rejected' ? 'Rejected' : 'Reject'}
              </Button>
              <Button variant="outline" type="button" onClick={() => messageFreelancer(selected)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Freelancer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
