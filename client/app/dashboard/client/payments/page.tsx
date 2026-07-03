'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DollarSign, Info, Smartphone, Send, Wallet, Loader2, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useEffect, useState } from 'react'

function explainWalletError(raw: string): { title: string; detail: string } {
  const r = raw.toLowerCase()
  if (r.includes('insufficient telebirr balance')) {
    return {
      title: 'Telebirr balance too low',
      detail:
        'Your Telebirr account does not have enough Birr for this amount. Ask an admin to top up your mock Telebirr account, or lower the amount.',
    }
  }
  if (r.includes('insufficient wallet balance')) {
    return {
      title: 'Not enough wallet balance',
      detail:
        'Withdrawals and transfers deduct the amount plus the platform commission fee from your Elite wallet. Top up first, or lower the amount.',
    }
  }
  if (r.includes('invalid telebirr pin')) {
    return {
      title: 'Wrong Telebirr PIN',
      detail: 'Re-check the PIN on your Telebirr account. Three wrong attempts will lock the account for a minute.',
    }
  }
  if (r.includes('telebirr locked') || r.includes('too many wrong pin')) {
    return {
      title: 'Telebirr temporarily locked',
      detail: 'Too many wrong PIN attempts. Wait a minute and try again.',
    }
  }
  if (r.includes('telebirr service temporarily unavailable')) {
    return {
      title: 'Telebirr is having a hiccup',
      detail: 'The Telebirr provider returned an error. Try again — this normally clears on the next attempt.',
    }
  }
  if (r.includes('no telebirr account')) {
    return {
      title: 'No Telebirr account on file',
      detail: 'We could not find a mock Telebirr account for that phone number. Sign up with a phone number, or ask an admin to seed one.',
    }
  }
  if (r.includes('receiver account not found')) {
    return {
      title: 'Receiver not found',
      detail:
        'The Elite wallet account number must match another member’s wallet on this platform. Ask them for their account number from their Payments page.',
    }
  }
  if (r.includes('profile') && (r.includes('100%') || r.includes('complete'))) {
    return {
      title: 'Profile must be complete',
      detail:
        'Withdrawals need your profile completion at 100% before we process payout-style requests. Finish your profile in settings, then try again.',
    }
  }
  return { title: 'This action could not be completed', detail: raw }
}

type WalletInfo = { accountNo: string; balance: number }
type WalletTx = { id: string; type: string; amount: string | number; fee_amount?: string | number; status: string; created_at: string }
type TelebirrAccount = {
  phoneNumber: string
  holderName: string
  balance: number
  status: 'active' | 'frozen'
  locked: boolean
  lockedUntil: string | null
}

