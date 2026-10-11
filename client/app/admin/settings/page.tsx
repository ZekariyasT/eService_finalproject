'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Briefcase,
  Coins,
  CreditCard,
  KeyRound,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'

type SectionKey = 'platform' | 'coins' | 'jobGates' | 'payment' | 'security' | 'profile' | 'notification'

type SectionDef = {
  key: SectionKey
  label: string
  description: string
  icon: LucideIcon
}

const SECTIONS: SectionDef[] = [
  {
    key: 'platform',
    label: 'Platform setting',
    description: 'Commission, project bounds and platform-wide rules.',
    icon: SettingsIcon,
  },
  {
    key: 'coins',
    label: 'Coins & Exchange',
    description: 'Configure coin-to-Birr exchange rate and reward rules.',
    icon: Coins,
  },
  {
    key: 'jobGates',
    label: 'Job publish gates',
    description: 'Trust, payment and rate-limit rules for publishing jobs.',
    icon: Briefcase,
  },
  {
    key: 'payment',
    label: 'Payment setting',
    description: 'Escrow timing, withdrawal limits and fees.',
    icon: CreditCard,
  },
  {
    key: 'security',
    label: 'Security setting',
    description: 'Account verification rules and platform safety.',
    icon: ShieldCheck,
  },
  {
    key: 'profile',
    label: 'Password and username setting',
    description: 'Update your administrator credentials.',
    icon: KeyRound,
  },
  {
    key: 'notification',
    label: 'Notification',
    description: 'Email and in-app alert preferences.',
    icon: Bell,
  },
]

export default function AdminSettings() {
  const [active, setActive] = useState<SectionKey>('platform')
  const activeSection = SECTIONS.find((s) => s.key === active)!
  const ActiveIcon = activeSection.icon

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure the platform and your administrator credentials.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="p-3 h-fit">
          <nav className="flex flex-col gap-1" aria-label="Settings sections">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = section.key === active
              return (
                <Button
                  key={section.key}
                  type="button"
                  variant={isActive ? 'default' : 'ghost'}
                  className="justify-start gap-3"
                  onClick={() => setActive(section.key)}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">{section.label}</span>
                </Button>
              )
            })}
          </nav>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ActiveIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{activeSection.label}</h2>
                <p className="text-sm text-muted-foreground">{activeSection.description}</p>
              </div>
            </div>

            {active === 'platform' && <PlatformSection />}
            {active === 'coins' && <CoinsSection />}
            {active === 'jobGates' && <JobGatesSection />}
            {active === 'payment' && <PaymentSection />}
            {active === 'security' && <SecuritySection />}
            {active === 'profile' && <ProfileSection />}
            {active === 'notification' && <NotificationSection />}
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" type="button" asChild>
              <Link href="/admin/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function PreviewBanner() {
  return (
    <p className="text-xs text-muted-foreground mb-4 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2">
      UI preview — values shown here will be persisted once the platform settings API is connected.
    </p>
  )
}

function PlatformSection() {
  const [commission, setCommission] = useState(10)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    apiFetch<{ commissionPercent: number }>('/admin/settings/commission')
      .then((data) => setCommission(data.commissionPercent))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await apiFetch('/admin/settings/commission', {
        method: 'PUT',
        json: { commissionPercent: commission },
      })
      setMsg({ kind: 'ok', text: 'Commission rate saved successfully.' })
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium mb-2">Platform commission (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={commission}
          onChange={(e) => setCommission(Number(e.target.value) || 0)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Commission deducted from freelancer/seller earnings when a job is completed or product is sold.
          Both parties see the full price — the commission is applied at payout.
        </p>
      </div>
      <Separator />
      <div>
        <PreviewBanner />
        <Label className="block text-sm font-medium mb-2">Minimum project value (Br)</Label>
        <Input type="number" min={0} placeholder="500" defaultValue="500" />
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Maximum project value (Br)</Label>
        <Input type="number" min={0} placeholder="1000000" defaultValue="1000000" />
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Default platform language</Label>
        <Input placeholder="English" defaultValue="English" />
      </div>
      {msg && (
        <p className={`text-sm ${msg.kind === 'ok' ? 'text-primary' : 'text-destructive'}`}>
          {msg.text}
        </p>
      )}
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save platform settings'}
        </Button>
      </div>
    </div>
  )
}

