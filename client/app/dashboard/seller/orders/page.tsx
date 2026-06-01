'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MessageSquare, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

type OrderStatus = 'pending' | 'accepted' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

type SellerOrder = {
  id: string
  customerName: string
  customerEmail: string
  products: Array<{ name: string; quantity: number; price: number; productType: 'physical' | 'digital' }>
  paymentStatus: 'paid' | 'pending'
  status: OrderStatus
  deliveryAddress: string
  date: string
}

function total(order: SellerOrder) {
  return order.products.reduce((sum, product) => sum + product.price * product.quantity, 0)
}

function hasPhysicalProduct(order: SellerOrder) {
  return order.products.some((product) => product.productType === 'physical')
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.id.toLowerCase().includes(search.toLowerCase()) ||
          order.customerName.toLowerCase().includes(search.toLowerCase()) ||
          order.products.some((product) => product.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [orders, search]
  )

  const updateOrder = (id: string, patch: Partial<SellerOrder>) => {
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, ...patch } : order)))
    setSelectedOrder((prev) => (prev?.id === id ? { ...prev, ...patch } : prev))
  }

  const setStatus = (order: SellerOrder, status: OrderStatus) => {
    setMessage('')
    if (status === 'processing' && order.paymentStatus !== 'paid') {
      setMessage('Payment must be confirmed before processing.')
      return
    }
    if (status === 'delivered' && hasPhysicalProduct(order) && order.status !== 'shipped') {
      setMessage('Physical orders cannot be marked delivered before shipment.')
      return
    }
    updateOrder(order.id, { status })
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Incoming Orders</h1>
      <p className="text-muted-foreground mb-6">Accept, process, ship, and complete customer orders.</p>
      {message && <p className="text-sm text-muted-foreground mb-4">{message}</p>}

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_1.2fr_120px_120px_130px_120px_170px] gap-4 px-4 py-3 bg-secondary text-sm font-medium">
          <span>Order ID</span>
          <span>Customer</span>
          <span>Product(s)</span>
          <span>Total</span>
          <span>Payment</span>
          <span>Status</span>
          <span>Date</span>
          <span>Actions</span>
        </div>
        {filteredOrders.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground text-sm border-t border-border">No orders yet.</div>
        ) : (
          filteredOrders.map((order) => (
          <div key={order.id} className="grid grid-cols-[120px_1fr_1.2fr_120px_120px_130px_120px_170px] gap-4 px-4 py-4 border-t border-border items-center">
            <span className="font-medium">{order.id}</span>
            <span>{order.customerName}</span>
            <span>{order.products.map((product) => product.name).join(', ')}</span>
            <span>${total(order)}</span>
            <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>{order.paymentStatus}</Badge>
            <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>{order.status}</Badge>
            <span>{new Date(order.date).toLocaleDateString()}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>View</Button>
              <Button variant="outline" size="sm" onClick={() => setStatus(order, 'accepted')} disabled={order.status !== 'pending'}>Accept</Button>
            </div>
          </div>
        ))
        )}
      </Card>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Order Details: {selectedOrder.id}</h2>
                <p className="text-sm text-muted-foreground">{selectedOrder.customerName} · {selectedOrder.customerEmail}</p>
              </div>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Product Details</h3>
                {selectedOrder.products.map((product) => (
                  <p key={product.name} className="text-sm text-muted-foreground">
                    {product.name} · Qty {product.quantity} · ${product.price} · {product.productType}
                  </p>
                ))}
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Delivery Info</h3>
                <p className="text-sm text-muted-foreground">{selectedOrder.deliveryAddress}</p>
              </Card>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStatus(selectedOrder, 'cancelled')} disabled={selectedOrder.status === 'delivered'}>
                Reject / Cancel
              </Button>
              <Button onClick={() => setStatus(selectedOrder, 'processing')}>Mark Processing</Button>
              <Button onClick={() => setStatus(selectedOrder, 'shipped')} disabled={!hasPhysicalProduct(selectedOrder)}>
                Mark Shipped
              </Button>
              <Button onClick={() => setStatus(selectedOrder, 'delivered')}>Mark Delivered</Button>
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Customer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

