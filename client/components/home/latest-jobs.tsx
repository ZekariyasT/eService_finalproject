'use client'

import { Button } from '@/components/ui/button'
import { Clock, DollarSign, Tag } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

function applyHref(jobId: string, isAuthenticated: boolean, isFreelancer: boolean): string {
  const target = `/dashboard/freelancer/find-jobs?apply=${encodeURIComponent(jobId)}`
  if (isAuthenticated && isFreelancer) return target
  if (!isAuthenticated) {
    const redirect = encodeURIComponent(target)
    return `/login?redirect=${redirect}`
  }
  return target
}

type OpenJob = {
  id: string
  title: string
  description: string
  category: string
  budget: number
  hourlyRate: number
  jobType: string
  skills: string[]
  proposalsCount: number
  deadline: string | null
  duration: string | null
}

type Props = { variant?: 'default' | 'compact'; query?: string }

export function LatestJobs({ variant = 'default', query = '' }: Props) {
  const { user, isAuthenticated } = useAuth()
  const [jobs, setJobs] = useState<OpenJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ jobs: OpenJob[] }>('/jobs')
      .then((res) => {
        if (!cancelled) setJobs(res.jobs)
      })
      .catch(() => {
        if (!cancelled) setJobs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const normalizedQuery = query.trim().toLowerCase()

  const visibleJobs = useMemo(() => {
    const filtered = !normalizedQuery
      ? jobs
      : jobs.filter((job) => {
          const haystack = [
            job.title,
            job.description,
            job.category,
            ...(job.skills ?? []),
          ]
            .join(' ')
            .toLowerCase()
          return haystack.includes(normalizedQuery)
        })
    return filtered.slice(0, variant === 'compact' ? 4 : 5)
  }, [jobs, normalizedQuery, variant])

  const budgetLabel = (job: OpenJob) =>
    job.jobType === 'hourly' ? `$${job.hourlyRate}/hr est.` : `$${job.budget}`

  const whenLabel = (job: OpenJob) => {
    if (job.deadline) {
      const d = new Date(job.deadline)
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString()
    }
    if (job.duration?.trim()) return job.duration.trim()
    return 'Flexible'
  }

  const py = variant === 'compact' ? 'py-10' : 'py-16'

  return (
    <section className={`${py} px-4 bg-background`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className={variant === 'compact' ? 'text-3xl font-bold mb-3' : 'text-4xl font-bold mb-4'}>
            Latest open jobs
          </h2>
          <p className="text-muted-foreground text-lg">
            Real job posts from verified clients. Freelancers apply from the job board in their dashboard.
          </p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading…</p>
          ) : visibleJobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {normalizedQuery
                ? `No open jobs match "${query.trim()}".`
                : 'No open jobs yet. Post one from the client dashboard.'}
            </p>
          ) : (
            visibleJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-lg hover:border-primary transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{job.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{job.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {(job.skills?.length ? job.skills : [job.category]).map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-secondary text-white text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span>{budgetLabel(job)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{whenLabel(job)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <span>{job.category}</span>
                      </div>
                      <span>{job.proposalsCount} proposals</span>
                    </div>
                  </div>

                  <Link
                    href={applyHref(
                      job.id,
                      isAuthenticated,
                      Boolean(isAuthenticated && user?.role === 'freelancer'),
                    )}
                  >
                    <Button className="bg-teal-600 hover:bg-teal-700 whitespace-nowrap cursor-pointer">Apply</Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center mt-8">
          <Link
            href={
              isAuthenticated
                ? '/dashboard/freelancer/find-jobs'
                : `/login?redirect=${encodeURIComponent('/dashboard/freelancer/find-jobs')}`
            }
          >
            <Button variant="outline" size="lg" className="cursor-pointer">
              Browse all open jobs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
