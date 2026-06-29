'use client'

import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, CreditCard, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useEffect, useState } from 'react'

type WalletInfo = { accountNo: string; balance: number }

type WalletTx = {
  id: string
  type: string
  amount: number
  fee_amount?: number
  status?: string
  created_at: string
}

function txLabel(type: string) {
  switch (type) {
    case 'topup':
      return 'Wallet top-up'
    case 'withdraw':
      return 'Withdrawal'
    case 'transfer_out':
      return 'Transfer sent'
    case 'transfer_in':
      return 'Transfer received'
    default:
      return type.replace(/_/g, ' ')
  }
}

function txSignedAmount(tx: WalletTx): number {
  const raw = Number(tx.amount ?? 0)
  if (['withdraw', 'transfer_out'].includes(tx.type)) return -Math.abs(raw)
  return Math.abs(raw)
}

export default function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('100')
  const [message, setMessage] = useState('')
  const [transactions, setTransactions] = useState<WalletTx[]>([])
  const [loadingTx, setLoadingTx] = useState(true)

  const loadWallet = async () => {
    const res = await apiFetch<{ wallet: WalletInfo }>('/wallet/me')
    setWallet(res.wallet)
  }

  const loadTransactions = async () => {
    try {
      const res = await apiFetch<{ transactions: WalletTx[] }>('/wallet/transactions')
      setTransactions(Array.isArray(res.transactions) ? res.transactions : [])
    } catch {
      setTransactions([])
    } finally {
      setLoadingTx(false)
    }
  }

  useEffect(() => {
    void loadWallet().catch((e) => setMessage(e instanceof Error ? e.message : 'Failed to load wallet'))
    void loadTransactions()
  }, [])

  const withdraw = async () => {
    setMessage('')
    try {
      await apiFetch('/wallet/withdraw', {
        method: 'POST',
        json: { amount: Number(withdrawAmount) },
      })
      await loadWallet()
      await loadTransactions()
      setMessage('Withdrawal request completed.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Withdrawal failed')
    }
  }

  const earningTypes = new Set(['topup', 'transfer_in'])
  const withdrawalTypes = new Set(['withdraw', 'transfer_out'])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Wallet & Earnings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-8 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="mb-6">
            <p className="text-sm opacity-90">Total Earnings</p>
            <p className="text-4xl font-bold">${user?.earnings || 0}</p>
          </div>
          <p className="text-sm opacity-75">Lifetime earnings on Elite Ethiopia</p>
        </Card>

        <Card className="p-8 bg-gradient-to-br from-accent to-accent/80 text-accent-foreground">
          <div className="mb-6">
            <p className="text-sm opacity-90">Available Balance</p>
            <p className="text-4xl font-bold">${wallet?.balance.toFixed(2) ?? '0.00'}</p>
            <p className="text-sm opacity-75 mt-1">Account: {wallet?.accountNo ?? 'Loading...'}</p>
          </div>
          <Input
            type="number"
            min="1"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="bg-white text-foreground"
          />
          <Button
            size="lg"
            className="w-full mt-4 bg-white text-accent hover:bg-white/90"
            onClick={withdraw}
            disabled={!Number(withdrawAmount)}
          >
            Withdraw Funds
          </Button>
          {message && <p className="text-sm opacity-90 mt-3">{message}</p>}
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {loadingTx ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading transactions…</p>
            </Card>
          ) : transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
            </Card>
          ) : (
            transactions.map((transaction) => {
              const amt = txSignedAmount(transaction)
              return (
                <Card key={transaction.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        {amt >= 0 ? (
                          <TrendingUp className="w-6 h-6 text-primary" />
                        ) : (
                          <CreditCard className="w-6 h-6 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{txLabel(transaction.type)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${amt >= 0 ? 'text-primary' : 'text-foreground'}`}>
                        {amt >= 0 ? '+' : ''} ${Math.abs(amt).toFixed(2)}
                      </p>
                      {transaction.status && (
                        <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="earnings" className="mt-6 space-y-4">
          {transactions
            .filter((t) => earningTypes.has(t.type))
            .map((transaction) => (
              <Card key={transaction.id} className="p-6">
                <p className="font-medium">{txLabel(transaction.type)}</p>
                <p className="text-sm text-muted-foreground">{new Date(transaction.created_at).toLocaleString()}</p>
              </Card>
            ))}
          {!loadingTx && transactions.filter((t) => earningTypes.has(t.type)).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No earnings transactions yet.</p>
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-6 space-y-4">
          {transactions
            .filter((t) => withdrawalTypes.has(t.type))
            .map((transaction) => (
              <Card key={transaction.id} className="p-6">
                <p className="font-medium">{txLabel(transaction.type)}</p>
                <p className="text-sm text-muted-foreground">{new Date(transaction.created_at).toLocaleString()}</p>
              </Card>
            ))}
          {!loadingTx && transactions.filter((t) => withdrawalTypes.has(t.type)).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No withdrawals yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
