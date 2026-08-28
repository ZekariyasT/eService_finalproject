'use client'

import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Briefcase, MapPin, Users, Award } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Client, PersonalProfile } from '@/lib/types'
import { PersonalProfileSection } from '@/components/profile/personal-profile-section'

export default function ClientProfilePage() {
  const { user, updateProfile } = useAuth()
  const client = user as Client | null
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    company: client?.company || '',
    industry: client?.industry || '',
  })
  const [personal, setPersonal] = useState<PersonalProfile>(user?.personalProfile ?? {})

  useEffect(() => {
    setPersonal(user?.personalProfile && Object.keys(user.personalProfile).length ? { ...user.personalProfile } : {})
  }, [user?.id, user?.personalProfile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    await updateProfile({
      ...formData,
      personalProfile: personal,
      ...(user?.onboardingProfileStatus === 'pending' ? { onboardingProfileStatus: 'completed' as const } : {}),
    })
    setIsEditing(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Company Profile</h1>
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {/* Profile Card */}
      <Card className="p-8 mb-8">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-5xl">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{client?.company || user?.name}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge>{user?.verified ? 'Verified' : 'Unverified'}</Badge>
              <Badge variant="outline">Active Member</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Jobs Posted</p>
                <p className="text-xl font-semibold">0</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Hires</p>
                <p className="text-xl font-semibold">0</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Company Info */}
      <Card className="p-6 mb-8">
        <h3 className="font-semibold text-lg mb-4">Company Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            {isEditing ? (
              <Input
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            ) : (
              <p className="text-muted-foreground">{formData.company || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            {isEditing ? (
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background"
              >
                <option value="">Select an industry</option>
                <option value="tech">Technology</option>
                <option value="ecommerce">E-commerce</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <p className="text-muted-foreground">{formData.industry || 'Not set'}</p>
            )}
          </div>
        </div>
      </Card>

      <PersonalProfileSection value={personal} onChange={setPersonal} disabled={!isEditing} compact />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <Briefcase className="w-8 h-8 text-primary mb-4" />
          <p className="text-muted-foreground text-sm mb-1">Jobs Posted</p>
          <p className="text-3xl font-bold">0</p>
        </Card>

        <Card className="p-6">
          <Users className="w-8 h-8 text-accent mb-4" />
          <p className="text-muted-foreground text-sm mb-1">Freelancers Hired</p>
          <p className="text-3xl font-bold">0</p>
        </Card>

        <Card className="p-6">
          <Award className="w-8 h-8 text-secondary mb-4" />
          <p className="text-muted-foreground text-sm mb-1">Hire Rate</p>
          <p className="text-3xl font-bold">0%</p>
        </Card>
      </div>

      {isEditing && (
        <div className="flex gap-3">
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
