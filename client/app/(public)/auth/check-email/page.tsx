'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail } from 'lucide-react'
import { apiFetch } from '@/lib/api'

function CheckEmailInner() {
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams.get('email')?.trim() ?? ''
  const [email, setEmail] = useState(emailFromQuery)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState('')

  const devLink =
    typeof window !== 'undefined' ? sessionStorage.getItem('elite_debug_verification_link') : null

  const resend = async () => {
    setError('')
    setMessage(null)
    if (!email.includes('@')) {
      setError('Enter the email you used to register.')
      return
    }
    setBusy(true)
    try {
      const r = await apiFetch<{ message: string; debugVerificationLink?: string }>(
        '/auth/resend-verification',
        { method: 'POST', json: { email: email.trim().toLowerCase() } }
      )
      setMessage(r.message)
      if (r.debugVerificationLink && typeof window !== 'undefined') {
        sessionStorage.setItem('elite_debug_verification_link', r.debugVerificationLink)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a verification link to <strong className="text-foreground">{emailFromQuery || 'your inbox'}</strong>.
            Open it to confirm your email. You can continue using the app until you sign out; after that, sign-in may
            require a verified email if your server has that setting enabled.
          </p>
        </div>

        {devLink && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">Development (SMTP not configured)</p>
            <p className="text-muted-foreground mb-2">Use this link to verify:</p>
            <a href={devLink} className="text-primary break-all underline font-medium">
              {devLink}
            </a>
          </div>
        )}

        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Didn&apos;t get it?</p>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void resend()}>
            {busy ? 'Sending…' : 'Resend verification email'}
          </Button>
        </div>

        <p className="text-center text-sm">
          <Link href="/dashboard" className="text-primary font-medium hover:underline">
            Continue to dashboard
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

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        </div>
      }
    >
      <CheckEmailInner />
    </Suspense>
  )
}
