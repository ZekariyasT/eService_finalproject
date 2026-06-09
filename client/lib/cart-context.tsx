'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  sellerName?: string
  stock?: number
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  isInCart: (id: string) => boolean
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_KEY = 'cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isInitializing } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  /** Hydrate or clear cart once auth state is known (avoid guest reading a logged-in cart from localStorage). */
  useEffect(() => {
    if (!mounted || isInitializing) return
    if (!isAuthenticated) {
      setCart([])
      try {
        localStorage.removeItem(CART_KEY)
      } catch {
        /* ignore */
      }
      return
    }
    try {
      const saved = localStorage.getItem(CART_KEY)
      if (saved) setCart(JSON.parse(saved) as CartItem[])
    } catch {
      setCart([])
    }
  }, [mounted, isInitializing, isAuthenticated])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || isInitializing || !isAuthenticated) return
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      /* ignore */
    }
  }, [cart, mounted, isAuthenticated, isInitializing])

  const addToCart = useCallback(
    (item: CartItem) => {
      if (isInitializing) return
      if (!isAuthenticated) {
        const next = pathname && pathname.startsWith('/') ? pathname : '/'
        router.push(`/login?redirect=${encodeURIComponent(next)}`)
        return
      }
      setCart((prev) => {
        const existing = prev.find((p) => p.id === item.id)
        if (existing)
          return prev.map((p) =>
            p.id === item.id ? { ...p, quantity: p.quantity + item.quantity } : p,
          )
        return [...prev, item]
      })
    },
    [isAuthenticated, isInitializing, pathname, router],
  )

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) removeFromCart(id)
    else setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const clearCart = () => setCart([])
  const isInCart = (id: string) => cart.some((item) => item.id === id)
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, isInCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
