'use client'

import { Zap, BookOpen, Layout, Image } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type ProductRow = {
  category: string
}

const iconFor = (category: string) => {
  const c = category.toLowerCase()
  if (c.includes('course') || c.includes('learn')) return <BookOpen className="w-12 h-12" />
  if (c.includes('design') || c.includes('asset') || c.includes('graphic')) return <Image className="w-12 h-12" />
  if (c.includes('software') || c.includes('tool')) return <Zap className="w-12 h-12" />
  return <Layout className="w-12 h-12" />
}

export function ProductsCategories() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ products: ProductRow[] }>('/products')
      .then((res) => {
        if (!cancelled) setProducts(res.products)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) {
      const cat = p.category?.trim() || 'Uncategorized'
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([title, count]) => ({ title, count }))
  }, [products])

  return (
    <section className="py-20 md:py-32 container mx-auto px-4">
      <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">Browse by Category</h2>
      <p className="text-lg text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
        Digital products grouped by how sellers categorized them
      </p>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No products listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map(({ title, count }) => (
            <Card
              key={title}
              className="p-8 text-center border border-border hover:border-primary transition-all hover:shadow-lg group cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5"
            >
              <div className="text-primary mb-4 flex justify-center group-hover:scale-110 transition-transform">{iconFor(title)}</div>
              <h3 className="text-xl font-semibold mb-1">{title}</h3>
              <p className="text-2xl font-bold text-primary mb-3">{count}</p>
              <p className="text-sm text-muted-foreground">Active listings</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
