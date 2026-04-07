'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Globe,
  MapPin,
  MessageSquare,
  Star,
  User as UserIcon,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { PersonalProfile } from '@/lib/types'
import { PersonalProfilePreview } from '@/components/profile/personal-profile-preview'

type PublicUser = {
  id: string
  name: string
  username?: string
  email?: string
  role: 'client' | 'freelancer' | 'seller' | 'admin' | 'super-admin' | 'guest'
  verified: boolean
  createdAt: string
  phone?: string
  isActive?: boolean
  profilePictureUrl?: string
  shortBio?: string
  socialLinks?: Record<string, string>
  paidVerificationBadge?: boolean
  personalProfile?: PersonalProfile
  bio?: string
  skills?: string[]
  hourlyRate?: number
  rating?: number
  completedProjects?: number
  earnings?: number
  location?: string
  company?: string
  industry?: string
  verifiedPayment?: boolean
}

const ROLE_LABEL: Record<string, string> = {
  freelancer: 'Freelancer',
  client: 'Client',
  seller: 'Seller',
  admin: 'Administrator',
  'super-admin': 'Administrator',
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user: viewer, isAuthenticated } = useAuth()

  const profileId = useMemo(() => decodeURIComponent(String(params?.id ?? '')), [params])

  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ user: PublicUser }>(`/users/public/${encodeURIComponent(profileId)}`)
      setProfile(res.user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load profile')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void load()
  }, [load])

  const messageHref = useMemo(() => {
    if (!profile) return '#'
    if (!isAuthenticated) return `/auth/login?redirect=${encodeURIComponent(`/profile/${profile.id}`)}`
    if (viewer?.role === 'admin' || viewer?.role === 'super-admin')
      return `/admin/messages?peer=${encodeURIComponent(profile.id)}`
    if (viewer?.role === 'freelancer') return `/dashboard/freelancer/messages?peer=${encodeURIComponent(profile.id)}`
    if (viewer?.role === 'seller') return `/dashboard/seller/messages?peer=${encodeURIComponent(profile.id)}`
    return `/dashboard/client/messages?peer=${encodeURIComponent(profile.id)}`
  }, [profile, viewer?.role, isAuthenticated])

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-12 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-muted" />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="h-40 rounded-xl bg-muted" />
            <div className="h-40 rounded-xl bg-muted md:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-12 max-w-3xl text-center">
        <Card className="p-10">
          <UserIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-semibold mb-2">User profile unavailable</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {error || 'We could not load this user. They may have removed their account.'}
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            Go back
          </Button>
        </Card>
      </div>
    )
  }

  const isSelf = viewer?.id === profile.id
  const initial = profile.name?.charAt(0).toUpperCase() ?? '?'
  const roleLabel = ROLE_LABEL[profile.role] || profile.role
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })
  const isFreelancer = profile.role === 'freelancer'
  const isClient = profile.role === 'client'
  const socialEntries = Object.entries(profile.socialLinks || {}).filter(([, v]) => Boolean(v))

  return (
    <div className="container mx-auto px-4 pt-28 pb-10 max-w-5xl">
      <Card className="p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center text-4xl font-semibold shrink-0">
            {profile.profilePictureUrl ? (
              <Image
                src={profile.profilePictureUrl}
                alt={profile.name}
                fill
                sizes="120px"
                className="object-cover"
              />
            ) : (
              initial
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{profile.name}</h1>
              {profile.verified && (
                <Badge className="bg-primary/15 text-primary gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </Badge>
              )}
              <Badge variant="secondary" className="capitalize">{roleLabel}</Badge>
              {profile.isActive === false && <Badge variant="destructive">Suspended</Badge>}
            </div>

            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}

            {(profile.shortBio || profile.bio) && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {profile.shortBio || profile.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-sm text-muted-foreground">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Joined {memberSince}
              </span>
              {profile.company && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> {profile.company}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {!isSelf && (
                <Button asChild>
                  <Link href={messageHref}>
                    <MessageSquare className="w-4 h-4" /> Message {profile.name.split(' ')[0]}
                  </Link>
                </Button>
              )}
              {isSelf && (
                <Button asChild variant="outline">
                  <Link
                    href={
                      profile.role === 'freelancer'
                        ? '/dashboard/freelancer/profile'
                        : profile.role === 'seller'
                          ? '/dashboard/seller/profile'
                          : '/dashboard/client/profile'
                    }
                  >
                    Edit your profile
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {isFreelancer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Star className="w-4 h-4 text-amber-500" /> Rating
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{(profile.rating ?? 0).toFixed(1)}</p>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(profile.rating ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Briefcase className="w-4 h-4" /> Projects completed
            </div>
            <p className="text-2xl font-bold">{profile.completedProjects ?? 0}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Award className="w-4 h-4" /> Hourly rate
            </div>
            <p className="text-2xl font-bold">
              {profile.hourlyRate ? `Br ${profile.hourlyRate}/hr` : 'Not set'}
            </p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 md:col-span-2">
          <h2 className="font-semibold mb-3">About</h2>
          {profile.bio || profile.shortBio ? (
            <p className="text-sm whitespace-pre-wrap">{profile.bio || profile.shortBio}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {profile.name.split(' ')[0]} hasn't added a bio yet.
            </p>
          )}

          {isFreelancer && profile.skills && profile.skills.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {isClient && (profile.company || profile.industry) && (
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {profile.company && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wider">Company</p>
                  <p className="font-medium">{profile.company}</p>
                </div>
              )}
              {profile.industry && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wider">Industry</p>
                  <p className="font-medium capitalize">{profile.industry}</p>
                </div>
              )}
            </div>
          )}

          <PersonalProfilePreview profile={profile.personalProfile} />
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold mb-1">Contact & links</h2>
          {profile.email && (
            <div className="text-sm">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Email</p>
              <p className="break-all">{profile.email}</p>
            </div>
          )}
          {profile.phone && (
            <div className="text-sm">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Phone</p>
              <p>{profile.phone}</p>
            </div>
          )}
          {socialEntries.length > 0 && (
            <div>
              <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">Links</p>
              <div className="space-y-1">
                {socialEntries.map(([key, value]) => (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline break-all"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="capitalize">{key}</span>
                    <span className="text-muted-foreground truncate">— {value}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {!profile.email && !profile.phone && socialEntries.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No public contact info shared.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
