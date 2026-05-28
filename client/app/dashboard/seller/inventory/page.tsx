'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type ProductStatus = 'active' | 'out_of_stock' | 'draft'
type SellerProduct = {
  id: string
  title: string
  category: string
  price: number
  stock: number
  productType: 'physical' | 'digital'
  status: ProductStatus
  deleted?: boolean
}

function nextStatus(product: SellerProduct, stock: number): ProductStatus {
  if (product.productType === 'physical' && stock <= 0) return 'out_of_stock'
  if (product.status === 'out_of_stock') return 'active'
  return product.status || 'active'
}

function normalizeProduct(raw: Partial<SellerProduct>): SellerProduct {
  const productType = raw.productType === 'digital' ? 'digital' : 'physical'
  const stock = Number(raw.stock ?? 0)
  return {
    id: raw.id || crypto.randomUUID(),
    title: raw.title || 'Untitled product',
    category: raw.category || 'Uncategorized',
    price: Number(raw.price ?? 0),
    stock,
    productType,
    status: raw.status || (productType === 'physical' && stock <= 0 ? 'out_of_stock' : 'active'),
    deleted: raw.deleted,
  }
}

export default function SellerInventoryPage() {
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('elite_seller_products') || '[]')
    const normalized = Array.isArray(saved) ? saved.map((product) => normalizeProduct(product)) : []
    setProducts(normalized)
  }, [])

  const visibleProducts = useMemo(
    () =>
      products
        .filter((product) => !product.deleted)
        .filter((product) => product.title.toLowerCase().includes(search.toLowerCase()))
        .filter((product) => statusFilter === 'all' || product.status === statusFilter),
    [products, search, statusFilter]
  )

  const persist = (next: SellerProduct[]) => {
    setProducts(next)
    localStorage.setItem('elite_seller_products', JSON.stringify(next))
  }

  const updateStock = (id: string, stock: number) => {
    persist(
      products.map((product) =>
        product.id === id ? { ...product, stock: Math.max(0, stock), status: nextStatus(product, Math.max(0, stock)) } : product
      )
    )
  }

  const adjustStock = (id: string, delta: number) => {
    const product = products.find((item) => item.id === id)
    if (!product) return
    updateStock(id, product.stock + delta)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
      <p className="text-muted-foreground mb-6">Update stock, track low inventory, and keep product status accurate.</p>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 border border-input rounded-lg bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr_100px_220px_120px] gap-4 px-4 py-3 bg-secondary text-sm font-medium">
          <span>Product</span>
          <span>Category</span>
          <span>Type</span>
          <span>Stock Controls</span>
          <span>Status</span>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No inventory found. Add products first.</div>
        ) : (
          visibleProducts.map((product) => (
            <div key={product.id} className="grid grid-cols-[1.2fr_1fr_100px_220px_120px] gap-4 px-4 py-4 border-t border-border items-center">
              <div>
                <p className="font-medium">{product.title}</p>
                <p className="text-xs text-muted-foreground">${product.price}</p>
              </div>
              <span>{product.category}</span>
              <span className="capitalize">{product.productType}</span>
              {product.productType === 'digital' ? (
                <span className="text-sm text-muted-foreground">Digital product, no stock required</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => adjustStock(product.id, -1)}>-</Button>
                  <Input
                    type="number"
                    min="0"
                    className="w-20"
                    value={product.stock}
                    onChange={(e) => updateStock(product.id, Number(e.target.value))}
                  />
                  <Button variant="outline" size="sm" onClick={() => adjustStock(product.id, 1)}>+</Button>
                </div>
              )}
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>{(product.status || 'draft').replace(/_/g, ' ')}</Badge>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

