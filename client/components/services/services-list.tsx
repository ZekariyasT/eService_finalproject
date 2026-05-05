'use client'

import { Code, Palette, MessageSquare, TrendingUp, Video, BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

const iconFor = (category: string) => {
  const c = category.toLowerCase()
  if (c.includes('design') || c.includes('brand')) return <Palette className="w-8 h-8" />
  if (c.includes('market') || c.includes('seo')) return <TrendingUp className="w-8 h-8" />
  if (c.includes('content') || c.includes('writ')) return <MessageSquare className="w-8 h-8" />
  if (c.includes('video')) return <Video className="w-8 h-8" />
  if (c.includes('consult') || c.includes('course')) return <BookOpen className="w-8 h-8" />
  return <Code className="w-8 h-8" />
}

type ServiceItem = {
  id: string
  title: string
  description: string
  category: string
}

export function ServicesList() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ services: ServiceItem[] }>('/services')
      .then((res) => {
        if (!cancelled) setServices(res.services.slice(0, 6))
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

  return (
    <section className="py-20 md:py-32 container mx-auto px-4">
      <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">Popular Services</h2>
      <p className="text-lg text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
        Explore services listed by freelancers on Elite Ethiopia
      </p>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading…</p>
      ) : services.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No services published yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              className="p-8 border border-border hover:border-primary transition-all hover:shadow-lg group cursor-pointer"
            >
              <div className="text-primary mb-4 group-hover:scale-110 transition-transform">{iconFor(service.category)}</div>
              <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-muted-foreground line-clamp-3">{service.description}</p>
              <p className="text-xs text-muted-foreground mt-3">{service.category}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
