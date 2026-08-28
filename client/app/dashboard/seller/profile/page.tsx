'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import type { PersonalProfile } from '@/lib/types'
import { PersonalProfileSection } from '@/components/profile/personal-profile-section'

type SellerProfileFields = {
  company?: string
  industry?: string
  location?: string
  shortBio?: string
}

export default function SellerProfilePage() {
  const { user, updateProfile } = useAuth()
  const su = user as SellerProfileFields | null
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    company: su?.company || '',
    industry: su?.industry || '',
    location: su?.location || '',
    shortBio: su?.shortBio || '',
  })
  const [personal, setPersonal] = useState<PersonalProfile>(user?.personalProfile ?? {})

  useEffect(() => {
    setPersonal(user?.personalProfile && Object.keys(user.personalProfile).length ? { ...user.personalProfile } : {})
  }, [user?.id, user?.personalProfile])

  const save = async () => {
    await updateProfile({
      ...form,
      personalProfile: personal,
      ...(user?.onboardingProfileStatus === 'pending' ? { onboardingProfileStatus: 'completed' as const } : {}),
    })
    setIsEditing(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Seller Profile</h1>
        <Button onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Cancel' : 'Edit Seller Profile'}</Button>
      </div>

      <Card className="p-8 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-5xl">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">{form.company || user?.name}</h2>
            <div className="flex gap-2 mb-4">
              <Badge>{user?.verified ? 'Verified Seller' : 'Unverified Seller'}</Badge>
              {user?.paidVerificationBadge && <Badge variant="outline">Premium Badge</Badge>}
            </div>
            <p className="text-muted-foreground">{form.shortBio || 'No seller bio yet.'}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Store / Business Name</label>
            {isEditing ? (
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            ) : (
              <p className="text-muted-foreground">{form.company || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category / Industry</label>
            {isEditing ? (
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            ) : (
              <p className="text-muted-foreground">{form.industry || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            {isEditing ? (
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            ) : (
              <p className="text-muted-foreground">{form.location || 'Not set'}</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Bio</label>
          {isEditing ? (
            <textarea
              value={form.shortBio}
              onChange={(e) => setForm({ ...form, shortBio: e.target.value })}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background"
              rows={4}
            />
          ) : (
            <p className="text-muted-foreground">{form.shortBio || 'Not set'}</p>
          )}
        </div>
        {isEditing && <Button className="mt-4" onClick={save}>Save Seller Profile</Button>}
      </Card>

      <div className="mt-8">
        <PersonalProfileSection value={personal} onChange={setPersonal} disabled={!isEditing} compact />
        {isEditing ? (
          <p className="mt-2 text-xs text-muted-foreground">Preferences are saved together with &quot;Save Seller Profile&quot;.</p>
        ) : null}
      </div>
    </div>
  )
}

