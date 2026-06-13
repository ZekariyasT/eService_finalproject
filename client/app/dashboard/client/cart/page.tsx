'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingCart, Trash2, Wallet, CheckCircle, AlertCircle, Smartphone, Loader2 } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

const MAX_COIN_DISCOUNT_RATE = 0.3

type TelebirrAccount = {
  phoneNumber: string
  holderName: string
  balance: number
  locked: boolean
}

export default function CartPage() {
  const { cart, total, updateQuantity, removeFromCart, clearCart } = useCart()
  const { isAuthenticated } = useAuth()
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('info')
  const [step, setStep] = useState<'cart' | 'review' | 'payment' | 'confirm'>('cart')
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'telebirr'>('wallet')
  const [coinsToUse, setCoinsToUse] = useState('0')
  const [availableCoins, setAvailableCoins] = useState(0)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [telebirr, setTelebirr] = useState<TelebirrAccount | null>(null)
  const [tbPhone, setTbPhone] = useState('')
  const [tbPin, setTbPin] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [commissionPercent, setCommissionPercent] = useState(10)
  const [purchasedItems, setPurchasedItems] = useState<{ productTitle: string; amount: number }[]>([])
  const [lastTelebirrRef, setLastTelebirrRef] = useState<string | null>(null)

  const maxCoinDiscount = Math.floor(total * MAX_COIN_DISCOUNT_RATE)
  const requestedCoins = Math.max(0, Math.floor(Number(coinsToUse || 0)))
  const discount = Math.min(requestedCoins, availableCoins, maxCoinDiscount, Math.floor(total))
  const grandTotal = Math.max(0, total - discount)
  const insufficientWallet = walletBalance !== null && walletBalance < grandTotal
  const insufficientTelebirr = telebirr !== null && telebirr.balance < grandTotal

  useEffect(() => {
    apiFetch<{ commissionPercent: number }>('/platform/commission')
      .then((res) => setCommissionPercent(res.commissionPercent))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    apiFetch<{ balance: number }>('/coins/me')
      .then((res) => setAvailableCoins(res.balance))
      .catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    apiFetch<{ wallet: { balance: number } }>('/wallet/me')
      .then((res) => {
        const n = Number(res?.wallet?.balance)
        setWalletBalance(Number.isFinite(n) ? n : null)
      })
      .catch(() => setWalletBalance(null))
    apiFetch<{ account: TelebirrAccount | null }>('/telebirr/me')
      .then((res) => {
        setTelebirr(res.account)
        if (res.account?.phoneNumber && !tbPhone) setTbPhone(res.account.phoneNumber)
      })
      .catch(() => setTelebirr(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const showMsg = (text: string, type: 'error' | 'success' | 'info' = 'info') => {
    setMessage(text)
    setMessageType(type)
  }

  const checkout = async () => {
    setMessage('')
    setLastTelebirrRef(null)
    if (!isAuthenticated) return showMsg('Please log in to checkout.', 'error')
    if (cart.length === 0) return showMsg('Cannot checkout with an empty cart.', 'error')
    if (paymentMethod === 'wallet' && insufficientWallet) {
      return showMsg('Insufficient wallet balance. Please top up your wallet first.', 'error')
    }
    if (paymentMethod === 'telebirr') {
      if (!tbPhone || !tbPin) return showMsg('Enter your Telebirr phone and PIN.', 'error')
      if (insufficientTelebirr) {
        return showMsg('Insufficient Telebirr balance. Ask an admin to top up your mock account.', 'error')
      }
    }
    if (requestedCoins > availableCoins) {
      return showMsg('You cannot use more coins than your available balance.', 'error')
    }
    if (requestedCoins > maxCoinDiscount) {
      return showMsg('Coins can cover up to 30% of the order total.', 'error')
    }

    setIsCheckingOut(true)
    try {
      if (requestedCoins > 0) {
        const orderId = `CO-${Date.now()}`
        const applied = await apiFetch<{ coinsUsed: number; discount: number; finalTotal: number; balance: number }>(
          '/coins/apply-order',
          {
            method: 'POST',
            json: { orderTotal: total, coinsRequested: requestedCoins, source: orderId },
          }
        )
        setAvailableCoins(applied.balance)
      }

      if (paymentMethod === 'telebirr') {
        setProgressLabel('Verifying Telebirr PIN…')
        await new Promise((r) => setTimeout(r, 250))
        setProgressLabel('Charging your Telebirr account…')
      } else {
        setProgressLabel('Processing payment…')
      }

      const result = await apiFetch<{
        purchases: { id: string; amount: number; productTitle: string }[]
        totalCharged: number
        telebirrRef?: string
      }>('/orders/checkout', {
        method: 'POST',
        json: {
          items: cart.map((item) => ({ productId: item.id })),
          paymentMethod,
          ...(paymentMethod === 'telebirr' ? { phone: tbPhone, pin: tbPin } : {}),
        },
      })

      setProgressLabel('Finalising your purchase…')
      setPurchasedItems(result.purchases.map((p) => ({ productTitle: p.productTitle, amount: p.amount })))
      setLastTelebirrRef(result.telebirrRef ?? null)
      clearCart()
      setStep('confirm')
      setTbPin('')
      showMsg(
        `${result.purchases.length} item(s) purchased for ${result.totalCharged.toFixed(2)} Br.`,
        'success'
      )

      apiFetch<{ wallet: { balance: number } }>('/wallet/me')
        .then((r) => {
          const n = Number(r?.wallet?.balance)
          setWalletBalance(Number.isFinite(n) ? n : null)
        })
        .catch(() => {})
      apiFetch<{ account: TelebirrAccount | null }>('/telebirr/me').then((r) => setTelebirr(r.account)).catch(() => {})
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Checkout failed. Please try again.', 'error')
    } finally {
      setIsCheckingOut(false)
      setProgressLabel(null)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Cart & Checkout</h1>

      {message && (
        <div
          className={`flex items-start gap-2 text-sm rounded-lg px-4 py-3 mb-4 ${
            messageType === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : messageType === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {messageType === 'error' ? (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {step === 'confirm' ? (
        <Card className="p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <h2 className="text-2xl font-semibold">Purchase Complete!</h2>
          <p className="text-muted-foreground">Your products are ready to access.</p>
          {purchasedItems.length > 0 && (
            <div className="text-left max-w-sm mx-auto space-y-1">
              {purchasedItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="truncate mr-2">{item.productTitle}</span>
                  <span className="font-medium shrink-0">{item.amount.toFixed(2)} Br</span>
                </div>
              ))}
            </div>
          )}
          {lastTelebirrRef && (
            <p className="text-xs text-muted-foreground font-mono">
              Telebirr reference: {lastTelebirrRef}
            </p>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/dashboard/my-courses">
              <Button className="bg-teal-600 hover:bg-teal-700">Go to My Courses</Button>
            </Link>
            <Link href="/products">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
          </div>
        </Card>
      ) : cart.length === 0 ? (
        <Card className="p-8 text-center space-y-4">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link href="/products">
            <Button variant="outline">Browse Products</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            {cart.map((item) => (
              <Card key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg border border-border"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.sellerName || 'Elite Seller'}</p>
                    <p className="text-sm font-medium">{item.price.toFixed(2)} Br</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="1"
                    className="w-20"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                  />
                  <Button variant="outline" size="icon" onClick={() => removeFromCart(item.id)} aria-label="Remove from cart">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={clearCart}>
              Clear Cart
            </Button>
          </div>

          <Card className="p-6 h-fit space-y-4">
            <h2 className="font-semibold">Checkout</h2>
            <div className="flex gap-2 text-xs">
              {(['cart', 'review', 'payment'] as const).map((s) => (
                <button
                  key={s}
                  className={`px-3 py-1 rounded-full capitalize ${
                    step === s ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                  onClick={() => setStep(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {step === 'review' && (
              <p className="text-sm text-muted-foreground">Review your items before payment.</p>
            )}

            {step === 'payment' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition ${
                      paymentMethod === 'wallet'
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="font-medium">Elite Wallet</p>
                      <p className="text-xs text-muted-foreground">
                        {walletBalance !== null && Number.isFinite(walletBalance)
                          ? `${walletBalance.toFixed(2)} Br`
                          : '…'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('telebirr')}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition ${
                      paymentMethod === 'telebirr'
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="font-medium">Telebirr</p>
                      <p className="text-xs text-muted-foreground">
                        {telebirr ? `${telebirr.balance.toFixed(2)} Br` : 'Not linked'}
                      </p>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'wallet' && insufficientWallet && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 flex items-center justify-between">
                    <span>Wallet balance is too low for this order.</span>
                    <Link href="/dashboard/client/payments">
                      <Button size="sm" variant="outline">Top Up</Button>
                    </Link>
                  </div>
                )}

                {paymentMethod === 'telebirr' && (
                  <div className="space-y-2">
                    <Input
                      value={tbPhone}
                      onChange={(e) => setTbPhone(e.target.value)}
                      placeholder="Telebirr phone (e.g. +2519…)"
                    />
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={tbPin}
                      onChange={(e) => setTbPin(e.target.value)}
                      placeholder="Telebirr PIN"
                    />
                    {telebirr ? (
                      <p className="text-xs text-muted-foreground">
                        Linked Telebirr: <span className="font-medium">{telebirr.phoneNumber}</span> — Balance{' '}
                        <span className="font-medium">{telebirr.balance.toFixed(2)} Br</span>
                        {telebirr.locked && ' · Locked, wait a minute'}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Add a phone number to your profile to auto-provision a mock Telebirr account.
                      </p>
                    )}
                    {insufficientTelebirr && (
                      <p className="text-xs text-amber-800">
                        Your mock Telebirr balance is below the order total. Ask an admin to top up your mock account.
                      </p>
                    )}
                  </div>
                )}

                {isAuthenticated && (
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max={Math.min(availableCoins, maxCoinDiscount)}
                      value={coinsToUse}
                      onChange={(e) => setCoinsToUse(e.target.value)}
                      placeholder="Coins discount"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {availableCoins} coins. Max for this order: {maxCoinDiscount} coins (30%).
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({cart.length} items)</span>
                <span>{total.toFixed(2)} Br</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Coins discount</span>
                  <span>-{discount.toFixed(2)} Br</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                <span>Total</span>
                <span>{grandTotal.toFixed(2)} Br</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {commissionPercent}% platform commission is deducted from the seller&apos;s earnings, not from your price.
              </p>
            </div>

            {step === 'cart' && (
              <Button className="w-full" onClick={() => setStep('review')}>
                Review Items
              </Button>
            )}
            {step === 'review' && (
              <Button className="w-full" onClick={() => setStep('payment')}>
                Proceed to Payment
              </Button>
            )}
            {step === 'payment' && (
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700"
                onClick={checkout}
                disabled={
                  cart.length === 0 ||
                  isCheckingOut ||
                  !isAuthenticated ||
                  (paymentMethod === 'wallet' && insufficientWallet) ||
                  (paymentMethod === 'telebirr' && (!tbPhone || !tbPin || insufficientTelebirr))
                }
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {progressLabel ?? 'Processing…'}
                  </>
                ) : paymentMethod === 'telebirr' ? (
                  `Pay ${grandTotal.toFixed(2)} Br with Telebirr`
                ) : (
                  `Pay ${grandTotal.toFixed(2)} Br from Wallet`
                )}
              </Button>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
