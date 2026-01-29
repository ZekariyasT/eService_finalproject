'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Search, ShieldCheck, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/types'

type FlowStep = {
  key: string
  title: string
  short: string
  icon: typeof FileText
  imageSrc: string
  ctaLabel: string
  ctaHref: string
  details: string[]
}

type FlowBlock = {
  label: string
  headline: string
  subhead: string
  steps: FlowStep[]
}

function adaptHiringFlow(role: UserRole | undefined, flow: FlowBlock): FlowBlock {
  if (role !== 'freelancer') return flow
  return {
    ...flow,
    steps: flow.steps.map((step) => {
      if (step.key !== 'hire-1') return step
      return {
        ...step,
        title: 'Find projects on your dashboard',
        short:
          'Posting jobs is for client accounts. As a freelancer, open Find Jobs to browse roles and send proposals.',
        ctaLabel: 'Search jobs',
        ctaHref: '/dashboard/freelancer/find-jobs',
        details: [
          'Use filters for skills, budget, and timeline.',
          'Read each brief before you propose.',
          'Need to hire someone yourself? Use a separate client account.',
        ],
      }
    }),
  }
}

function adaptWorkFlow(role: UserRole | undefined, flow: FlowBlock): FlowBlock {
  if (role !== 'client') return flow
  return {
    label: 'For your jobs',
    headline: 'Manage hiring from your client dashboard',
    subhead: 'Post roles, review applicants on your jobs, and pay when work is approved.',
    steps: flow.steps.map((step) => {
      if (step.key === 'work-1') {
        return {
          ...step,
          title: 'Post work you need done',
          short: 'Create a job from your dashboard so freelancers can discover it and apply.',
          ctaLabel: 'Post a job',
          ctaHref: '/dashboard/client/post-job',
          details: [
            'Add a clear title, scope, budget, and deadline.',
            'List required skills so the right people apply.',
            'Publish when you are ready to collect proposals.',
          ],
        }
      }
      if (step.key === 'work-2') {
        return {
          ...step,
          title: 'See applicants on your jobs',
          short: 'Open My Jobs to review proposals, message finalists, and choose who to hire.',
          ctaLabel: 'Open My Jobs',
          ctaHref: '/dashboard/client/my-jobs',
          details: [
            'Compare proposals for each posting in one place.',
            'Clarify scope in chat before you award the job.',
            'Hire when you are confident in the fit.',
          ],
        }
      }
      if (step.key === 'work-3') {
        return {
          ...step,
          title: 'Approve work & pay',
          short: 'Track milestones and release payment when deliverables meet your bar.',
          ctaLabel: 'Payments',
          ctaHref: '/dashboard/client/payments',
          details: [
            'Approve deliverables before releasing funds.',
            'Split larger work into milestones when it helps.',
            'Keep communication in one thread for clarity.',
          ],
        }
      }
      return step
    }),
  }
}

