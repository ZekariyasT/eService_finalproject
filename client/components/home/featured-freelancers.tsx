'use client'

import { Star, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type ServiceItem = {
  id: string
  freelancerId: string
  freelancerName: string
  freelancerRating: number
  freelancerBio: string
  freelancerLocation: string
  title: string
  tags: string[]
  priceMin: number
  priceMax: number
}

export function FeaturedFreelancers() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ services: ServiceItem[] }>('/services')
      .then((res) => {
        if (!cancelled) setServices(res.services)
      })
      .catch(() => {
        if (!cancelled) setServices([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const freelancers = useMemo(() => {
    const seen = new Set<string>()
    const list: ServiceItem[] = []
    for (const s of services) {
      if (seen.has(s.freelancerId)) continue
      seen.add(s.freelancerId)
      list.push(s)
      if (list.length >= 6) break
    }
    return list
  }, [services])

  return (
    <section className="py-16 px-4 bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Top Freelancers</h2>
          <p className="text-muted-foreground text-lg">Professionals with active service listings</p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading…</p>
        ) : freelancers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No freelancer listings yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freelancers.map((row) => (
              <div
                key={row.freelancerId}
                className="rounded-lg border border-border bg-background p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold mb-4">
                  {row.freelancerName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>

                <h3 className="font-semibold text-lg mb-1">{row.freelancerName}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{row.title}</p>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(row.freelancerRating) ? 'fill-accent text-accent' : 'text-border'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{row.freelancerRating}</span>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{row.freelancerBio}</p>

                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  {row.freelancerLocation}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(row.tags ?? []).slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-full bg-secondary text-white text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    ${row.priceMin} – ${row.priceMax}
                  </span>
                  <Link href="/services">
                    <Button variant="outline" size="sm" className="cursor-pointer">
                      View services
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
