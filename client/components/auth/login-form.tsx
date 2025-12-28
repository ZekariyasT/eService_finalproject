'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { getApiBase, getGoogleOAuthStartUrl } from '@/lib/api'
import { postLoginPath } from '@/lib/role-dashboard'

/** Avoid open redirects: only same-origin paths. */
function safeInternalRedirect(raw: string | null): string | null {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (
      decoded.startsWith('/') &&
      !decoded.startsWith('//') &&
      !decoded.includes('://') &&
      !decoded.includes('\\')
    ) {
      return decoded
    }
  } catch {
    return null
  }
  return null
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetOk = searchParams.get('reset') === '1'
  const emailVerifiedOk = searchParams.get('verified') === '1'
  const { login, isAuthActionPending, user, isAuthenticated, isInitializing } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  /** Already signed in (e.g. valid session) — leave login page instead of looking “stuck”. */
  useEffect(() => {
    if (isInitializing || !isAuthenticated || !user) return
    const dest =
      user.onboardingProfileStatus === 'pending'
        ? postLoginPath(user)
        : safeInternalRedirect(searchParams.get('redirect')) ?? postLoginPath(user)
    startTransition(() => {
      router.replace(dest)
    })
  }, [isAuthenticated, isInitializing, router, searchParams, user?.id, user?.role, user?.onboardingProfileStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      const u = await login(email, password)
      const dest =
        u.onboardingProfileStatus === 'pending'
          ? postLoginPath(u)
          : safeInternalRedirect(searchParams.get('redirect')) ?? postLoginPath(u)
      startTransition(() => {
        router.replace(dest)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Sign in to your Elite Ethiopia account</p>
      </div>

     
      <form onSubmit={handleSubmit} className="space-y-4">
        {resetOk && (
          <div className="p-3 rounded-lg bg-primary/15 text-primary text-sm">
            Your password was updated. Sign in with your new password.
          </div>
        )}
        {emailVerifiedOk && (
          <div className="p-3 rounded-lg bg-primary/15 text-primary text-sm">
            Email verified. You can sign in now.
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
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
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-11"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={isAuthActionPending || isPending}
        >
          <LogIn className="w-4 h-4 mr-2" />
          {isAuthActionPending || isPending ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {/* Single merged admin: ADMIN_EMAIL=admin@eliteethiopia.com (set in backend/.env). */}

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" asChild>
          <a href={getGoogleOAuthStartUrl('login')}>Continue with Google</a>
        </Button>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Uses your Google account. First time? Sign up with Google from the sign-up page for your role.
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>

      <p className="mt-4 text-center text-sm">
        <Link href="/auth/forgot-password" className="text-primary hover:underline font-medium">
          Forgot password?
        </Link>
      </p>
    </div>
  )
}
