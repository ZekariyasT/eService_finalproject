'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { isSuperAdmin } from '@/lib/admin-auth'
import {
  Trash2,
  Ban,
  CheckCircle,
  Coins,
  Plus,
  Minus,
  Search,
  ShieldCheck,
  ShieldX,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Briefcase,
  Star,
  IdCard,
  ExternalLink,
  User as UserIcon,
} from 'lucide-react'
import Link from 'next/link'

type AdminUser = {
  id: string
  email: string
  name: string
  username?: string
  role: string
  verified: boolean
  isActive?: boolean
  createdAt: string
  coins?: number
  phone?: string
  location?: string
  company?: string
  industry?: string
  bio?: string
  shortBio?: string
  skills?: string[]
  hourlyRate?: number
  rating?: number
  completedProjects?: number
  earnings?: number
  nationalId?: string
  idFrontImageUrl?: string
  idBackImageUrl?: string
  profilePictureUrl?: string
  verificationStatus?: 'pending' | 'submitted' | 'approved' | 'rejected'
  paidVerificationBadge?: boolean
  socialLinks?: Record<string, string>
}

type CoinMode = 'add' | 'remove'

const ROLE_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All roles', value: 'all' },
  { label: 'Client', value: 'client' },
  { label: 'Freelancer', value: 'freelancer' },
  { label: 'Seller', value: 'seller' },
  { label: 'Admin', value: 'admin' },
  { label: 'Super Admin', value: 'super-admin' },
]

