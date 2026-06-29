'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DollarSign, Send, Smartphone, Wallet } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'

type WalletInfo = { accountNo: string; balance: number }
type WalletTx = {
  id: string
  type: string
  amount: string | number
  fee_amount?: string | number
  status: string
  created_at: string
}

const PLATFORM_FEE_RATE = 0.05

export default function SellerWalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [transactions, setTransactions] = useState<WalletTx[]>([])
  const [amount, setAmount] = useState('250')
  const [receiverAccountNo, setReceiverAccountNo] = useState('')
  const [message, setMessage] = useState('')

  const loadWallet = async () => {
    const [walletRes, txRes] = await Promise.all([
      apiFetch<{ wallet: WalletInfo }>('/wallet/me'),
      apiFetch<{ transactions: WalletTx[] }>('/wallet/transactions'),
    ])
    setWallet(walletRes.wallet)
    setTransactions(txRes.transactions)
  }

  useEffect(() => {
    void loadWallet().catch((e) => setMessage(e instanceof Error ? e.message : 'Failed to load wallet'))
  }, [])

  const numericAmount = Number(amount)
  const platformFee = Number((numericAmount * PLATFORM_FEE_RATE).toFixed(2))
  const totalEarnings = transactions
    .filter((tx) => ['sale', 'transfer_in', 'topup'].includes(tx.type))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const pendingBalance = transactions
    .filter((tx) => tx.status === 'pending')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

  const runAction = async (path: string, payload: Record<string, unknown>, success: string) => {
    setMessage('')
    try {
      await apiFetch(path, { method: 'POST', json: payload })
      await loadWallet()
      setMessage(success)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Wallet action failed')
    }
  }

  const withdraw = () => {
    if ((user?.profileComplete ?? 0) < 100 || !user?.verified) {
      setMessage('Withdrawals require 100% profile completion and verified seller status.')
      return
    }
    void runAction('/wallet/withdraw', { amount: numericAmount }, 'Withdrawal completed')
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Seller Wallet</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-muted-foreground text-sm mb-1">Current Balance</p>
          <p className="text-3xl font-bold">${wallet?.balance.toFixed(2) ?? '0.00'}</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm mb-1">Pending Balance</p>
          <p className="text-3xl font-bold">${pendingBalance.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm mb-1">Total Earnings</p>
          <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm mb-1">Account Number</p>
          <p className="text-2xl font-bold">{wallet?.accountNo ?? 'Loading...'}</p>
        </Card>
      </div>

      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Telebirr Wallet Actions</h2>
          </div>
          <Badge variant="secondary">Platform fee: 5%</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={() => runAction('/wallet/topup', { amount: numericAmount }, 'Telebirr top-up completed')} disabled={!numericAmount}>
            <Wallet className="w-4 h-4 mr-2" />
            Top Up
          </Button>
          <Button variant="outline" onClick={withdraw} disabled={!numericAmount}>
            Withdraw
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Withdrawal fee preview: ${platformFee.toFixed(2)}. Negative balances are prevented by the wallet API.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mt-4">
          <Input value={receiverAccountNo} onChange={(e) => setReceiverAccountNo(e.target.value)} placeholder="Receiver account number" />
          <Button
            onClick={() => runAction('/wallet/transfer', { receiverAccountNo, amount: numericAmount }, 'Money sent')}
            disabled={!receiverAccountNo || !numericAmount}
          >
            <Send className="w-4 h-4 mr-2" />
            Transfer
          </Button>
        </div>
        {message && <p className="text-sm mt-4 text-muted-foreground">{message}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_150px_150px_120px_140px] gap-4 px-4 py-3 bg-secondary text-sm font-medium">
          <span>Transaction ID</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
            No seller wallet transactions yet.
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="grid grid-cols-[1fr_150px_150px_120px_140px] gap-4 px-4 py-4 border-t border-border items-center">
              <span className="truncate">{tx.id}</span>
              <span className="capitalize">{tx.type.replace(/_/g, ' ')}</span>
              <span>
                ${tx.amount}
                {Number(tx.fee_amount || 0) > 0 && <span className="text-xs text-muted-foreground block">Fee: ${tx.fee_amount}</span>}
              </span>
              <Badge>{tx.status}</Badge>
              <span>{new Date(tx.created_at).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

