'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User, Freelancer, Client, UserRole } from './types'
import { apiFetch, getStoredToken, setStoredToken } from './api'

const USER_KEY = 'elite_user'

interface AuthContextType {
  user: (Freelancer | Client | null) & { role?: UserRole }
  token: string | null
  isAuthenticated: boolean
  /** True until stored session is validated (or absent) on first load. */
  isInitializing: boolean
  /** True only during login / sign-up / Google session completion (not session hydration). */
  isAuthActionPending: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (role: UserRole, data: Record<string, unknown>) => Promise<{ user: User; debugVerificationLink?: string }>
  completeGoogleSession: (token: string) => Promise<User>
  logout: () => void
  updateProfile: (data: Record<string, unknown>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isAuthActionPending, setIsAuthActionPending] = useState(false)

  const persistSession = useCallback((nextUser: User, nextToken: string) => {
    setUser(nextUser)
    setToken(nextToken)
    setStoredToken(nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
    setToken(null)
    setStoredToken(null)
    localStorage.removeItem(USER_KEY)
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY)
    const storedToken = getStoredToken()
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        clearSession()
        setIsInitializing(false)
        return
      }
      setToken(storedToken)
      /** Short timeout so a hung API cannot block the app for the default 25s client fetch. */
      const SESSION_VALIDATE_MS = 12_000
      apiFetch<{ user: User }>('/users/me', { timeoutMs: SESSION_VALIDATE_MS })
        .then((r) => {
          setUser(r.user)
          localStorage.setItem(USER_KEY, JSON.stringify(r.user))
        })
        .catch(() => {
          clearSession()
        })
        .finally(() => setIsInitializing(false))
    } else {
      setIsInitializing(false)
    }
  }, [clearSession])

  const login = async (email: string, password: string) => {
    setIsAuthActionPending(true)
    try {
      const data = await apiFetch<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        json: { email: email.trim().toLowerCase(), password },
      })
      persistSession(data.user, data.token)
      return data.user
    } finally {
      setIsAuthActionPending(false)
    }
  }

  const signup = async (role: UserRole, data: Record<string, unknown>) => {
    setIsAuthActionPending(true)
    try {
      const result = await apiFetch<{
        user: User
        token: string
        message?: string
        debugVerificationLink?: string
      }>('/auth/signup', {
        method: 'POST',
        json: { role, ...data },
      })
      persistSession(result.user, result.token)
      return { user: result.user, debugVerificationLink: result.debugVerificationLink }
    } finally {
      setIsAuthActionPending(false)
    }
  }

  const completeGoogleSession = useCallback(async (sessionToken: string) => {
    setIsAuthActionPending(true)
    try {
      setStoredToken(sessionToken)
      const data = await apiFetch<{ user: User }>('/users/me')
      persistSession(data.user, sessionToken)
      return data.user
    } finally {
      setIsAuthActionPending(false)
    }
  }, [persistSession])

  const logout = () => {
    clearSession()
  }

  const updateProfile = async (data: Record<string, unknown>) => {
    const result = await apiFetch<{ user: User }>('/users/profile', {
      method: 'PUT',
      json: data,
    })
    if (result.user) {
      setUser(result.user)
      localStorage.setItem(USER_KEY, JSON.stringify(result.user))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isInitializing,
        isAuthActionPending,
        login,
        signup,
        completeGoogleSession,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
