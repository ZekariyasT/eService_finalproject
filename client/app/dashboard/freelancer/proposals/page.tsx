'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, DollarSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type Proposal = {
  id: string
  jobTitle: string
  bidAmount: number
  status: string
  createdAt?: string
  cvFileName?: string | null
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setMessage('')
    try {
      const res = await apiFetch<{ proposals: Proposal[] }>('/jobs/proposals/mine')
      setProposals(
        res.proposals.map((p) => ({
          ...p,
          createdAt: p.createdAt,
        }))
      )
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

  const withdrawProposal = async (id: string) => {
    try {
      await apiFetch(`/jobs/proposals/${id}/withdraw`, { method: 'POST' })
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Withdraw failed')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-primary/10 text-primary'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Proposals</h1>
      {loading && <p className="text-muted-foreground mb-4">Loading…</p>}
      {message && <p className="text-sm text-destructive mb-4">{message}</p>}

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {!loading && proposals.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No proposals yet</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/freelancer/find-jobs">Browse Jobs</Link>
              </Button>
            </Card>
          ) : (
            proposals.map((proposal) => (
              <Card key={proposal.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{proposal.jobTitle}</h3>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span>Bid: ${proposal.bidAmount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>
                          Submitted:{' '}
                          {new Date(proposal.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      {proposal.cvFileName && <span>CV file: {proposal.cvFileName}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getStatusColor(proposal.status)}>
                      {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                    </Badge>
                    {proposal.status === 'pending' && (
                      <Button variant="outline" size="sm" type="button" onClick={() => void withdrawProposal(proposal.id)}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {proposals
            .filter((p) => p.status === 'pending')
            .map((proposal) => (
              <Card key={proposal.id} className="p-6">
                <h3 className="font-semibold mb-2">{proposal.jobTitle}</h3>
                <p className="text-sm text-muted-foreground">${proposal.bidAmount}</p>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4 mt-6">
          {proposals
            .filter((p) => p.status === 'accepted')
            .map((proposal) => (
              <Card key={proposal.id} className="p-6">
                <h3 className="font-semibold mb-2">{proposal.jobTitle}</h3>
                <p className="text-sm text-primary">Proposal accepted</p>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-6">
          {proposals.filter((p) => p.status === 'rejected').length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No rejected proposals</Card>
          ) : (
            proposals
              .filter((p) => p.status === 'rejected')
              .map((proposal) => (
                <Card key={proposal.id} className="p-6">
                  <h3 className="font-semibold mb-2">{proposal.jobTitle}</h3>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
