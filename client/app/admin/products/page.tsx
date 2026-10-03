'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { apiFetch } from '@/lib/api'
import {
  Search,
  Briefcase,
  Wrench,
  ShoppingBag,
  RefreshCcw,
  Loader2,
  AlertCircle,
  CalendarDays,
  Clock,
  MessageSquare,
  Star,
  Tag,
  User,
  ExternalLink,
  Paperclip,
  Ban,
  XCircle,
} from 'lucide-react'

type AdminJob = {
  id: string
  title: string
  description: string
  category: string
  budgetType: string
  budget: number
  hourlyRate: number
  jobType: string
  deadline: string | null
  duration: string | null
  skills: string[]
  visibility: string
  freelancersNeeded: number
  experienceLevel: string
  attachments: Array<{ name: string; size?: number }>
  status: string
  clientId: string
  clientName: string
  proposalsCount: number
  selectedFreelancerId: string | null
  selectedFreelancerName: string | null
  createdAt: string
  updatedAt: string
}

type AdminService = {
  id: string
  freelancerId: string
  freelancerName: string
  freelancerRating: number
  freelancerBio: string
  freelancerCompletedProjects: number
  freelancerLocation: string
  title: string
  description: string
  category: string
  priceMin: number
  priceMax: number
  deliveryDays: number
  imageUrl: string | null
  tags: string[]
  status: string
  createdAt: string
}

type AdminProduct = {
  id: string
  creatorId: string
  creatorName: string
  title: string
  description: string
  category: string
  price: number
  imageUrl: string | null
  images: string[]
  status: string
  downloadsCount: number
  rating: number
  salesCount: number
  createdAt: string
}

type ListingsResponse = {
  jobs: AdminJob[]
  services: AdminService[]
  products: AdminProduct[]
}

type SelectedListing =
  | { kind: 'job'; data: AdminJob }
  | { kind: 'service'; data: AdminService }
  | { kind: 'product'; data: AdminProduct }
  | null

