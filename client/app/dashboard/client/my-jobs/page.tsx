'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, DollarSign, Eye, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type ClientJob = {
  id: string
  title: string
  description: string
  budget: number
  status: string
  proposalsCount: number
  selectedFreelancerName: string | null
  createdAt: string
  attachments?: Array<{ name: string; size?: number }>
}

type IncomingProposal = {
  id: string
  jobId: string
  jobTitle: string
  freelancerName: string
  bidAmount: number
  status: string
}

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<ClientJob[]>([])
  const [incoming, setIncoming] = useState<IncomingProposal[]>([])
  const [selectedJob, setSelectedJob] = useState<ClientJob | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const [jobsRes, propRes] = await Promise.all([
        apiFetch<{ jobs: ClientJob[] }>('/jobs/mine'),
        apiFetch<{ proposals: IncomingProposal[] }>('/jobs/proposals/incoming').catch(() => ({ proposals: [] as IncomingProposal[] })),
      ])
      setJobs(jobsRes.jobs)
      setIncoming(propRes.proposals)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load jobs')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const normalizedStatus = (status: string) => (status === 'active' ? 'open' : status)

  const filteredJobs = useMemo(
    () => jobs.filter((job) => statusFilter === 'all' || normalizedStatus(job.status) === statusFilter),
    [jobs, statusFilter]
  )

  const updateStatus = async (job: ClientJob, status: string) => {
    try {
      await apiFetch(`/jobs/${job.id}`, {
        method: 'PATCH',
        json: { status },
      })
      await refresh()
      setSelectedJob((prev) => (prev?.id === job.id ? { ...prev, status } : prev))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  const deleteJob = async (job: ClientJob) => {
    try {
      await apiFetch(`/jobs/${job.id}`, { method: 'DELETE' })
      await refresh()
      setSelectedJob(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const proposalsForJob = (jobId: string) => incoming.filter((p) => p.jobId === jobId)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">Manage draft, open, in-progress, completed, and cancelled jobs.</p>
        </div>
        <Link href="/dashboard/client/post-job"><Button>Post New Job</Button></Link>
      </div>

      {loadError && <p className="text-sm text-destructive mb-4">{loadError}</p>}
      {loading && <p className="text-muted-foreground mb-4">Loading…</p>}

      <Card className="p-4 mb-6">
        <select className="px-3 py-2 border border-input rounded-lg bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Jobs</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_130px_110px_130px_130px_130px] gap-4 px-4 py-3 bg-secondary text-sm font-medium">
          <span>Job Title</span>
          <span>Status</span>
          <span>Budget</span>
          <span>Proposals</span>
          <span>Created</span>
          <span>Actions</span>
        </div>
        {!loading && filteredJobs.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No jobs found.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="grid grid-cols-[1.4fr_130px_110px_130px_130px_130px_130px] gap-4 px-4 py-4 border-t border-border items-center">
              <span className="font-medium">{job.title}</span>
              <Badge>{normalizedStatus(job.status).replace(/_/g, ' ')}</Badge>
              <span>${job.budget}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{job.proposalsCount}</span>
              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={() => setSelectedJob(job)}><Eye className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => void deleteJob(job)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))
        )}
      </Card>

      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">{selectedJob.title}</h2>
                <p className="text-sm text-muted-foreground">{normalizedStatus(selectedJob.status).replace(/_/g, ' ')}</p>
              </div>
              <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
            </div>
            <p className="text-muted-foreground mb-4">{selectedJob.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Budget</h3>
                <p className="flex items-center gap-2"><DollarSign className="w-4 h-4" />${selectedJob.budget}</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Selected Freelancer</h3>
                <p className="text-muted-foreground">{selectedJob.selectedFreelancerName || 'Not selected yet'}</p>
              </Card>
            </div>
            <Card className="p-4 mb-4">
              <h3 className="font-semibold mb-2">Attached Files</h3>
              {selectedJob.attachments?.length ? (
                selectedJob.attachments.map((file) => <p key={file.name} className="text-sm text-muted-foreground">{file.name}</p>)
              ) : (
                <p className="text-sm text-muted-foreground">No attachments</p>
              )}
            </Card>
            <Card className="p-4 mb-4">
              <h3 className="font-semibold mb-2">Proposals</h3>
              {proposalsForJob(selectedJob.id).length ? (
                proposalsForJob(selectedJob.id).map((proposal) => (
                  <p key={proposal.id} className="text-sm text-muted-foreground">
                    {proposal.freelancerName} — ${proposal.bidAmount} ({proposal.status})
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No proposals yet</p>
              )}
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild><Link href="/dashboard/client/proposals">Review proposals</Link></Button>
              <Button variant="outline" onClick={() => void updateStatus(selectedJob, 'closed')}>Close Job</Button>
              <Button onClick={() => void updateStatus(selectedJob, 'completed')}>Mark Completed</Button>
              <Button variant="outline" onClick={() => void updateStatus(selectedJob, 'cancelled')}>Cancel Job</Button>
              <Button variant="outline" onClick={() => void deleteJob(selectedJob)}>Delete Job</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
