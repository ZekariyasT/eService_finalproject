'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import type { User } from '@/lib/types'
import { postLoginPath } from '@/lib/role-dashboard'
import { Briefcase, Store, UserCircle } from 'lucide-react'

function GoogleCompleteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errParam = searchParams.get('error')
  const tokenParam = searchParams.get('token')
  const pendingParam = searchParams.get('pending')
  const { completeGoogleSession } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const startedSessionRef = useRef(false)

  useEffect(() => {
    if (errParam) {
      setError(errParam)
      return
    }
    if (pendingParam) {
      setPendingToken(pendingParam)
      return
    }
    if (!tokenParam) {
      setError('Missing sign-in token. Return to the login page and try again.')
      return
    }
    if (startedSessionRef.current) return
    startedSessionRef.current = true
    void completeGoogleSession(tokenParam)
      .then((u) => {
        setDone(true)
        router.replace(postLoginPath(u))
      })
      .catch((e) => {
        startedSessionRef.current = false
        setError(e instanceof Error ? e.message : 'Sign-in failed')
      })
  }, [completeGoogleSession, router, errParam, tokenParam, pendingParam])

  const completeWithRole = async (role: 'client' | 'freelancer' | 'seller') => {
    if (!pendingToken) return
    setSubmitBusy(true)
    setError(null)
    try {
      const data = await apiFetch<{ user: User; token: string }>('/auth/google/complete-signup', {
        method: 'POST',
        json: { pendingToken, role },
      })
      setDone(true)
      const u = await completeGoogleSession(data.token)
      router.replace(postLoginPath(u))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish sign-up')
    } finally {
      setSubmitBusy(false)
    }
  }

  if (error && !pendingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <h1 className="text-lg font-semibold text-destructive mb-2">Google sign-in did not finish</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button asChild className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (pendingToken) {
    const roles: {
      id: 'client' | 'freelancer' | 'seller'
      label: string
      description: string
      icon: typeof UserCircle
    }[] = [
      {
        id: 'client',
        label: 'Client',
        description: 'Post jobs and hire freelancers for your projects.',
        icon: UserCircle,
      },
      {
        id: 'freelancer',
        label: 'Freelancer',
        description: 'Offer services, send proposals, and get paid.',
        icon: Briefcase,
      },
      {
        id: 'seller',
        label: 'Seller',
        description: 'List and sell digital products on the marketplace.',
        icon: Store,
      },
    ]

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Finish your account</h1>
            <p className="text-sm text-muted-foreground">
              Your Google account is new here. Choose how you want to use Elite Ethiopia — you&apos;ll be signed in
              immediately. You can add an email password later from account settings if you want.
            </p>
          </div>
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-1">
            {roles.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled={submitBusy}
                onClick={() => void completeWithRole(id)}
                className="flex w-full items-start gap-4 rounded-lg border bg-card p-4 text-left transition hover:bg-accent/50 disabled:opacity-60"
              >
                <Icon className="mt-0.5 h-8 w-8 shrink-0 text-primary" aria-hidden />
                <span className="flex-1">
                  <span className="font-medium">{label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Prefer the full sign-up form?{' '}
            <Link href="/signup" className="underline underline-offset-2">
              Go to sign up
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-12">
      <p className="text-muted-foreground">{done ? 'Redirecting…' : 'Completing sign-in…'}</p>
    </div>
  )
}

export default function GoogleCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Completing sign-in…</p>
        </div>
      }
    >
      <GoogleCompleteInner />
    </Suspense>
  )
}
