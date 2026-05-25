'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, ShoppingCart, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'

type ApiProduct = {
  id: string
  creatorId: string
  creatorName: string
  title: string
  description: string
  promotionSampleUrl?: string | null
  category: string
  price: number
  imageUrl: string | null
  images: string[]
  downloadsCount: number
  rating: number
  salesCount: number
}

function youtubeEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url.trim())
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const m = u.pathname.match(/\/embed\/([^/]+)/)
      if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}`
    }
  } catch {
    return null
  }
  return null
}

type ProductDetail = ApiProduct & { displayImages: string[] }

export function AvailableProducts() {
  const { addToCart, isInCart } = useCart()
  const { isAuthenticated, user, isInitializing } = useAuth()
  const [purchasedIds, setPurchasedIds] = useState<string[]>([])
  const [justAdded, setJustAdded] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refreshPurchases = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await apiFetch<{ purchases: { productId: string }[] }>('/orders/products')
      setPurchasedIds(res.purchases.map((p) => p.productId))
    } catch {
      /* ignore */
    }
  }, [isAuthenticated])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiFetch<{ products: ApiProduct[] }>('/products')
        if (!cancelled) setProducts(res.products)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load products')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void refreshPurchases()
  }, [refreshPurchases, user?.id])

  const openProduct = (p: ApiProduct) => {
    const fallback = p.imageUrl || 'https://images.unsplash.com/photo-1541462608943-7cf50ea1c313?w=600&h=600&fit=crop'
    const displayImages = p.images?.length ? p.images : [fallback]
    setSelectedProduct({ ...p, displayImages })
    setCurrentImageIndex(0)
  }

  const handleAddToCart = (product: ApiProduct, img: string) => {
    addToCart({
      id: product.id,
      name: product.title,
      price: product.price,
      image: img,
      quantity: 1,
    })
    setJustAdded((prev) => [...prev, product.id])
    setTimeout(() => setJustAdded((prev) => prev.filter((id) => id !== product.id)), 2000)
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Featured Digital Products</h2>
          <p className="text-xl text-muted-foreground">High-quality templates, courses, and assets from top creators</p>
        </div>

        {loading && <p className="text-center text-muted-foreground">Loading products…</p>}
        {loadError && (
          <p className="text-center text-destructive text-sm mb-6">
            {loadError} — start the API server and MySQL, or check NEXT_PUBLIC_API_URL.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const img = product.imageUrl || 'https://images.unsplash.com/photo-1541462608943-7cf50ea1c313?w=400&h=300&fit=crop'
            return (
              <div key={product.id} className="border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 w-full">
                  <Image src={img} alt={product.title} fill className="object-cover" />
                </div>
                <div className="p-6">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">{product.category}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{product.creatorName}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({product.salesCount} sold)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-primary">Br {product.price}</span>
                    <Button size="sm" variant="outline" onClick={() => openProduct(product)}>
                      View Product
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {purchasedIds.includes(product.id) ? (
                      <Button size="sm" disabled className="bg-teal-600 flex-1">
                        <Check className="w-4 h-4 mr-1" />
                        Purchased
                      </Button>
                    ) : isInCart(product.id) ? (
                      <Button size="sm" variant="outline" disabled className="flex-1">
                        <Check className="w-4 h-4 mr-1" />
                        In Cart
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 flex-1"
                        disabled={isInitializing}
                        onClick={() => handleAddToCart(product, img)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {isInitializing ? '…' : justAdded.includes(product.id) ? 'Added!' : 'Add to Cart'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedProduct.title}</h2>
              <button type="button" onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="relative h-96 w-full rounded-xl overflow-hidden bg-gray-100 mb-4">
                  <Image
                    src={selectedProduct.displayImages[currentImageIndex] ?? selectedProduct.displayImages[0]}
                    alt={`${selectedProduct.title} - Image ${currentImageIndex + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex gap-2 overflow-x-auto flex-1">
                    {selectedProduct.displayImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentImageIndex(idx)}
                        aria-label={`View image ${idx + 1}`}
                        className={`relative h-16 w-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                          idx === currentImageIndex ? 'border-teal-600' : 'border-transparent'
                        }`}
                      >
                        <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentImageIndex(Math.min(selectedProduct.displayImages.length - 1, currentImageIndex + 1))
                    }
                    disabled={currentImageIndex === selectedProduct.displayImages.length - 1}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-2">
                  Image {currentImageIndex + 1} of {selectedProduct.displayImages.length}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">{selectedProduct.category}</span>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Creator</p>
                  <p className="font-semibold">{selectedProduct.creatorName}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Promotion</p>
                  <p className="text-muted-foreground text-sm">{selectedProduct.description}</p>
                </div>

                {selectedProduct.promotionSampleUrl ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                    <p className="text-sm font-semibold">Free preview (sample)</p>
                    {youtubeEmbedSrc(selectedProduct.promotionSampleUrl) ? (
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                        <iframe
                          title="Preview"
                          src={youtubeEmbedSrc(selectedProduct.promotionSampleUrl)!}
                          className="absolute inset-0 h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <a
                        href={selectedProduct.promotionSampleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-teal-600 font-medium underline"
                      >
                        Open promotional sample link
                      </a>
                    )}
                  </div>
                ) : null}

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{selectedProduct.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({selectedProduct.salesCount} sold)</span>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <p className="text-4xl font-bold text-primary mb-4">Br {selectedProduct.price}</p>
                  <div className="flex gap-3">
                    {purchasedIds.includes(selectedProduct.id) ? (
                      <Button disabled className="flex-1 bg-teal-600 h-12">
                        <Check className="w-5 h-5 mr-2" />
                        Already Purchased
                      </Button>
                    ) : isInCart(selectedProduct.id) ? (
                      <Link href="/dashboard/client/cart" className="flex-1">
                        <Button variant="outline" className="w-full h-12 text-lg">
                          <Check className="w-5 h-5 mr-2" />
                          In Cart — Go to Checkout
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        type="button"
                        disabled={isInitializing}
                        onClick={() => handleAddToCart(selectedProduct, selectedProduct.displayImages[0] ?? '')}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 h-12 text-lg"
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {isInitializing
                          ? '…'
                          : justAdded.includes(selectedProduct.id)
                            ? 'Added to Cart!'
                            : 'Add to Cart'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