function CoinsSection() {
  const [rate, setRate] = useState(20)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    apiFetch<{ coinToBirrRate: number }>('/admin/settings/exchange-rate')
      .then((data) => setRate(data.coinToBirrRate))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await apiFetch('/admin/settings/exchange-rate', {
        method: 'PUT',
        json: { coinToBirrRate: rate },
      })
      setMsg({ kind: 'ok', text: 'Exchange rate saved successfully.' })
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium mb-2">Coin-to-Birr exchange rate</Label>
        <Input
          type="number"
          min={1}
          max={10000}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value) || 1)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {rate} coins = 1 Birr. Users can redeem coins at this rate.
        </p>
      </div>
      <Separator />
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Coin reward rules (code-level defaults)
        </h3>
        <p className="text-xs text-muted-foreground">
          Client posts a job: <strong>10 coins</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Freelancer gets awarded a job: <strong>15 coins</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Seller sells a product: <strong>10 coins</strong>
        </p>
      </div>
      {msg && (
        <p className={`text-sm ${msg.kind === 'ok' ? 'text-primary' : 'text-destructive'}`}>
          {msg.text}
        </p>
      )}
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save exchange rate'}
        </Button>
      </div>
    </div>
  )
}

function JobGatesSection() {
  const [settings, setSettings] = useState({
    minWalletBalance: 100,
    maxOpenJobs: 10,
    maxPerDay: 5,
    requireIdVerification: true,
    minProfileComplete: 60,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    apiFetch<typeof settings>('/admin/settings/job-gates')
      .then(setSettings)
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const updated = await apiFetch<typeof settings>('/admin/settings/job-gates', {
        method: 'PUT',
        json: settings,
      })
      setSettings(updated)
      setMsg({ kind: 'ok', text: 'Job gate settings saved.' })
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border bg-muted/40 px-3 py-2">
        These gates prevent unverified or unfunded clients from publishing jobs to the public feed.
      </p>
      <div>
        <Label className="block text-sm font-medium mb-2">Minimum wallet balance (Br)</Label>
        <Input
          type="number"
          min={0}
          value={settings.minWalletBalance}
          onChange={(e) => setSettings((s) => ({ ...s, minWalletBalance: Number(e.target.value) || 0 }))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Client must have at least this amount in their wallet (or the job budget, whichever is higher).
        </p>
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Max open jobs per client</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={settings.maxOpenJobs}
          onChange={(e) => setSettings((s) => ({ ...s, maxOpenJobs: Number(e.target.value) || 1 }))}
        />
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Max new jobs per day</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={settings.maxPerDay}
          onChange={(e) => setSettings((s) => ({ ...s, maxPerDay: Number(e.target.value) || 1 }))}
        />
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Minimum profile completeness (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={settings.minProfileComplete}
          onChange={(e) => setSettings((s) => ({ ...s, minProfileComplete: Number(e.target.value) || 0 }))}
        />
      </div>
      <Separator />
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Require ID verification</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clients must have approved ID verification before publishing jobs.
          </p>
        </div>
        <Switch
          checked={settings.requireIdVerification}
          onCheckedChange={(v) => setSettings((s) => ({ ...s, requireIdVerification: v }))}
        />
      </div>
      {msg && (
        <p className={`text-sm ${msg.kind === 'ok' ? 'text-primary' : 'text-destructive'}`}>
          {msg.text}
        </p>
      )}
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save job gate settings'}
        </Button>
      </div>
    </div>
  )
}

function PaymentSection() {
  return (
    <div className="space-y-4">
      <PreviewBanner />
      <div>
        <Label className="block text-sm font-medium mb-2">Escrow hold period (days)</Label>
        <Input type="number" min={0} placeholder="7" defaultValue="7" />
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Withdrawal minimum (Br)</Label>
        <Input type="number" min={0} placeholder="200" defaultValue="200" />
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Wallet top-up minimum (Br)</Label>
        <Input type="number" min={0} placeholder="50" defaultValue="50" />
      </div>
      <div>
        <Label className="block text-sm font-medium mb-2">Service order fee (%)</Label>
        <Input type="number" min={0} max={100} placeholder="5" defaultValue="5" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="button" disabled title="Connect settings API when ready">
          <Save className="w-4 h-4" /> Save payment settings
        </Button>
      </div>
    </div>
  )
}

function SecuritySection() {
  return (
    <div className="space-y-5">
      <PreviewBanner />
      <ToggleRow
        label="Require email verification for new signups"
        description="Block dashboard access until users verify their email."
        defaultChecked
      />
      <ToggleRow
        label="Require ID verification for freelancers"
        description="Hide freelancer profiles publicly until ID is approved."
      />
      <ToggleRow
        label="Enforce strong passwords"
        description="Minimum 8 characters with letters and numbers."
        defaultChecked
      />
      <ToggleRow
        label="Auto sign-out idle admins"
        description="Sign administrators out after 30 minutes of inactivity."
      />
      <div className="flex justify-end pt-2">
        <Button type="button" disabled title="Connect settings API when ready">
          <Save className="w-4 h-4" /> Save security settings
        </Button>
      </div>
    </div>
  )
}

function ProfileSection() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setProfileSaving(true)
    try {
      await updateProfile({ name: name.trim(), username: username.trim() || null })
      setProfileMsg({ kind: 'ok', text: 'Profile updated successfully.' })
    } catch (err) {
      setProfileMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Could not update profile.',
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword.length < 6) {
      setPwMsg({ kind: 'err', text: 'New password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ kind: 'err', text: 'New password and confirmation do not match.' })
      return
    }
    setPwSaving(true)
    try {
      await apiFetch('/users/change-password', {
        method: 'POST',
        json: { currentPassword, newPassword },
      })
      setPwMsg({ kind: 'ok', text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Could not change password.',
      })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submitProfile} className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Account details
        </h3>
        <div>
          <Label className="block text-sm font-medium mb-2">Display name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Administrator"
            required
          />
        </div>
        <div>
          <Label className="block text-sm font-medium mb-2">Username</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
          />
          <p className="text-xs text-muted-foreground mt-1">Optional. Shown in mentions and profile URLs.</p>
        </div>
        <div>
          <Label className="block text-sm font-medium mb-2">Email</Label>
          <Input value={user?.email || ''} readOnly disabled />
          <p className="text-xs text-muted-foreground mt-1">
            Email is fixed for the administrator account. Update via environment configuration if needed.
          </p>
        </div>
        {profileMsg && (
          <p className={`text-sm ${profileMsg.kind === 'ok' ? 'text-primary' : 'text-destructive'}`}>
            {profileMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={profileSaving}>
            <Save className="w-4 h-4" /> {profileSaving ? 'Saving...' : 'Save profile'}
          </Button>
        </div>
      </form>

      <Separator />

      <form onSubmit={submitPassword} className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Change password
        </h3>
        <div>
          <Label className="block text-sm font-medium mb-2">Current password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium mb-2">New password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground mt-1">At least 6 characters.</p>
        </div>
        <div>
          <Label className="block text-sm font-medium mb-2">Confirm new password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        {pwMsg && (
          <p className={`text-sm ${pwMsg.kind === 'ok' ? 'text-primary' : 'text-destructive'}`}>
            {pwMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}>
            <KeyRound className="w-4 h-4" /> {pwSaving ? 'Updating...' : 'Update password'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function NotificationSection() {
  return (
    <div className="space-y-5">
      <PreviewBanner />
      <ToggleRow
        label="Email me on new disputes"
        description="Receive an email whenever a user opens a dispute."
        defaultChecked
      />
      <ToggleRow
        label="Email me on new signups"
        description="Get a daily digest of new accounts."
      />
      <ToggleRow
        label="Email me on large payments"
        description="Notify on transactions above 10,000 Br."
        defaultChecked
      />
      <ToggleRow
        label="Play sound for in-app notifications"
        description="Plays a soft chime when a new alert arrives."
      />
      <div className="flex justify-end pt-2">
        <Button type="button" disabled title="Connect settings API when ready">
          <Save className="w-4 h-4" /> Save notification preferences
        </Button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  defaultChecked = false,
}: {
  label: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}
