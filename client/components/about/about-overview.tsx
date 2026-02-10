'use client'

import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'

const HIGHLIGHTS = [
  'Hire vetted-style talent, sell digital products, and run projects in one place — with messaging and clear handoffs built in.',
  'Profiles, reviews, and job history are designed to build trust; we do not surface headline “stats” until they are backed by real platform data.',
  'Whether you are a business looking to scale, a freelancer building a career, or a creator selling products, the same secure workflow applies.',
]

export function AboutOverview() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,120,111,0.14),transparent)]"
      />
      <div className="container relative z-[1] mx-auto max-w-5xl px-4">
        <div className="rounded-3xl border border-border/70 bg-card/95 p-8 shadow-[0_20px_60px_-24px_rgba(0,120,111,0.18)] backdrop-blur-sm md:p-10 lg:p-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
            {/* Image first on small screens so it is always visible; explicit size avoids empty box with next/image fill */}
            <div className="order-1 flex justify-center lg:order-2 lg:shrink-0 lg:pt-1">
              <figure className="group relative w-full max-w-[300px] sm:max-w-[320px]">
                <div
                  aria-hidden
                  className="absolute -inset-1 -z-10 rounded-[1.35rem] bg-gradient-to-br from-[#00786F]/35 via-[#34bdb3]/20 to-transparent opacity-90 blur-md"
                />
                <div className="overflow-hidden rounded-2xl border-2 border-[#00786F]/15 bg-muted/20 shadow-md ring-1 ring-black/5">
                  <Image
                    src="/about1.png"
                    alt="Elite Ethiopia — connecting freelancers, businesses and digital creators"
                    width={640}
                    height={640}
                    className="h-auto w-full object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 320px"
                  />
                </div>
              </figure>
            </div>

            <div className="order-2 flex min-w-0 flex-1 flex-col space-y-6 text-center lg:order-1 lg:text-left">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700/90">Our story</p>
                <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.5rem] lg:leading-tight">
                  About Elite Ethiopia
                </h2>
                <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-teal-500/70 to-transparent lg:mx-0 lg:w-20" />
              </div>

              <div className="space-y-5 text-left">
                <div className="rounded-2xl border border-teal-900/5 bg-teal-50/50 px-5 py-5 md:px-6 md:py-6">
                  <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                    Elite Ethiopia is a marketplace built for Africa and the world: we connect{' '}
                    <span className="font-medium text-foreground/90">freelancers</span>,{' '}
                    <span className="font-medium text-foreground/90">businesses</span>, and{' '}
                    <span className="font-medium text-foreground/90">digital creators</span> on one platform. Our focus is
                    secure workflows, transparent profiles, and tools that help people grow — without publishing noisy
                    headline metrics until they are verified from live platform data.
                  </p>
                </div>

                <p className="text-base leading-relaxed text-muted-foreground md:text-[1.05rem]">
                  We started from a simple idea: talent and opportunity should meet without friction. That means clear job
                  postings, structured proposals, messaging that stays on-platform, and payments tied to delivery — so both
                  sides know what “done” looks like.
                </p>

                <ul className="grid gap-3 pt-1">
                  {HIGHLIGHTS.map((line) => (
                    <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <p className="rounded-xl border border-dashed border-teal-700/15 bg-teal-950/[0.03] px-4 py-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  Elite Ethiopia is evolving with our community: we ship improvements based on real usage, listen to
                  freelancers and clients, and aim to keep fees and rules understandable — so the platform stays fair as it
                  grows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
