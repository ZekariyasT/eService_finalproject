'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Package, Pencil, Trash2, Eye, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch, uploadDigitalProductFullCourse } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'

type SellerProduct = {
  id: string
  title: string
  description: string
  fullDescription: string
  promotionSampleUrl: string | null
  category: string
  price: number
  imageUrl: string | null
  images: string[]
  filePath: string | null
  status: string
  salesCount: number
  createdAt: string
}

const FULL_COURSE_MAX_BYTES = 150 * 1024 * 1024
/** Mirrors backend `digital-product-upload.middleware.ts` allowlist. */
const FULL_COURSE_EXT =
  /\.(zip|rar|7z|tar|gz|pdf|mp4|webm|mkv|mov|avi|doc|docx|ppt|pptx|xls|xlsx|txt|csv|png|jpg|jpeg|gif|webp|svg|epub|json|bmp|tif|tiff)$/i

function validateFullCourseFile(file: File): string | null {
  if (!file.size) return 'The selected file is empty. Choose a different file.'
  if (file.size > FULL_COURSE_MAX_BYTES)
    return 'That file is larger than 150 MB. Compress it or use an external link instead.'
  if (!FULL_COURSE_EXT.test(file.name))
    return 'That file type is not accepted. Use zip, pdf, video, Office documents, or images. If your file has no extension, rename it (e.g. add .pdf).'
  return null
}

const emptyForm = {
  title: '',
  description: '',
  fullDescription: '',
  promotionSampleUrl: '',
  category: '',
  price: '',
  imageUrl: '',
  fullFilePath: '',
  status: 'active' as 'active' | 'paused',
}

