'use client'

import { Card } from '@/components/ui/card'
import { Briefcase, ShoppingBag, Coins } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'

type CoinTransaction = {
  id: string
  type: string
  amount: number
  source?: string | null
  created_at: string
}

type CoinSummary = {
  balance: number
  rules: {
    jobPostCoins: number
    jobAwardedCoins: number
    productSaleCoins: number
    maxCheckoutDiscountPercent: number
    coinToBirrRate: number
  }
  transactions: CoinTransaction[]
}

export default function RewardsPage() {
  const { user, isAuthenticated } = useAuth()
  const [summary, setSummary] = useState<CoinSummary | null>(null)
  const [message, setMessage] = useState('')
  const totalCoins = summary?.balance ?? user?.coins ?? 0
  const rate = summary?.rules.coinToBirrRate ?? 20

  useEffect(() => {
    if (!isAuthenticated) return
    apiFetch<CoinSummary>('/coins/me')
      .then(setSummary)
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Could not load coin balance'))
  }, [isAuthenticated])

  const typeLabel = (type: string) => {
    switch (type) {
      case 'JOB_POST': return 'Job Posted'
      case 'JOB_AWARDED': return 'Job Awarded'
      case 'PRODUCT_SALE': return 'Product Sold'
      case 'BONUS': return 'Admin Bonus'
      case 'SPEND': return 'Redeemed'
      default: return type
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Coins & Rewards</h1>
      {message && <p className="text-sm text-muted-foreground mb-4">{message}</p>}

      <Card className="p-8 mb-6 bg-primary text-primary-foreground">
        <div className="flex items-center gap-4">
          <Coins className="w-12 h-12" />
          <div>
            <p className="text-sm opacity-90">Available Coins</p>
            <p className="text-4xl font-bold">{totalCoins}</p>
            <p className="text-sm opacity-80 mt-1">
              ≈ {(totalCoins / rate).toFixed(2)} Birr ({rate} coins = 1 Birr)
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <Briefcase className="w-8 h-8 text-primary mb-4" />
          <h2 className="font-semibold mb-2">Post a Job</h2>
          <p className="text-sm text-muted-foreground">
            Earn <strong>{summary?.rules.jobPostCoins ?? 10} coins</strong> when you post a job.
          </p>
        </Card>
        <Card className="p-6">
          <ShoppingBag className="w-8 h-8 text-primary mb-4" />
          <h2 className="font-semibold mb-2">Sell a Product</h2>
          <p className="text-sm text-muted-foreground">
            Earn <strong>{summary?.rules.productSaleCoins ?? 10} coins</strong> when you sell a digital product.
          </p>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="font-semibold mb-4">Coin History</h2>
        <div className="space-y-3">
          {(summary?.transactions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No coin transactions yet.</p>
          ) : (
            summary!.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <div>
                  <p className="font-medium">{typeLabel(tx.type)}</p>
                  <p className="text-muted-foreground">{tx.source || 'system'} - {new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <span className={Number(tx.amount) >= 0 ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                  {Number(tx.amount) >= 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
