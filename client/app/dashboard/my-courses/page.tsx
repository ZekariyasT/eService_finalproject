'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiFetch, downloadDigitalProductFullCourse } from '@/lib/api'
import { BookOpen, Download, ExternalLink, Loader2, GraduationCap } from 'lucide-react'
import Image from 'next/image'

type LibraryItem = {
  purchaseId: string
  productId: string
  title: string
  category: string
  amount: number
  purchasedAt: string
  promoDescription: string
  fullDescription: string
  deliverableUrl: string | null
  fullCourseHosted: boolean
  promotionSampleUrl: string | null
  imageUrl: string | null
}

export default function MyCoursesPage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ purchases: LibraryItem[] }>('/orders/products')
      setItems(res.purchases)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load purchases')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex items-start gap-3 mb-8">
        <div className="p-3 rounded-xl bg-teal-600/10 text-teal-700">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My courses & purchases</h1>
          <p className="text-muted-foreground mt-1">
            Everything you have bought lives here. Download the full course file from our servers or open an external link from the seller.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your library…
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      {!loading && !items.length && !error && (
        <Card className="p-10 text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">No purchases yet</p>
          <p className="text-sm mt-1 mb-4">Browse digital products on the Projects page and complete a purchase to unlock content here.</p>
          <Button asChild variant="outline">
            <a href="/products">Browse products</a>
          </Button>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.purchaseId} className="overflow-hidden flex flex-col">
            <div className="relative h-40 w-full bg-muted">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <BookOpen className="w-10 h-10 opacity-30" />
                </div>
              )}
              <Badge className="absolute top-3 left-3 bg-black/60 text-white border-0">{item.category}</Badge>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h2 className="font-semibold text-lg leading-snug mb-1">{item.title}</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Purchased {new Date(item.purchasedAt).toLocaleString()} · Br {item.amount.toFixed(2)}
              </p>
              {item.fullDescription ? (
                <div className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap border-l-2 border-teal-600/40 pl-3">
                  {item.fullDescription}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4 italic">
                  The creator has not added extended instructions yet. Use the access link below if provided.
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                {item.fullCourseHosted ? (
                  <Button
                    className="bg-teal-600 hover:bg-teal-700"
                    disabled={downloadingId === item.productId}
                    onClick={() => {
                      setDownloadingId(item.productId)
                      void downloadDigitalProductFullCourse(item.productId)
                        .catch((e) => window.alert(e instanceof Error ? e.message : 'Download failed'))
                        .finally(() => setDownloadingId(null))
                    }}
                  >
                    {downloadingId === item.productId ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download full course
                  </Button>
                ) : item.deliverableUrl ? (
                  <Button asChild className="bg-teal-600 hover:bg-teal-700">
                    <a href={item.deliverableUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open external course link
                    </a>
                  </Button>
                ) : (
                  <Button disabled variant="secondary">
                    No full course file yet
                  </Button>
                )}
                {item.promotionSampleUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={item.promotionSampleUrl} target="_blank" rel="noopener noreferrer">
                      Preview sample
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
