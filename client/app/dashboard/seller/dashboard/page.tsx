'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, ClipboardList, DollarSign, Package } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SellerDashboardPage() {
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    setProducts(JSON.parse(localStorage.getItem('elite_seller_products') || '[]'))
  }, [])

  const revenue = products.reduce((sum: number, product: any) => sum + Number(product.price || 0) * Number(product.sales || 0), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-muted-foreground">Supply-side tools for selling products and managing orders.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/seller/products">Add Product</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <Package className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Products Listed</p>
          <p className="text-3xl font-bold">{products.length}</p>
        </Card>
        <Card className="p-6">
          <ClipboardList className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Pending Orders</p>
          <p className="text-3xl font-bold">0</p>
        </Card>
        <Card className="p-6">
          <DollarSign className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold">${revenue}</p>
        </Card>
        <Card className="p-6">
          <BarChart3 className="w-8 h-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Average Rating</p>
          <p className="text-3xl font-bold">0.0</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">Seller Flow</h2>
        <p className="text-sm text-muted-foreground">
          Add product &gt; manage inventory &gt; receive order &gt; process order &gt; get paid.
        </p>
      </Card>
    </div>
  )
}