function statusBadge(status: string) {
  const norm = (status || '').toLowerCase()
  switch (norm) {
    case 'open':
    case 'active':
      return 'bg-primary/10 text-primary'
    case 'in-progress':
    case 'in_progress':
    case 'reviewing':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-primary/15 text-primary'
    case 'closed':
    case 'archived':
    case 'paused':
    case 'inactive':
      return 'bg-secondary text-secondary-foreground'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

function formatBr(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function kindMeta(kind: 'job' | 'service' | 'product') {
  switch (kind) {
    case 'job':
      return {
        label: 'Job',
        Icon: Briefcase,
        color: 'bg-blue-100 text-blue-700',
        dot: 'text-blue-600',
      }
    case 'service':
      return {
        label: 'Service',
        Icon: Wrench,
        color: 'bg-teal-100 text-teal-700',
        dot: 'text-teal-600',
      }
    case 'product':
      return {
        label: 'Product',
        Icon: ShoppingBag,
        color: 'bg-purple-100 text-purple-700',
        dot: 'text-purple-600',
      }
  }
}

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground col-span-1">{label}</span>
      <span className={`col-span-2 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value || '—'}</span>
    </div>
  )
}

export default function AdminListings() {
  const router = useRouter()
  const [data, setData] = useState<ListingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SelectedListing>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<ListingsResponse>('/admin/listings')
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const q = search.trim().toLowerCase()

  const filteredJobs = useMemo(() => {
    if (!data) return []
    if (!q) return data.jobs
    return data.jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.category?.toLowerCase().includes(q) ||
        j.clientName?.toLowerCase().includes(q) ||
        j.status.toLowerCase().includes(q)
    )
  }, [data, q])

  const filteredServices = useMemo(() => {
    if (!data) return []
    if (!q) return data.services
    return data.services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.freelancerName?.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    )
  }, [data, q])

  const filteredProducts = useMemo(() => {
    if (!data) return []
    if (!q) return data.products
    return data.products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.creatorName?.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
    )
  }, [data, q])

  const counts = {
    jobs: data?.jobs.length ?? 0,
    services: data?.services.length ?? 0,
    products: data?.products.length ?? 0,
  }

  const messageAuthor = (userId: string) => {
    router.push(`/admin/messages?peer=${encodeURIComponent(userId)}`)
  }

  const renderSelectedDetails = (sel: NonNullable<SelectedListing>) => {
    const meta = kindMeta(sel.kind)
    const { Icon } = meta

    if (sel.kind === 'job') {
      const j = sel.data
      return (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={`border-0 ${meta.color}`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {meta.label}
                  </Badge>
                  <Badge className={`border-0 capitalize ${statusBadge(j.status)}`}>{j.status}</Badge>
                  {j.visibility && (
                    <Badge variant="secondary" className="font-normal capitalize">
                      {j.visibility}
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-bold leading-tight">{j.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Posted by <span className="font-medium text-foreground">{j.clientName || 'Client'}</span>
                </p>
              </div>
            </div>
            {j.description && (
              <p className="text-sm mt-4 whitespace-pre-wrap text-muted-foreground">{j.description}</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-2">
              Job details
            </h3>
            <div className="divide-y divide-border">
              <FieldRow label="Category" value={j.category || 'Uncategorised'} />
              <FieldRow
                label="Budget"
                value={
                  j.budgetType === 'hourly'
                    ? `Br ${formatBr(j.hourlyRate)} / hour`
                    : `Br ${formatBr(j.budget)} (${j.budgetType || 'fixed'})`
                }
              />
              <FieldRow label="Job type" value={j.jobType || '—'} />
              <FieldRow label="Experience level" value={j.experienceLevel || '—'} />
              <FieldRow label="Freelancers needed" value={formatBr(j.freelancersNeeded || 1)} />
              <FieldRow label="Duration" value={j.duration || '—'} />
              <FieldRow label="Deadline" value={j.deadline ? new Date(j.deadline).toLocaleDateString() : '—'} />
              <FieldRow label="Proposals received" value={formatBr(j.proposalsCount)} />
              <FieldRow
                label="Selected freelancer"
                value={j.selectedFreelancerName ? j.selectedFreelancerName : '—'}
              />
              <FieldRow
                label="Posted"
                value={
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(j.createdAt).toLocaleString()}
                  </span>
                }
              />
              <FieldRow
                label="Last update"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(j.updatedAt).toLocaleString()}
                  </span>
                }
              />
              <FieldRow label="Job ID" value={j.id} mono />
            </div>
          </Card>

          {j.skills.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-3">Required skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {j.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {j.attachments.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-2">Attachments</h3>
              <ul className="text-sm space-y-1">
                {j.attachments.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex items-center gap-2 text-muted-foreground">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="truncate">{a.name}</span>
                    {typeof a.size === 'number' && (
                      <span className="text-xs">({Math.round(a.size / 1024)} KB)</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-3">Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => messageAuthor(j.clientId)}>
                <MessageSquare className="w-4 h-4" />
                Message client
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/users')}>
                <User className="w-4 h-4" />
                View client in users
              </Button>
              {j.status === 'open' && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await apiFetch(`/admin/jobs/${j.id}/close`, { method: 'POST' })
                      setSelected(null)
                      void load()
                    } catch (e) {
                      alert(e instanceof Error ? e.message : 'Failed to close job')
                    }
                  }}
                >
                  <XCircle className="w-4 h-4" />
                  Close this job
                </Button>
              )}
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  if (!confirm(`Suspend the client who posted "${j.title}"?`)) return
                  try {
                    await apiFetch(`/admin/users/${j.clientId}/suspend`, { method: 'POST', json: { suspend: true } })
                    setSelected(null)
                    void load()
                  } catch (e) {
                    alert(e instanceof Error ? e.message : 'Failed to suspend user')
                  }
                }}
              >
                <Ban className="w-4 h-4" />
                Suspend client
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    if (sel.kind === 'service') {
      const s = sel.data
      return (
        <div className="space-y-4">
          {s.imageUrl && (
            <Card className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageUrl} alt={s.title} className="w-full max-h-64 object-cover" />
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={`border-0 ${meta.color}`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {meta.label}
                  </Badge>
                  <Badge className={`border-0 capitalize ${statusBadge(s.status)}`}>{s.status}</Badge>
                </div>
                <h2 className="text-xl font-bold leading-tight">{s.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Offered by <span className="font-medium text-foreground">{s.freelancerName}</span>
                </p>
              </div>
            </div>
            {s.description && (
              <p className="text-sm mt-4 whitespace-pre-wrap text-muted-foreground">{s.description}</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-2">Service details</h3>
            <div className="divide-y divide-border">
              <FieldRow label="Category" value={s.category || 'Uncategorised'} />
              <FieldRow label="Price range" value={`Br ${formatBr(s.priceMin)} – ${formatBr(s.priceMax)}`} />
              <FieldRow label="Delivery time" value={`${s.deliveryDays} days`} />
              <FieldRow
                label="Posted"
                value={
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                }
              />
              <FieldRow label="Service ID" value={s.id} mono />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-3">Freelancer profile</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{s.freelancerName}</p>
              {s.freelancerBio && <p className="text-muted-foreground">{s.freelancerBio}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {s.freelancerRating.toFixed(1)} rating
                </span>
                <span>· {s.freelancerCompletedProjects} projects</span>
                {s.freelancerLocation && <span>· {s.freelancerLocation}</span>}
              </div>
            </div>
          </Card>

          {s.tags.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-3">Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => messageAuthor(s.freelancerId)}>
                <MessageSquare className="w-4 h-4" />
                Message freelancer
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/users')}>
                <User className="w-4 h-4" />
                View freelancer in users
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    const p = sel.data
    return (
      <div className="space-y-4">
        {p.imageUrl && (
          <Card className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt={p.title} className="w-full max-h-64 object-cover" />
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={`border-0 ${meta.color}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {meta.label}
                </Badge>
                <Badge className={`border-0 capitalize ${statusBadge(p.status)}`}>{p.status}</Badge>
              </div>
              <h2 className="text-xl font-bold leading-tight">{p.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Created by <span className="font-medium text-foreground">{p.creatorName}</span>
              </p>
            </div>
          </div>
          {p.description && (
            <p className="text-sm mt-4 whitespace-pre-wrap text-muted-foreground">{p.description}</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-2">Product details</h3>
          <div className="divide-y divide-border">
            <FieldRow label="Category" value={p.category || 'Uncategorised'} />
            <FieldRow label="Price" value={`Br ${formatBr(p.price)}`} />
            <FieldRow label="Sales" value={formatBr(p.salesCount)} />
            <FieldRow label="Downloads" value={formatBr(p.downloadsCount)} />
            <FieldRow
              label="Rating"
              value={
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  {p.rating.toFixed(1)}
                </span>
              }
            />
            <FieldRow
              label="Posted"
              value={
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  {new Date(p.createdAt).toLocaleString()}
                </span>
              }
            />
            <FieldRow label="Product ID" value={p.id} mono />
          </div>
        </Card>

        {p.images.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-3">Gallery</h3>
            <div className="grid grid-cols-3 gap-2">
              {p.images.slice(0, 9).map((img, i) => (
                <a
                  key={`${img}-${i}`}
                  href={img}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded overflow-hidden border border-border bg-muted/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-24 object-cover" />
                </a>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-3">Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => messageAuthor(p.creatorId)}>
              <MessageSquare className="w-4 h-4" />
              Message creator
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/users')}>
              <User className="w-4 h-4" />
              View creator in users
            </Button>
            {p.imageUrl && (
              <Button variant="outline" asChild>
                <a href={p.imageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  Open cover image
                </a>
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Listings</h1>
          <p className="text-muted-foreground">
            Every job, service offering and digital product posted on the platform. Click any row to view full
            details.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, category, author or status..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {error && (
        <Card className="mb-4 p-4 border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </Card>
      )}

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="jobs">
            <Briefcase className="w-3.5 h-3.5" />
            Jobs ({counts.jobs})
          </TabsTrigger>
          <TabsTrigger value="services">
            <Wrench className="w-3.5 h-3.5" />
            Services ({counts.services})
          </TabsTrigger>
          <TabsTrigger value="products">
            <ShoppingBag className="w-3.5 h-3.5" />
            Products ({counts.products})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Posted by</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Budget</th>
                    <th className="px-4 py-3 font-semibold">Proposals</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && !data && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Loading jobs…
                      </td>
                    </tr>
                  )}
                  {!loading && filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No jobs match your filter.
                      </td>
                    </tr>
                  )}
                  {filteredJobs.map((j) => (
                    <tr
                      key={j.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected({ kind: 'job', data: j })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelected({ kind: 'job', data: j })
                        }
                      }}
                      className="hover:bg-secondary/40 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium max-w-xs truncate">{j.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{j.clientName || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-normal">
                          {j.category || 'Uncategorised'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {j.budgetType === 'hourly'
                          ? `Br ${formatBr(j.hourlyRate)}/hr`
                          : `Br ${formatBr(j.budget)}`}
                      </td>
                      <td className="px-4 py-3">{j.proposalsCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${statusBadge(j.status)}`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(j.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Freelancer</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Price range</th>
                    <th className="px-4 py-3 font-semibold">Delivery</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && !data && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Loading services…
                      </td>
                    </tr>
                  )}
                  {!loading && filteredServices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No services match your filter.
                      </td>
                    </tr>
                  )}
                  {filteredServices.map((s) => (
                    <tr
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected({ kind: 'service', data: s })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelected({ kind: 'service', data: s })
                        }
                      }}
                      className="hover:bg-secondary/40 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium max-w-xs truncate">{s.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.freelancerName || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-normal">
                          {s.category || 'Uncategorised'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        Br {formatBr(s.priceMin)} – {formatBr(s.priceMax)}
                      </td>
                      <td className="px-4 py-3">{s.deliveryDays} days</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${statusBadge(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Creator</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Sales</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && !data && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Loading products…
                      </td>
                    </tr>
                  )}
                  {!loading && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No products match your filter.
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected({ kind: 'product', data: p })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelected({ kind: 'product', data: p })
                        }
                      }}
                      className="hover:bg-secondary/40 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium max-w-xs truncate">{p.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.creatorName || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-normal">
                          {p.category || 'Uncategorised'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">Br {formatBr(p.price)}</td>
                      <td className="px-4 py-3">{p.salesCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${statusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Listing details</SheetTitle>
            <SheetDescription>
              Full posting details and admin actions for the selected listing.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">{selected && renderSelectedDetails(selected)}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