export function HowItWorks() {
  const { user } = useAuth()
  const role = user?.role
  const [tab, setTab] = React.useState<'hiring' | 'work'>('hiring')

  React.useEffect(() => {
    if (role === 'freelancer') setTab('work')
    else setTab('hiring')
  }, [role])

  const flows = React.useMemo(() => {
    const hiring: FlowBlock = {
      label: 'For hiring',
      headline: 'Hire confidently in a few steps',
      subhead: 'Post a job, compare proposals, and pay only when work is approved.',
      steps: [
        {
          key: 'hire-1',
          title: 'Create a job post',
          short: 'Describe your project, budget, timeline, and required skills.',
          icon: FileText,
          imageSrc: '/services-hero-image.jpg',
          ctaLabel: 'Create a job',
          ctaHref: '/dashboard/client/post-job',
          details: [
            'Add a clear title and scope (what you want delivered).',
            'Set budget and deadline so freelancers can estimate accurately.',
            'List must-have skills to filter the right talent.',
          ],
        },
        {
          key: 'hire-2',
          title: 'Review proposals & hire',
          short: 'Compare experience, past work, and pricing — then interview and hire.',
          icon: Search,
          imageSrc: '/about-hero-image.jpg',
          ctaLabel: 'Explore experts',
          ctaHref: '/services',
          details: [
            'Shortlist strong proposals with relevant portfolio examples.',
            'Ask questions in chat to confirm timeline and approach.',
            'Agree on milestones before starting to keep progress clear.',
          ],
        },
        {
          key: 'hire-3',
          title: 'Pay when work is done',
          short: 'Approve the delivery, then release payment securely.',
          icon: ShieldCheck,
          imageSrc: '/products-hero-image.jpg',
          ctaLabel: 'View pricing',
          ctaHref: '/products',
          details: [
            'Use milestones to pay as each part is completed.',
            'Review deliverables and request changes if needed.',
            'Release payment only after approval for peace of mind.',
          ],
        },
      ],
    }

    const work: FlowBlock = {
      label: 'For finding work',
      headline: 'Start freelancing and win projects',
      subhead: 'Build your profile, send proposals, and get paid as you deliver.',
      steps: [
        {
          key: 'work-1',
          title: 'Create your freelancer profile',
          short: 'Show your skills, portfolio, and rates so clients can trust you.',
          icon: UserPlus,
          imageSrc: '/contact-hero-image.jpg',
          ctaLabel: 'Create your profile',
          ctaHref: '/signup/freelancer',
          details: [
            'Write a strong overview focused on outcomes you deliver.',
            'Add 2–5 portfolio items that prove your expertise.',
            'Set a clear hourly rate or typical package pricing.',
          ],
        },
        {
          key: 'work-2',
          title: 'Submit proposals for work',
          short: 'Apply to jobs that match your skills and tailor your pitch.',
          icon: BriefcaseBusiness,
          imageSrc: '/contact-hero-image.jpg',
          ctaLabel: 'Search jobs',
          ctaHref: '/dashboard/freelancer/find-jobs',
          details: [
            'Start with a short, personalized intro (avoid copy/paste).',
            'Explain your plan in 3–5 bullet points and provide timelines.',
            'Include a relevant portfolio link and ask 1–2 clarifying questions.',
          ],
        },
        {
          key: 'work-3',
          title: 'Deliver and get paid',
          short: 'Communicate clearly, deliver quality, and get paid securely.',
          icon: CheckCircle2,
          imageSrc: '/hero-bg.jpg',
          ctaLabel: 'Learn more',
          ctaHref: '/about/how-to-find-job',
          details: [
            'Confirm requirements before starting to avoid scope creep.',
            'Share progress updates and deliver on milestones.',
            'Request reviews after successful delivery to build your reputation.',
          ],
        },
      ],
    }

    return {
      hiring: adaptHiringFlow(role, hiring),
      work: adaptWorkFlow(role, work),
    }
  }, [role])

  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-6xl px-4">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'hiring' | 'work')}
          className="gap-6"
        >
          <div className=" flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {role === 'client' ? (
                  <>
                    You&apos;re signed in as a <span className="font-medium text-foreground">client</span> — use the
                    hiring flow and your dashboard tabs to post jobs and review applicants (not the freelancer signup path).
                  </>
                ) : role === 'freelancer' ? (
                  <>
                    You&apos;re signed in as a <span className="font-medium text-foreground">freelancer</span> — use Find
                    Jobs and proposals from your dashboard; only clients post job listings.
                  </>
                ) : (
                  <>
                    Learn how to <span className="font-medium text-foreground">hire a freelancer</span> or{' '}
                    <span className="font-medium text-foreground">become a freelancer</span> on the platform.
                  </>
                )}
              </p>
            </div>
            <TabsList className="w-fit rounded-full">
              <TabsTrigger value="hiring" className="rounded-full px-4 cursor-pointer">
                {flows.hiring.label}
              </TabsTrigger>
              <TabsTrigger value="work" className="rounded-full px-4 cursor-pointer">
                {flows.work.label}
              </TabsTrigger>
            </TabsList>
          </div>

          {(['hiring', 'work'] as const).map((flowKey) => {
            const flow = flows[flowKey]
            return (
              <TabsContent key={flowKey} value={flowKey} className="mt-2">
                <div className="mb-8">
                  <h3 className="text-xl font-semibold">{flow.headline}</h3>
                  <p className="mt-1 text-muted-foreground">{flow.subhead}</p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {flow.steps.map((step, idx) => {
                    const Icon = step.icon
                    return (
                      <div key={step.key} className="relative">
                        <Dialog>
                          <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="relative h-44 w-full">
                              <Image
                                src={step.imageSrc}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                priority={flowKey === 'hiring' && idx === 0}
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-background/70 via-background/10 to-transparent" />

                              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border backdrop-blur">
                                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                                Step {idx + 1}
                              </div>

                            </div>

                            <div className="p-6">
                              <h4 className="text-lg font-semibold leading-snug">{step.title}</h4>
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.short}</p>
                              <div className="mt-5 flex items-center justify-between gap-3">
                                <Link href={step.ctaHref}>
                                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 cursor-pointer">
                                    {step.ctaLabel}
                                  </Button>
                                </Link>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="cursor-pointer text-muted-foreground hover:bg-transparent hover:text-muted-foreground hover:gap-2"
                                  >
                                    Read full steps <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                              </div>
                            </div>
                          </div>

                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{step.title}</DialogTitle>
                              <DialogDescription>{step.short}</DialogDescription>
                            </DialogHeader>

                            <div className="mt-2 grid gap-4">
                              <div className="rounded-lg border border-border bg-muted/30 p-4">
                                <p className="text-sm font-medium">What to do</p>
                                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                  {step.details.map((d) => (
                                    <li key={d} className="flex gap-2">
                                      <span className="mt-0.5 text-primary">
                                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                      </span>
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Link href={step.ctaHref}>
                                  <Button className="w-full sm:w-auto cursor-pointer">{step.ctaLabel}</Button>
                                </Link>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </section>
  )
}
