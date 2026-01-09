'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token')?.trim() ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tokenFromUrl) {
      setError('This reset link is missing or invalid. Request a new link from the login page.')
    }
  }, [tokenFromUrl])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!tokenFromUrl) return
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await apiFetch<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        json: { token: tokenFromUrl, password },
      })
      router.replace('/login?reset=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Set a new password</h1>
          <p className="text-muted-foreground">Choose a password at least 6 characters long.</p>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">New password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-11"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={!tokenFromUrl}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm password</label>
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={!tokenFromUrl}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={busy || !tokenFromUrl}
          >
            {busy ? 'Saving…' : 'Update password'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/auth/forgot-password" className="text-primary hover:underline font-medium">
            Request a new link
          </Link>
          {' · '}
          <Link href="/login" className="text-muted-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
