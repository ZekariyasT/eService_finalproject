'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PersonalProfileSection, emptyPersonalProfile } from '@/components/profile/personal-profile-section'
import type { PersonalProfile } from '@/lib/types'
import { profileEditPathForRole } from '@/lib/role-dashboard'

function safeInternalPath(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return fallback
  return raw
}

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isInitializing, updateProfile, isAuthActionPending } = useAuth()
  const defaultNext = profileEditPathForRole(user?.role)
  const nextPath = safeInternalPath(searchParams.get('next'), defaultNext)

  const [shortBio, setShortBio] = useState('')
  const [location, setLocation] = useState('')
  const [personal, setPersonal] = useState<PersonalProfile>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (isInitializing) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.onboardingProfileStatus === 'completed' || user?.onboardingProfileStatus === 'skipped') {
      router.replace(nextPath)
    }
  }, [isAuthenticated, isInitializing, router, user?.onboardingProfileStatus, nextPath])

  useEffect(() => {
    if (!user) return
    setShortBio(user.shortBio ?? '')
    setLocation((user as { location?: string }).location ?? '')
    setPersonal(user.personalProfile && Object.keys(user.personalProfile).length ? { ...user.personalProfile } : emptyPersonalProfile())
  }, [user?.id])

  const save = async (status: 'completed' | 'skipped') => {
    setError('')
    try {
      if (status === 'completed') {
        await updateProfile({
          shortBio: shortBio.trim() || undefined,
          location: location.trim() || undefined,
          personalProfile: personal,
          onboardingProfileStatus: 'completed',
        })
      } else {
        await updateProfile({ onboardingProfileStatus: 'skipped' })
      }
      router.replace(nextPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    }
  }

  if (isInitializing || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      </div>
    )
  }

  if (user.onboardingProfileStatus === 'completed' || user.onboardingProfileStatus === 'skipped') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card px-4 pt-28 pb-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Tell us about you</h1>
          <p className="text-muted-foreground">
            A richer profile helps clients, freelancers, and sellers work together more smoothly. This is optional: you
            can skip and fill everything later from your profile page.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>
        ) : null}

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Basics</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Short introduction</label>
              <textarea
                className="w-full min-h-[88px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                placeholder="One or two sentences about who you are and what you’re looking for on Elite Ethiopia."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">City / region</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Addis Ababa" />
            </div>
          </div>
        </div>

        <PersonalProfileSection value={personal} onChange={setPersonal} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
          <Button type="button" variant="ghost" disabled={isAuthActionPending} onClick={() => void save('skipped')}>
            Skip for now
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary/90 sm:min-w-[200px]"
            disabled={isAuthActionPending}
            onClick={() => void save('completed')}
          >
            {isAuthActionPending ? 'Saving…' : 'Save and continue'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Skipped fields stay empty on your profile until you add them. Email verification is separate — check your inbox
          if you have not confirmed your address yet.
        </p>
      </div>
    </div>
  )
}

export default function OnboardingProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  )
}
