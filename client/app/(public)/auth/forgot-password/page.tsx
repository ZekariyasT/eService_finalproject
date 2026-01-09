'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneMessage, setDoneMessage] = useState<string | null>(null)
  const [debugLink, setDebugLink] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setDoneMessage(null)
    setDebugLink(null)
    setBusy(true)
    try {
      const r = await apiFetch<{ message: string; debugResetLink?: string }>('/auth/forgot-password', {
        method: 'POST',
        json: { email },
      })
      setDoneMessage(r.message)
      if (r.debugResetLink) setDebugLink(r.debugResetLink)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Forgot password</h1>
          <p className="text-muted-foreground">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
        </div>

        {doneMessage ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/80 text-sm">{doneMessage}</div>
            {debugLink && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Dev mode (email not sent)
                </p>
                <p className="text-muted-foreground mb-2">
                  Open this link to finish resetting your password:
                </p>
                <a href={debugLink} className="text-primary break-all underline font-medium">
                  {debugLink}
                </a>
              </div>
            )}
            <Link href="/login" className="inline-block text-sm text-primary hover:underline font-medium">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