function roleColors(role: string) {
  switch (role) {
    case 'super-admin':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
    case 'admin':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
    case 'freelancer':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
    case 'seller':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
    case 'client':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

function verificationColors(status?: string) {
  switch (status) {
    case 'approved':
      return 'bg-primary/10 text-primary'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    case 'submitted':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return <>{initials || '?'}</>
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const superAdmin = isSuperAdmin(user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [coinTarget, setCoinTarget] = useState<AdminUser | null>(null)
  const [coinMode, setCoinMode] = useState<CoinMode>('add')
  const [coinAmount, setCoinAmount] = useState('')
  const [coinReason, setCoinReason] = useState('admin-reward')
  const [coinError, setCoinError] = useState<string | null>(null)
  const [coinSubmitting, setCoinSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiFetch<{ users: AdminUser[] }>('/admin/users')
      setUsers(res.users)
      setSelected((curr) => (curr ? res.users.find((u) => u.id === curr.id) ?? null : curr))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (!q) return true
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      )
    })
  }, [users, search, roleFilter])

  const closeSheet = () => {
    setSelected(null)
    setActionError(null)
  }

  const toggleSuspend = async (target: AdminUser) => {
    if (!superAdmin) return
    const currentlyActive = target.isActive !== false
    setBusyId(target.id)
    setActionError(null)
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        json: { isActive: !currentlyActive },
      })
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update user')
    } finally {
      setBusyId(null)
    }
  }

  const removeUser = async (target: AdminUser) => {
    if (!superAdmin) return
    if (!window.confirm(`Permanently delete user ${target.email}? This cannot be undone.`)) return
    setBusyId(target.id)
    setActionError(null)
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(target.id)}`, { method: 'DELETE' })
      setSelected(null)
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const setVerification = async (target: AdminUser, approved: boolean) => {
    setBusyId(target.id)
    setActionError(null)
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(target.id)}/verification`, {
        method: 'POST',
        json: { approved },
      })
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update verification')
    } finally {
      setBusyId(null)
    }
  }

  const messageUser = (target: AdminUser) => {
    router.push(`/admin/messages?peer=${encodeURIComponent(target.id)}`)
  }

  const openCoinDialog = (target: AdminUser) => {
    if (!superAdmin) return
    setCoinTarget(target)
    setCoinMode('add')
    setCoinAmount('')
    setCoinReason('admin-reward')
    setCoinError(null)
  }

  const closeCoinDialog = () => {
    if (coinSubmitting) return
    setCoinTarget(null)
    setCoinError(null)
  }

  const submitCoinAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coinTarget || !superAdmin) return

    const parsed = Number(coinAmount)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setCoinError('Amount must be a whole number greater than zero.')
      return
    }

    const signed = coinMode === 'add' ? parsed : -parsed
    const reason = coinReason.trim() || 'admin-reward'

    setCoinError(null)
    setCoinSubmitting(true)
    setBusyId(coinTarget.id)
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(coinTarget.id)}/coins`, {
        method: 'POST',
        json: { amount: signed, reason },
      })
      await load()
      setCoinTarget(null)
    } catch (err) {
      setCoinError(err instanceof Error ? err.message : 'Failed to adjust coins')
    } finally {
      setCoinSubmitting(false)
      setBusyId(null)
    }
  }

  const renderDetailCard = (u: AdminUser) => {
    const active = u.isActive !== false
    const isSelf = u.id === user?.id
    const socialEntries = Object.entries(u.socialLinks || {}).filter(([, v]) => v)
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/15 text-primary flex items-center justify-center text-xl font-semibold shrink-0">
              {u.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.profilePictureUrl} alt={u.name} className="w-full h-full object-cover" />
              ) : (
                <Initials name={u.name} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold truncate">{u.name}</h2>
                {u.verified && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <Badge className={`border-0 capitalize ${roleColors(u.role)}`}>{u.role}</Badge>
                <Badge
                  className={`border-0 ${
                    active ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {active ? 'Active' : 'Suspended'}
                </Badge>
              </div>
              {u.username && <p className="text-sm text-muted-foreground mt-1">@{u.username}</p>}
              {u.shortBio && <p className="text-sm mt-2">{u.shortBio}</p>}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Account info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{u.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{u.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{u.location || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{new Date(u.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-600 shrink-0" />
              <span>
                <strong>{u.coins ?? 0}</strong> coins
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-muted-foreground shrink-0" />
              <Badge className={`border-0 capitalize ${verificationColors(u.verificationStatus)}`}>
                {u.verificationStatus || 'pending'}
              </Badge>
            </div>
          </div>
        </Card>

        {(u.role === 'freelancer' || u.role === 'client' || u.bio) && (
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
              {u.role === 'freelancer' ? 'Freelancer profile' : u.role === 'client' ? 'Client profile' : 'Profile'}
            </h3>

            {u.role === 'freelancer' && (
              <div className="space-y-3 text-sm">
                {u.bio && <p className="text-muted-foreground">{u.bio}</p>}
                {u.skills && u.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {u.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Hourly rate</p>
                    <p className="font-semibold">${u.hourlyRate ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Rating
                    </p>
                    <p className="font-semibold">{(u.rating ?? 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      Projects
                    </p>
                    <p className="font-semibold">{u.completedProjects ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Earnings</p>
                    <p className="font-semibold">${u.earnings ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {u.role === 'client' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p>{u.company || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Industry</p>
                  <p>{u.industry || '—'}</p>
                </div>
              </div>
            )}

            {socialEntries.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5">Social</p>
                <div className="flex flex-wrap gap-2">
                  {socialEntries.map(([k, v]) => (
                    <a
                      key={k}
                      href={v}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-secondary/80"
                    >
                      {k}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {(u.nationalId || u.idFrontImageUrl || u.idBackImageUrl) && (
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Identity</h3>
            {u.nationalId && (
              <p className="text-sm">
                <span className="text-muted-foreground">National ID: </span>
                <span className="font-mono">{u.nationalId}</span>
              </p>
            )}
            {(u.idFrontImageUrl || u.idBackImageUrl) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {u.idFrontImageUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID front</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.idFrontImageUrl}
                      alt="ID front"
                      className="w-full rounded border border-border object-cover max-h-48"
                    />
                  </div>
                )}
                {u.idBackImageUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID back</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.idBackImageUrl}
                      alt="ID back"
                      className="w-full rounded border border-border object-cover max-h-48"
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {actionError && (
          <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded">{actionError}</p>
        )}

        <Card className="p-6 space-y-3">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => messageUser(u)} disabled={isSelf}>
              <MessageSquare className="w-4 h-4" />
              Message user
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/profile/${encodeURIComponent(u.id)}`}>
                <UserIcon className="w-4 h-4" />
                View profile
              </Link>
            </Button>
            {superAdmin && (
              <Button variant="outline" onClick={() => openCoinDialog(u)} disabled={busyId === u.id}>
                <Coins className="w-4 h-4 text-yellow-600" />
                Adjust coins
              </Button>
            )}
            <Button
              variant="outline"
              className="text-primary hover:text-primary/90"
              onClick={() => void setVerification(u, true)}
              disabled={busyId === u.id || u.verificationStatus === 'approved'}
            >
              <ShieldCheck className="w-4 h-4" />
              Approve verification
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => void setVerification(u, false)}
              disabled={busyId === u.id || u.verificationStatus === 'rejected'}
            >
              <ShieldX className="w-4 h-4" />
              Reject verification
            </Button>
            {superAdmin && (
              <>
                <Button
                  variant="outline"
                  className="text-orange-600 hover:text-orange-700"
                  onClick={() => void toggleSuspend(u)}
                  disabled={busyId === u.id || isSelf}
                >
                  {active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {active ? 'Suspend user' : 'Reactivate user'}
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive/80"
                  onClick={() => void removeUser(u)}
                  disabled={busyId === u.id || isSelf}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete user
                </Button>
              </>
            )}
          </div>
          {isSelf && (
            <p className="text-xs text-muted-foreground">You cannot suspend or delete your own account.</p>
          )}
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <p className="text-muted-foreground">
            Click any user to view full details and take action.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </p>
      </div>

      <Card className="p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, username, role..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">User</th>
                <th className="px-6 py-4 text-left font-semibold">Role</th>
                <th className="px-6 py-4 text-left font-semibold">Coins</th>
                <th className="px-6 py-4 text-left font-semibold">Verification</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No users match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
                const active = u.isActive !== false
                return (
                  <tr
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${u.name}`}
                    onClick={() => setSelected(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(u)
                      }
                    }}
                    className="hover:bg-secondary/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                          {u.profilePictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.profilePictureUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <Initials name={u.name} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full capitalize ${roleColors(u.role)}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">{u.coins ?? 0}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full capitalize ${verificationColors(
                          u.verificationStatus
                        )}`}
                      >
                        {u.verificationStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${
                          active ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto"
        >
          <SheetHeader className="border-b border-border">
            <SheetTitle>User details</SheetTitle>
            <SheetDescription>Full profile and admin actions for the selected account.</SheetDescription>
          </SheetHeader>
          <div className="p-4">{selected && renderDetailCard(selected)}</div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={coinTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeCoinDialog()
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-600" />
              Adjust Coin Balance
            </SheetTitle>
            <SheetDescription>
              {coinTarget ? (
                <>
                  Update coin balance for <span className="font-medium">{coinTarget.name}</span>{' '}
                  <span className="text-muted-foreground">({coinTarget.email})</span>. Current balance:{' '}
                  <span className="font-semibold">{coinTarget.coins ?? 0}</span> coins.
                </>
              ) : (
                'Update coin balance.'
              )}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={submitCoinAdjustment} className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={coinMode === 'add' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setCoinMode('add')}
              >
                <Plus className="w-4 h-4" />
                Add coins
              </Button>
              <Button
                type="button"
                variant={coinMode === 'remove' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setCoinMode('remove')}
              >
                <Minus className="w-4 h-4" />
                Remove coins
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coin-amount">Amount</Label>
              <Input
                id="coin-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="e.g. 10"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a positive whole number. The {coinMode === 'add' ? 'addition' : 'removal'} will be applied to the
                user&apos;s balance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coin-reason">Reason</Label>
              <Input
                id="coin-reason"
                type="text"
                placeholder="admin-reward"
                value={coinReason}
                onChange={(e) => setCoinReason(e.target.value)}
              />
            </div>

            {coinError && <p className="text-destructive text-sm">{coinError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeCoinDialog} disabled={coinSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={coinSubmitting}>
                {coinSubmitting ? 'Saving...' : coinMode === 'add' ? 'Add coins' : 'Remove coins'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
