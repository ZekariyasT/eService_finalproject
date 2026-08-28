'use client'

import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, DollarSign, Award, Briefcase } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Freelancer, PersonalProfile } from '@/lib/types'
import { PersonalProfileSection } from '@/components/profile/personal-profile-section'
import { FreelancerSkillsField } from '@/components/profile/freelancer-skills-field'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const freelancer = user as Freelancer | null
  const [isEditing, setIsEditing] = useState(false)
  const [skillsDraft, setSkillsDraft] = useState<string[]>([])
  const [formData, setFormData] = useState({
    bio: freelancer?.bio || freelancer?.shortBio || '',
    hourlyRate: freelancer?.hourlyRate || 45,
    location: freelancer?.location || '',
  })
  const [personal, setPersonal] = useState<PersonalProfile>(user?.personalProfile ?? {})

  useEffect(() => {
    setPersonal(user?.personalProfile && Object.keys(user.personalProfile).length ? { ...user.personalProfile } : {})
  }, [user?.id, user?.personalProfile])

  useEffect(() => {
    if (!isEditing) return
    setSkillsDraft(freelancer?.skills?.length ? [...freelancer.skills] : [])
  }, [isEditing, user?.id])

  const handleSave = async () => {
    await updateProfile({
      ...formData,
      skills: skillsDraft,
      personalProfile: personal,
      ...(user?.onboardingProfileStatus === 'pending' ? { onboardingProfileStatus: 'completed' as const } : {}),
    })
    setIsEditing(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="p-8 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-5xl">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{user?.name}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge>Top Rated</Badge>
              <Badge variant="outline">Verified</Badge>
            </div>

            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Rating</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(freelancer?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-border'
                      }`}
                    />
                  ))}
                  <span className="ml-1">{freelancer?.rating ?? 0}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Projects Completed</p>
                <p className="text-2xl font-bold mt-1">{freelancer?.completedProjects ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hourly Rate</p>
                <p className="text-2xl font-bold mt-1">${formData.hourlyRate}/hr</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* About Section */}
      <Card className="p-6 mb-8">
        <h3 className="font-semibold text-lg mb-4">About</h3>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Short Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-3 border border-input rounded-lg bg-background"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Hourly Rate (USD)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Addis Ababa, Ethiopia"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">{formData.bio || 'No bio added yet.'}</p>
        )}
      </Card>

      {/* Skills Section */}
      <Card className="p-6 mb-8">
        <h3 className="font-semibold text-lg mb-4">Skills & services</h3>
        <FreelancerSkillsField
          value={isEditing ? skillsDraft : freelancer?.skills ?? []}
          onChange={setSkillsDraft}
          disabled={!isEditing}
          helperText={
            isEditing
              ? 'List what you actually offer — software, creative work, finance, languages, virtual assistance, and more.'
              : undefined
          }
        />
      </Card>

      <PersonalProfileSection value={personal} onChange={setPersonal} disabled={!isEditing} compact />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <Briefcase className="w-8 h-8 text-primary mb-4" />
          <p className="text-muted-foreground text-sm mb-1">Portfolio Items</p>
          <p className="text-3xl font-bold">0</p>
        </Card>

        <Card className="p-6">
          <Award className="w-8 h-8 text-accent mb-4" />
          <p className="text-muted-foreground text-sm mb-1">Badges Earned</p>
          <p className="text-3xl font-bold">2</p>
        </Card>

        <Card className="p-6">
          <MapPin className="w-8 h-8 text-secondary mb-4" />
          <p className="text-muted-foreground text-sm mb-1">Location</p>
          <p className="font-medium">{user?.location || 'Not set'}</p>
        </Card>
      </div>

      {isEditing && (
        <div className="flex gap-3 mt-8">
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