export default function SellerProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<SellerProduct | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [fullCourseFile, setFullCourseFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    if (user?.role !== 'seller') return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await apiFetch<{ products: SellerProduct[] }>('/products/mine')
      setProducts(res.products)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    void load()
  }, [load])

  const saveProduct = async () => {
    setMessage('')
    if (!form.title.trim() || !form.description.trim() || !form.category.trim() || !form.price) {
      setMessage('Title, promotion description, category, and price are required.')
      return
    }
    const price = Number(form.price)
    if (Number.isNaN(price) || price < 0) {
      setMessage('Enter a valid price.')
      return
    }

    if (fullCourseFile) {
      const uploadHint = validateFullCourseFile(fullCourseFile)
      if (uploadHint) {
        setMessage(uploadHint)
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        fullDescription: form.fullDescription.trim(),
        promotionSampleUrl: form.promotionSampleUrl.trim() || null,
        category: form.category.trim(),
        price,
        imageUrl: form.imageUrl.trim() || null,
        fullFilePath: fullCourseFile ? null : form.fullFilePath.trim() || null,
        status: form.status,
      }
      let productId = editingId
      if (editingId) {
        await apiFetch(`/products/${editingId}`, { method: 'PUT', json: payload })
        productId = editingId
        setMessage('Product updated.')
      } else {
        const created = await apiFetch<{ product: { id: string } }>('/products', { method: 'POST', json: payload })
        productId = created.product.id
        setMessage('Product published.')
      }
      if (fullCourseFile && productId) {
        await uploadDigitalProductFullCourse(productId, fullCourseFile)
        setMessage((m) => (m ? `${m} Full course file uploaded.` : 'Full course file uploaded.'))
      }
      setEditingId(null)
      setShowForm(false)
      setForm(emptyForm)
      setFullCourseFile(null)
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const editProduct = (product: SellerProduct) => {
    setEditingId(product.id)
    setShowForm(true)
    setMessage('')
    setFullCourseFile(null)
    setForm({
      title: product.title,
      description: product.description,
      fullDescription: product.fullDescription || '',
      promotionSampleUrl: product.promotionSampleUrl || '',
      category: product.category,
      price: String(product.price),
      imageUrl: product.imageUrl || '',
      fullFilePath: product.filePath && /^https?:\/\//i.test(product.filePath) ? product.filePath : '',
      status: product.status === 'paused' ? 'paused' : 'active',
    })
  }

  const removeProduct = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' })
      setMessage('Product removed.')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const openAddForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFullCourseFile(null)
    setShowForm(true)
    setMessage('')
  }

  if (user?.role !== 'seller') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Products</h1>
        <p className="text-muted-foreground">Sign in with a seller account to manage digital products.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Product management</h1>
          <p className="text-muted-foreground">
            Promotion text and samples are public. The full course link and extended notes unlock only after purchase.
          </p>
        </div>
        <Button onClick={openAddForm}>Add product</Button>
      </div>

      {message && <p className="text-sm text-muted-foreground mb-4">{message}</p>}
      {loadError && <p className="text-sm text-destructive mb-4">{loadError}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading products…
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[88px_1.3fr_1fr_100px_100px_120px_170px] gap-4 px-4 py-3 bg-secondary text-sm font-medium max-md:hidden">
            <span>Image</span>
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Sales</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
              No products yet. Create one with real deliverable links so buyers get access in My courses.
            </div>
          ) : (
            products.map((product) => {
              const img =
                product.imageUrl ||
                'https://images.unsplash.com/photo-1541462608943-7cf50ea1c313?w=200&h=200&fit=crop'
              return (
                <div
                  key={product.id}
                  className="grid grid-cols-1 md:grid-cols-[88px_1.3fr_1fr_100px_100px_120px_170px] gap-4 px-4 py-4 border-t border-border items-center"
                >
                  <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-secondary flex items-center justify-center">
                    <Image src={img} alt="" width={64} height={64} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="font-medium">{product.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                  </div>
                  <span>{product.category}</span>
                  <span>Br {product.price}</span>
                  <span>{product.salesCount}</span>
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>{product.status}</Badge>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => setViewing(product)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => editProduct(product)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => void removeProduct(product.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-semibold text-xl">{editingId ? 'Edit product' : 'Add product'}</h2>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input type="number" placeholder="Price (Br)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input
                placeholder="Cover image URL"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
              <select
                className="px-3 py-2 border border-input rounded-lg bg-background md:col-span-2"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'paused' })}
              >
                <option value="active">Visible on marketplace</option>
                <option value="paused">Paused (hidden)</option>
              </select>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Promotion description (everyone sees this)</label>
              <Textarea
                placeholder="Sell the product in a short teaser — highlights, outcomes, who it is for."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Promotion sample URL (optional)</label>
              <p className="text-xs text-muted-foreground">Link to a trailer, free module, or preview — shown on the product page before purchase.</p>
              <Input
                placeholder="https://youtube.com/... or link to free sample"
                value={form.promotionSampleUrl}
                onChange={(e) => setForm({ ...form, promotionSampleUrl: e.target.value })}
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Full product — description (after purchase)</label>
              <Textarea
                placeholder="Course outline, how to access, what buyers receive — shown in My courses after purchase."
                value={form.fullDescription}
                onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
                rows={5}
              />
            </div>

            {editingId &&
              products.some((p) => p.id === editingId && p.filePath && !/^https?:\/\//i.test(p.filePath)) && (
                <p className="text-sm text-muted-foreground mt-2 rounded-lg bg-muted/50 px-3 py-2">
                  A full course file is already hosted for this product. Choose a new file below to replace it.
                </p>
              )}

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Full course file (upload from your computer)</label>
              <p className="text-xs text-muted-foreground">
                Stored on Elite Ethiopia — max 150 MB. Allowed: zip, pdf, video, Office docs, images (incl. webp). Replaces any
                previous hosted file.
              </p>
              <Input
                type="file"
                accept=".zip,.rar,.7z,.tar,.gz,.pdf,.mp4,.webm,.mkv,.mov,.avi,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.epub,.json,.bmp,.tif,.tiff"
                onChange={(e) => setFullCourseFile(e.target.files?.[0] ?? null)}
              />
              {fullCourseFile && (
                <p className="text-xs text-teal-700 font-medium">Selected: {fullCourseFile.name}</p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Or external access link (optional)</label>
              <p className="text-xs text-muted-foreground">
                Use instead of upload if your course lives on Drive, Teachable, etc. Leave empty when uploading a file above.
              </p>
              <Input
                placeholder="https://..."
                value={form.fullFilePath}
                onChange={(e) => setForm({ ...form, fullFilePath: e.target.value })}
                disabled={!!fullCourseFile}
              />
            </div>

            <Button className="mt-6 w-full" onClick={() => void saveProduct()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Save changes' : 'Publish product'}
            </Button>
          </Card>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-2">{viewing.title}</h2>
            <div className="text-sm space-y-3">
              <p>
                <span className="font-medium">Promotion:</span> {viewing.description}
              </p>
              <p>
                <span className="font-medium">Full notes (buyers):</span> {viewing.fullDescription || '—'}
              </p>
              <p>
                <span className="font-medium">Full course:</span>{' '}
                {viewing.filePath
                  ? /^https?:\/\//i.test(viewing.filePath)
                    ? viewing.filePath
                    : `Hosted on server (${viewing.filePath})`
                  : '—'}
              </p>
              <p>
                <span className="font-medium">Sample URL:</span> {viewing.promotionSampleUrl || '—'}
              </p>
            </div>
            <Button className="mt-6" onClick={() => setViewing(null)}>
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
