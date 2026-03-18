'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BadgeCheck, Clock, DollarSign, Users, Search, Filter, Info, ShieldCheck } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { CATEGORIES } from '@/lib/constants'

type ClientTrust = {
  emailVerified: boolean
  idVerified: boolean
  paymentVerified: boolean
  memberSince: string
}

type ApiJob = {
  id: string
  title: string
  description: string
  category: string
  budget: number
  hourlyRate: number
  jobType: string
  deadline: string | null
  duration: string | null
  skills: string[]
  proposalsCount: number
  createdAt: string
  clientTrust?: ClientTrust
}

function FindJobsContent() {
  const searchParams = useSearchParams()
  const applyFromUrl = searchParams.get('apply')

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [commissionPercent, setCommissionPercent] = useState(10)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [jobsRes, commRes] = await Promise.all([
          apiFetch<{ jobs: ApiJob[] }>('/jobs'),
          apiFetch<{ commissionPercent: number }>('/platform/commission').catch(() => ({ commissionPercent: 10 })),
        ])
        if (!cancelled) {
          setJobs(jobsRes.jobs)
          setCommissionPercent(commRes.commissionPercent)
        }
      } catch (e) {
        if (!cancelled) {
          setJobs([])
          setMessage(e instanceof Error ? e.message : 'Could not load jobs. Is the API running?')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!applyFromUrl || loading) return
    const exists = jobs.some((j) => j.id === applyFromUrl)
    if (exists) setSelectedJobId(applyFromUrl)
  }, [applyFromUrl, jobs, loading])

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || job.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const selectedJob = jobs.find((job) => job.id === selectedJobId)

  const submitApplication = async () => {
    if (!selectedJob || !bidAmount || !coverLetter.trim()) return
    setMessage('')
    try {
      await apiFetch(`/jobs/${selectedJob.id}/proposals`, {
        method: 'POST',
        json: {
          bidAmount: Number(bidAmount),
          coverLetter: coverLetter.trim(),
          cvFileName: cvFileName || null,
        },
      })
      setMessage(`Application sent for "${selectedJob.title}".`)
      setSelectedJobId(null)
      setBidAmount('')
      setCoverLetter('')
      setCvFileName('')
      const res = await apiFetch<{ jobs: ApiJob[] }>('/jobs')
      setJobs(res.jobs)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not submit proposal.')
    }
  }

  const timelineLabel = (job: ApiJob) => {
    if (job.deadline) {
      const d = new Date(job.deadline)
      if (!Number.isNaN(d.getTime())) return `Due ${d.toLocaleDateString()}`
    }
    if (job.duration?.trim()) return job.duration.trim()
    return 'Timeline flexible'
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Find Jobs</h1>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2" type="button">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedCategory === ''
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                selectedCategory === cat.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading open jobs…</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {!loading && filteredJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No open jobs match your criteria yet.</p>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <Card key={job.id} className="p-6 hover:shadow-lg hover:border-primary transition-all">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{job.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{job.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(job.skills?.length ? job.skills : [job.category]).map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span>
                        {job.jobType === 'hourly' ? `${job.hourlyRate} Br/hr` : `${job.budget} Br`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{timelineLabel(job)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{job.proposalsCount} proposals</span>
                    </div>
                    <span className="capitalize">{job.jobType === 'hourly' ? 'Hourly' : 'Contract'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {commissionPercent}% platform commission applies upon payment
                  </p>
                  {job.clientTrust && (
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {job.clientTrust.emailVerified && (
                        <span className="flex items-center gap-1 text-green-600">
                          <BadgeCheck className="w-3.5 h-3.5" /> Email verified
                        </span>
                      )}
                      {job.clientTrust.idVerified && (
                        <span className="flex items-center gap-1 text-green-600">
                          <ShieldCheck className="w-3.5 h-3.5" /> ID verified
                        </span>
                      )}
                      {job.clientTrust.paymentVerified && (
                        <span className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-3.5 h-3.5" /> Payment verified
                        </span>
                      )}
                      <span>
                        Member since {new Date(job.clientTrust.memberSince).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <Button className="bg-primary hover:bg-primary/90 whitespace-nowrap" type="button" onClick={() => setSelectedJobId(job.id)}>
                  Apply Now
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Apply for {selectedJob.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{selectedJob.description}</p>
            <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 mb-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Budget: <strong>{selectedJob.jobType === 'hourly' ? `${selectedJob.hourlyRate} Br/hr` : `${selectedJob.budget} Br`}</strong>.
                A {commissionPercent}% platform commission will be deducted from your earnings upon payment.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your bid (Br)</label>
                <Input type="number" min="1" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
                {bidAmount && Number(bidAmount) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You will receive ≈ {(Number(bidAmount) * (1 - commissionPercent / 100)).toFixed(2)} Br after {commissionPercent}% commission
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cover letter</label>
                <Textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={5}
                  placeholder="Explain why you are the right freelancer for this job..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CV / resume (PDF name only)</label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setCvFileName(f?.name ?? '')
                  }}
                />
                {cvFileName && <p className="text-xs text-muted-foreground mt-1">Selected: {cvFileName}</p>}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setSelectedJobId(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void submitApplication()} disabled={!bidAmount || !coverLetter.trim()}>
                  Submit Application
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function FindJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Loading jobs…</p>
        </div>
      }
    >
      <FindJobsContent />
    </Suspense>
  )
}
