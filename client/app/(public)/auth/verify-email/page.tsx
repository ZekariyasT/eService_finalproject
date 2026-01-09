'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch, getStoredToken } from '@/lib/api'
import { Button } from '@/components/ui/button'

function VerifyEmailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [status, setStatus] = useState<'pending' | 'ok' | 'err'>('pending')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('err')
      setError('Missing verification token. Use the full link from your email.')
      return
    }

    let cancelled = false
    void (async () => {
      try {
        await apiFetch<{ message: string }>('/auth/verify-email', {
          method: 'POST',
          json: { token },
        })
        if (cancelled) return
        if (typeof window !== 'undefined') sessionStorage.removeItem('elite_debug_verification_link')
        setStatus('ok')
        const hasSession = !!getStoredToken()
        window.setTimeout(() => {
          if (hasSession) {
            window.location.href = '/dashboard'
          } else {
            router.replace('/login?verified=1')
          }
        }, 1200)
      } catch (e) {
        if (cancelled) return
        setStatus('err')
        setError(e instanceof Error ? e.message : 'Verification failed.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
      <div className="w-full max-w-md text-center space-y-4">
        {status === 'pending' && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground text-sm">Confirming your email…</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <p className="text-lg font-medium text-primary">Email verified</p>
            <p className="text-sm text-muted-foreground">Redirecting…</p>
          </>
        )}
        {status === 'err' && (
          <>
            <p className="text-destructive text-sm">{error}</p>
            <Button asChild variant="outline">
              <Link href="/auth/check-email">Request a new link</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  )
}
