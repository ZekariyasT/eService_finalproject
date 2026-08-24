'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Lock, Eye, EyeOff, UserCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import type { PersonalProfile } from '@/lib/types'
import { PersonalProfileSection } from '@/components/profile/personal-profile-section'

type SocialLink = {
  platform: string
  url: string
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function SettingsPage() {
  const { user, logout, updateProfile } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('')
  const [securityStatus, setSecurityStatus] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('elite_2fa_enabled') === '1'
  })
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => {
    const existing = user?.socialLinks ? Object.entries(user.socialLinks).filter(([, url]) => url) : []
    return existing.length ? existing.map(([platform, url]) => ({ platform, url })) : [{ platform: '', url: '' }]
  })
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    nationalId: user?.nationalId || '',
    idFrontImageUrl: user?.idFrontImageUrl || '',
    idBackImageUrl: user?.idBackImageUrl || '',
    profilePictureUrl: user?.profilePictureUrl || '',
    shortBio: user?.shortBio || '',
  })
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    jobAlerts: true,
    messages: true,
    updates: false,
  })

  const userLocation = (user as { location?: string } | null)?.location ?? ''
  const [settingsLocation, setSettingsLocation] = useState(userLocation)
  const [personal, setPersonal] = useState<PersonalProfile>(user?.personalProfile ?? {})
  const [aboutStatus, setAboutStatus] = useState('')

  useEffect(() => {
    setSettingsLocation((user as { location?: string } | null)?.location ?? '')
    setPersonal(user?.personalProfile && Object.keys(user.personalProfile).length ? { ...user.personalProfile } : {})
  }, [user?.id, user?.personalProfile, user?.location])

  const saveAboutYou = async () => {
    setAboutStatus('')
    await updateProfile({
      location: settingsLocation.trim() || undefined,
      personalProfile: personal,
      ...(user?.onboardingProfileStatus === 'pending' ? { onboardingProfileStatus: 'completed' as const } : {}),
    })
    setAboutStatus('Your preferences and work details were saved.')
  }

  const saveProfileCompletion = async () => {
    setStatus('')
    const socialLinksPayload = socialLinks.reduce<Record<string, string>>((acc, link) => {
      if (link.platform.trim() && link.url.trim()) acc[link.platform.trim()] = link.url.trim()
      return acc
    }, {})
    await updateProfile({
      name: profileForm.name,
      phone: profileForm.phone,
      nationalId: profileForm.nationalId,
      idFrontImageUrl: profileForm.idFrontImageUrl,
      idBackImageUrl: profileForm.idBackImageUrl,
      profilePictureUrl: profileForm.profilePictureUrl,
      shortBio: profileForm.shortBio,
      socialLinks: socialLinksPayload,
    })
    setStatus('Profile information saved. Completion percentage has been recalculated.')
  }

  const handleProfileUpload = async (field: 'profilePictureUrl' | 'idFrontImageUrl' | 'idBackImageUrl', file?: File) => {
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    setProfileForm((prev) => ({ ...prev, [field]: dataUrl }))
  }

  const saveNotifications = () => {
    localStorage.setItem('elite_notification_preferences', JSON.stringify(notifications))
    setNotificationStatus('Notification preferences saved.')
  }

  const toggleTwoFactor = () => {
    const next = !twoFactorEnabled
    setTwoFactorEnabled(next)
    localStorage.setItem('elite_2fa_enabled', next ? '1' : '0')
    setSecurityStatus(next ? 'Two-factor authentication enabled for this device.' : 'Two-factor authentication disabled.')
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="account" className="w-full max-w-4xl">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="about-you">About you</TabsTrigger>
          <TabsTrigger value="verification">Complete Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Profile Information</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Likes, dislikes, work preferences, and similar fields are under the <strong>About you</strong> tab.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" value={user?.email} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input type="text" value={user?.name} disabled />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Billing & Payments</h3>
            <p className="text-muted-foreground text-sm mb-4">Manage your payment methods and billing information</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/client/payments">Manage Telebirr & Wallet</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Account Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Download My Data
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                Delete Account
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="about-you" className="space-y-6 mt-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <UserCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" aria-hidden />
              <div>
                <h3 className="font-semibold text-lg">Personal profile</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Same fields as the sign-up questionnaire: likes and dislikes, how you work, languages, and more. Edit
                  here anytime — they are stored on your account, not only on your role profile page.
                </p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">City / region</label>
              <Input
                value={settingsLocation}
                onChange={(e) => setSettingsLocation(e.target.value)}
                placeholder="e.g. Addis Ababa"
              />
            </div>
          </Card>
          <PersonalProfileSection value={personal} onChange={setPersonal} />
          {aboutStatus ? <p className="text-sm text-muted-foreground">{aboutStatus}</p> : null}
          <Button className="bg-primary hover:bg-primary/90" onClick={() => void saveAboutYou()}>
            Save personal profile
          </Button>
        </TabsContent>

        <TabsContent value="verification" className="space-y-6 mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold">Profile Completion</h3>
                <p className="text-sm text-muted-foreground">
                  Complete every required field to unlock full access, including withdrawals.
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{user?.profileComplete ?? 0}%</p>
                <p className="text-xs text-muted-foreground">{user?.verificationStatus ?? 'pending'}</p>
              </div>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden mb-6">
              <div className="h-full bg-primary" style={{ width: `${user?.profileComplete ?? 0}%` }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['name', 'Full Name'],
                ['phone', 'Phone Number'],
                ['nationalId', 'National ID (FYNN/FIN)'],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="block text-sm font-medium mb-2">{label}</label>
                  <Input
                    value={String(profileForm[name as keyof typeof profileForm] ?? '')}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, [name]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Profile Picture</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleProfileUpload('profilePictureUrl', e.target.files?.[0])}
                />
                {profileForm.profilePictureUrl && <p className="text-xs text-muted-foreground mt-1">Profile picture selected</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Front ID Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleProfileUpload('idFrontImageUrl', e.target.files?.[0])}
                />
                {profileForm.idFrontImageUrl && <p className="text-xs text-muted-foreground mt-1">Front ID selected</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Back ID Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleProfileUpload('idBackImageUrl', e.target.files?.[0])}
                />
                {profileForm.idBackImageUrl && <p className="text-xs text-muted-foreground mt-1">Back ID selected</p>}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium">Social Media Links</h4>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSocialLinks((prev) => [...prev, { platform: '', url: '' }])}
                >
                  Add Social Link
                </Button>
              </div>
              {socialLinks.map((link, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3">
                  <Input
                    placeholder="Platform"
                    value={link.platform}
                    onChange={(e) =>
                      setSocialLinks((prev) => prev.map((item, i) => (i === index ? { ...item, platform: e.target.value } : item)))
                    }
                  />
                  <Input
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) =>
                      setSocialLinks((prev) => prev.map((item, i) => (i === index ? { ...item, url: e.target.value } : item)))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSocialLinks((prev) => prev.filter((_, i) => i !== index))}
                    disabled={socialLinks.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Short Bio</label>
              <textarea
                value={profileForm.shortBio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, shortBio: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background"
                rows={4}
              />
            </div>

            {status && <p className="text-sm text-muted-foreground mt-4">{status}</p>}
            <Button className="mt-4 bg-primary hover:bg-primary/90" onClick={() => void saveProfileCompletion()}>
              Save Profile Completion
            </Button>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </h3>
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
            {notificationStatus && <p className="text-sm text-muted-foreground mt-4">{notificationStatus}</p>}
            <Button className="mt-4 bg-primary hover:bg-primary/90" onClick={saveNotifications}>
              Save Preferences
            </Button>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background"
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <Input type="password" placeholder="••••••••" />
              </div>
            </div>
            <Button className="mt-4 bg-primary hover:bg-primary/90">Update Password</Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Two-Factor Authentication</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add an extra layer of security to your account. Current status:{' '}
              <span className="font-medium">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
            </p>
            {securityStatus && <p className="text-sm text-muted-foreground mb-4">{securityStatus}</p>}
            <Button variant="outline" onClick={toggleTwoFactor}>
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </Button>
          </Card>

          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <h3 className="font-semibold mb-4 text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Log out from all devices or permanently delete your account
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                Logout All Devices
              </Button>
              <Button 
                onClick={logout}
                className="bg-primary hover:bg-primary/90"
              >
                Logout This Device
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
