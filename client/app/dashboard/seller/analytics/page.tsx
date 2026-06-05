'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Clock, DollarSign, Package, Star, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

type Product = {
  title: string
  price: number
  stock: number
  sales: number
  status: string
  deleted?: boolean
}

export default function SellerAnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [range, setRange] = useState('week')

  useEffect(() => {
    setProducts(JSON.parse(localStorage.getItem('elite_seller_products') || '[]'))
  }, [])

  const activeProducts = products.filter((product) => !product.deleted)
  const revenue = activeProducts.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.sales || 0), 0)
  const pendingOrders = 0
  const completedOrders = 0
  const totalOrders = pendingOrders + completedOrders
  const lowStock = activeProducts.filter((product) => product.stock > 0 && product.stock <= 5)
  const topProducts = [...activeProducts].sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0)).slice(0, 5)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-muted-foreground">Track seller revenue, order activity, and product performance.</p>
        </div>
        <select className="px-3 py-2 border border-input rounded-lg bg-background" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card className="p-6">
          <DollarSign className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold">${revenue}</p>
        </Card>
        <Card className="p-6">
          <Package className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-3xl font-bold">{totalOrders}</p>
        </Card>
        <Card className="p-6">
          <TrendingUp className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-3xl font-bold">{completedOrders}</p>
        </Card>
        <Card className="p-6">
          <Clock className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-3xl font-bold">{pendingOrders}</p>
        </Card>
        <Card className="p-6">
          <Star className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Average Rating</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sales Over Time ({range})
          </h2>
          <p className="text-sm text-muted-foreground py-8">
            Connect order history to show revenue over time. Local inventory data does not include dated sales series yet.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Top-Selling Products</h2>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product sales yet.</p>
            ) : (
              topProducts.map((product) => (
                <div key={product.title} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <span>{product.title}</span>
                  <Badge>{product.sales || 0} sales</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Performance Insights</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Best-selling product: {topProducts[0]?.title ?? '—'}</p>
            <p>Orders in view: {totalOrders}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Low Stock Alerts</h2>
          <div className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low-stock products.</p>
            ) : (
              lowStock.map((product) => (
                <div key={product.title} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <span>{product.title}</span>
                  <Badge variant="secondary">{product.stock} left</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