export default function PaymentsPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [telebirr, setTelebirr] = useState<TelebirrAccount | null>(null)
  const [transactions, setTransactions] = useState<WalletTx[]>([])
  const [amount, setAmount] = useState('250')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [receiverAccountNo, setReceiverAccountNo] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [lastReference, setLastReference] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ title: string; detail: string } | null>(null)
  const [progressStep, setProgressStep] = useState<null | 'auth' | 'charging' | 'crediting'>(null)
  const [busyAction, setBusyAction] = useState<null | 'topup' | 'withdraw' | 'transfer'>(null)

  const loadWallet = async () => {
    const [walletRes, txRes, tbRes] = await Promise.all([
      apiFetch<{ wallet: WalletInfo }>('/wallet/me'),
      apiFetch<{ transactions: WalletTx[] }>('/wallet/transactions'),
      apiFetch<{ account: TelebirrAccount | null }>('/telebirr/me').catch(() => ({ account: null })),
    ])
    setWallet(walletRes.wallet)
    setTransactions(txRes.transactions)
    setTelebirr(tbRes.account)
    if (tbRes.account?.phoneNumber && !phone) setPhone(tbRes.account.phoneNumber)
  }

  useEffect(() => {
    void loadWallet().catch((e) =>
      setLoadError(e instanceof Error ? e.message : 'Could not load wallet information.')
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const numericAmount = Number(amount)
  const canRunTelebirr = !!phone && !!pin && numericAmount > 0

  const topUpFromTelebirr = async () => {
    setSuccessMessage('')
    setActionError(null)
    setLastReference(null)
    setBusyAction('topup')
    setProgressStep('auth')
    try {
      await new Promise((r) => setTimeout(r, 250))
      setProgressStep('charging')
      const res = await apiFetch<{ wallet: WalletInfo; telebirrRef?: string }>('/wallet/topup', {
        method: 'POST',
        json: { amount: numericAmount, method: 'telebirr', phone, pin },
      })
      setProgressStep('crediting')
      await loadWallet()
      setSuccessMessage(
        `Telebirr top-up complete${res.telebirrRef ? ` — reference ${res.telebirrRef}` : ''}.`
      )
      setLastReference(res.telebirrRef ?? null)
      setPin('')
    } catch (e) {
      setActionError(explainWalletError(e instanceof Error ? e.message : 'Telebirr top-up failed'))
    } finally {
      setProgressStep(null)
      setBusyAction(null)
    }
  }

  const withdrawToTelebirr = async () => {
    setSuccessMessage('')
    setActionError(null)
    setLastReference(null)
    setBusyAction('withdraw')
    setProgressStep('charging')
    try {
      const res = await apiFetch<{ wallet: WalletInfo; telebirrRef?: string }>('/wallet/withdraw', {
        method: 'POST',
        json: { amount: numericAmount, method: 'telebirr', phone },
      })
      await loadWallet()
      setSuccessMessage(
        `Withdrawal sent to Telebirr${res.telebirrRef ? ` — reference ${res.telebirrRef}` : ''}.`
      )
      setLastReference(res.telebirrRef ?? null)
    } catch (e) {
      setActionError(explainWalletError(e instanceof Error ? e.message : 'Telebirr withdrawal failed'))
    } finally {
      setProgressStep(null)
      setBusyAction(null)
    }
  }

  const transferToElite = async () => {
    setSuccessMessage('')
    setActionError(null)
    setBusyAction('transfer')
    try {
      await apiFetch('/wallet/transfer', {
        method: 'POST',
        json: { receiverAccountNo, amount: numericAmount },
      })
      await loadWallet()
      setSuccessMessage('Transfer sent successfully.')
    } catch (e) {
      setActionError(explainWalletError(e instanceof Error ? e.message : 'Transfer failed'))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Payments</h1>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Top up or withdraw via Telebirr (simulated in MVP), or transfer between Elite wallets. Telebirr transactions show realistic
        reference numbers (TEB-XXXXXX), pending → completed status, and occasional retries — by design while we're not on the live provider yet.
      </p>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Default mock Telebirr access</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>If you signed up with a phone number, we created a mock Telebirr account for you — starting balance 5,000 Br, PIN <code>1234</code>.</p>
          <p className="text-muted-foreground text-sm">Charges feel like the real thing: ~1 second processing, ~2% random "service unavailable" retries, and locks after 3 wrong PIN attempts.</p>
        </AlertDescription>
      </Alert>

      {loadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Could not load wallet</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-muted-foreground text-sm mb-1">Elite Wallet</p>
          <p className="text-3xl font-bold">{wallet?.balance.toFixed(2) ?? '0.00'} Br</p>
          <p className="text-xs text-muted-foreground mt-1">{wallet?.accountNo ?? 'Loading…'}</p>
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm mb-1 flex items-center gap-1">
            <Smartphone className="w-4 h-4" /> Telebirr (mock)
          </p>
          {telebirr ? (
            <>
              <p className="text-3xl font-bold">{telebirr.balance.toFixed(2)} Br</p>
              <p className="text-xs text-muted-foreground mt-1">{telebirr.phoneNumber} · {telebirr.holderName}</p>
              {telebirr.locked && (
                <Badge variant="destructive" className="mt-2">Locked — try again later</Badge>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No Telebirr account linked. Add a phone number to your profile to provision one automatically.</p>
          )}
        </Card>
        <Card className="p-6">
          <p className="text-muted-foreground text-sm mb-1">Payment Provider</p>
          <p className="text-3xl font-bold">Telebirr</p>
          <p className="text-xs text-muted-foreground mt-1">MVP simulation mode</p>
        </Card>
      </div>

      <Card className="p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Telebirr Wallet Actions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in Br"
          />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telebirr phone (e.g. +2519…)"
          />
          <Input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Telebirr PIN"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Button
            type="button"
            onClick={topUpFromTelebirr}
            disabled={!canRunTelebirr || busyAction !== null}
          >
            {busyAction === 'topup' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {progressStep === 'auth' ? 'Verifying PIN…' : progressStep === 'charging' ? 'Charging Telebirr…' : 'Crediting Elite wallet…'}
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" /> Top Up from Telebirr
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={withdrawToTelebirr}
            disabled={!phone || numericAmount <= 0 || busyAction !== null}
          >
            {busyAction === 'withdraw' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending to Telebirr…
              </>
            ) : (
              'Withdraw to Telebirr'
            )}
          </Button>
        </div>

        <div className="border-t border-border mt-6 pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Send to another Elite member
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <Input
              value={receiverAccountNo}
              onChange={(e) => setReceiverAccountNo(e.target.value)}
              placeholder="Receiver Elite account number"
            />
            <Button
              type="button"
              onClick={transferToElite}
              disabled={!receiverAccountNo || numericAmount <= 0 || busyAction !== null}
            >
              {busyAction === 'transfer' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Money
                </>
              )}
            </Button>
          </div>
        </div>

        {actionError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>{actionError.title}</AlertTitle>
            <AlertDescription>{actionError.detail}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert className="mt-4 border-primary/30 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Success</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{successMessage}</p>
              {lastReference && (
                <p className="text-xs font-mono text-muted-foreground">
                  Reference: {lastReference}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Wallet Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No wallet transactions yet</p>
              <p className="text-sm text-muted-foreground">Top up from Telebirr to create your first transaction.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {transactions.map((payment) => (
                <Card key={payment.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">{payment.type.replace(/_/g, ' ')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{Number(payment.amount).toFixed(2)} Br</p>
                      <Badge>{payment.status}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
