'use client'

import { Quote, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Time between auto-advances (ms). */
const AUTO_SCROLL_MS = 4200

type Item = {
  quote: string
  name: string
  role: string
  org: string
}

const TESTIMONIALS: Item[] = [
  {
    quote:
      'We hired a designer through Elite Ethiopia for our retail launch. Proposals came in fast, the contract flow was clear, and the final deliverables exceeded what we expected.',
    name: 'Selamawit Bekele',
    role: 'Operations lead',
    org: 'Habesha Logistics PLC',
  },
  {
    quote:
      'As a freelancer, I finally have one place for jobs, wallet payouts, and client messaging. The open job board stays active with real briefs—not recycled template posts.',
    name: 'Mahlet A.',
    role: 'Copywriter & translator',
    org: 'Independent',
  },
  {
    quote:
      'Our studio sells UI kits and course packs here. Sales and downloads are tracked cleanly, and buyers get instant access. Support for digital products is exactly what we needed.',
    name: 'Mihret Studio',
    role: 'Founder',
    org: 'Mihret Design Studio',
  },
  {
    quote:
      'We posted a fixed-scope build for an internal dashboard. Milestones, reviews, and escrow-style payments made it easy to trust a remote team we had never met in person.',
    name: 'Robel Hailu',
    role: 'Founder',
    org: 'Birr Pay Technologies',
  },
  {
    quote:
      'Video editing gigs used to live in scattered chats. Now contracts, revisions, and delivery links stay in one thread. My clients approve milestones without confusion.',
    name: 'Yonas G.',
    role: 'Video editor',
    org: 'Independent',
  },
  {
    quote:
      'Elite Ethiopia connected us with developers who understood our stack. From job post to signed contract took days, not weeks of back-and-forth on other platforms.',
    name: 'Demo Client',
    role: 'Procurement',
    org: 'Demo Trade PLC',
  },
]

function Stars() {
  return (
    <div className="flex gap-0.5 text-amber-500" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-current stroke-amber-600" />
      ))}
    </div>
  )
}

type Props = {
  /** Slightly tighter heading on inner pages (e.g. About). */
  variant?: 'home' | 'about'
}

export function Testimonials({ variant = 'home' }: Props) {
  const titleClass = variant === 'about' ? 'text-3xl md:text-4xl font-bold mb-3' : 'text-4xl font-bold mb-4'

  const scrollerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)
  const pausedRef = useRef(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduceMotion) return

    let intervalId: ReturnType<typeof setInterval> | undefined

    const advance = () => {
      const scroller = scrollerRef.current
      const track = trackRef.current
      if (!scroller || !track || pausedRef.current) return
      const figures = track.querySelectorAll<HTMLElement>(':scope > figure')
      if (figures.length === 0) return

      const n = figures.length
      const next = (indexRef.current + 1) % n

      if (next === 0) {
        scroller.scrollTo({ left: 0, behavior: 'instant' })
      } else {
        const card = figures[next]
        if (card) {
          const left = card.offsetLeft
          scroller.scrollTo({ left, behavior: 'smooth' })
        }
      }
      indexRef.current = next
    }

    const startDelay = window.setTimeout(() => {
      intervalId = window.setInterval(advance, AUTO_SCROLL_MS)
    }, 800)

    return () => {
      window.clearTimeout(startDelay)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [reduceMotion])

  useEffect(() => {
    if (reduceMotion) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const onScroll = () => {
      const track = trackRef.current
      if (!track) return
      const figures = track.querySelectorAll<HTMLElement>(':scope > figure')
      if (figures.length === 0) return
      const x = scroller.scrollLeft + scroller.clientWidth / 3
      let acc = 0
      for (let i = 0; i < figures.length; i++) {
        const el = figures[i]!
        const w = el.offsetWidth + 16
        if (x < acc + w) {
          indexRef.current = i
          return
        }
        acc += w
      }
      indexRef.current = Math.max(0, figures.length - 1)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [reduceMotion])

  return (
    <section
      className="py-10 md:py-12 px-0 bg-muted/30 border-y border-border"
      aria-label="Testimonials"
      onPointerEnter={() => {
        pausedRef.current = true
      }}
      onPointerLeave={() => {
        pausedRef.current = false
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className={titleClass}>What our community says</h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Clients, freelancers, and sellers use Elite Ethiopia to run real projects—from first brief to final payment.
          </p>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-3 pt-1 [scrollbar-width:thin] snap-x snap-mandatory"
        >
          <div ref={trackRef} className="flex w-max gap-4 pr-2 md:pr-6">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name + t.org}
                className="snap-start shrink-0 w-[min(22rem,calc(100vw-2rem))] max-w-sm rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <Quote className="w-8 h-8 text-teal-600/80 shrink-0" aria-hidden />
                <Stars />
                <blockquote className="text-sm leading-relaxed text-foreground">{t.quote}</blockquote>
                <figcaption className="pt-2 mt-auto border-t border-border">
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}
                    {t.org ? ` · ${t.org}` : ''}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
