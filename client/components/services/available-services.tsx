'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, Star, MapPin, MessageCircle } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ProfileModal } from '@/components/shared/profile-modal'
import { HireInvitationDialog } from '@/components/hire/hire-invitation-dialog'
import Image from 'next/image'
import { fetchServices } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type ApiService = {
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
}

type AvailableServicesProps = {
  initialFilters?: {
    q?: string
    scope?: string
    serviceCategory?: string
    maxPrice?: string
    maxDeliveryDays?: string
    minRating?: string
    location?: string
    sort?: string
    page?: string
  }
}

type SearchScope = 'all' | 'freelancer' | 'service'
type FilterIntent = 'freelancer' | 'service'
type ServiceSort = 'newest' | 'price_asc' | 'price_desc' | 'rating_desc' | 'delivery_asc'

const SERVICE_HINTS = ['service', 'services', 'design', 'development', 'seo', 'marketing', 'video', 'editing', 'web', 'app']
const FREELANCER_HINTS = ['freelancer', 'freelance', 'developer', 'designer', 'writer', 'expert', 'talent']

function inferIntent(searchTerm: string): FilterIntent {
  const q = searchTerm.toLowerCase()
  if (FREELANCER_HINTS.some((hint) => q.includes(hint))) return 'freelancer'
  if (SERVICE_HINTS.some((hint) => q.includes(hint))) return 'service'
  return 'service'
}

export function AvailableServices({ initialFilters }: AvailableServicesProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isInitializing } = useAuth()
  const canHireOrContact = isAuthenticated && !isInitializing && user?.role === 'client'
  const [selectedProfile, setSelectedProfile] = useState<{
    id: string
    name: string
    title: string
    avatar: string
    bio: string
    location: string
    rating: number
    reviews: number
    projects: number
    hourlyRate: number
    skills: string[]
    serviceId?: string
  } | null>(null)
  const [hireTarget, setHireTarget] = useState<{
    freelancerId: string
    freelancerName: string
    serviceId: string
  } | null>(null)
  const [services, setServices] = useState<ApiService[]>([])
  const [total, setTotal] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(initialFilters?.q ?? '')
  const [scope, setScope] = useState<SearchScope>(
    initialFilters?.scope === 'freelancer' || initialFilters?.scope === 'service' ? initialFilters.scope : 'all'
  )
  const [serviceCategory, setServiceCategory] = useState(initialFilters?.serviceCategory || 'all')
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice || '')
  const [maxDeliveryDays, setMaxDeliveryDays] = useState(initialFilters?.maxDeliveryDays || '')
  const [minRating, setMinRating] = useState(initialFilters?.minRating || '0')
  const [location, setLocation] = useState(initialFilters?.location || '')
  const [sort, setSort] = useState<ServiceSort>(
    initialFilters?.sort === 'price_asc' ||
      initialFilters?.sort === 'price_desc' ||
      initialFilters?.sort === 'rating_desc' ||
      initialFilters?.sort === 'delivery_asc'
      ? initialFilters.sort
      : 'newest'
  )
  const [page, setPage] = useState(() => {
    const parsed = Number(initialFilters?.page ?? '1')
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
  })
  const PAGE_SIZE = 12

  const avatarUrl = (name: string) =>
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`

  useEffect(() => {
    setPage(1)
  }, [searchTerm, scope, serviceCategory, maxPrice, maxDeliveryDays, minRating, location, sort])

  /**
   * If we landed here with a search query already in the URL (e.g. from the
   * home hero search) make sure the listings — not the page hero — are what
   * the visitor sees first. The URL-sync effect below strips the `#hash`
   * fragment, so we cannot rely on the browser's native anchor jump alone.
   */
  useEffect(() => {
    const arrivedFromSearch =
      Boolean(initialFilters?.q?.trim()) ||
      (typeof window !== 'undefined' && window.location.hash === '#available-services')
    if (!arrivedFromSearch) return
    const target = document.getElementById('available-services')
    if (!target) return
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    // intentionally run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    const q = searchTerm.trim()
    if (q) params.set('q', q)
    if (scope !== 'all') params.set('scope', scope)
    if (serviceCategory !== 'all') params.set('serviceCategory', serviceCategory)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (maxDeliveryDays) params.set('maxDeliveryDays', maxDeliveryDays)
    if (minRating && minRating !== '0') params.set('minRating', minRating)
    if (location.trim()) params.set('location', location.trim())
    if (sort !== 'newest') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))
    const target = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(target, { scroll: false })
  }, [searchTerm, scope, serviceCategory, maxPrice, maxDeliveryDays, minRating, location, sort, page, pathname, router])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fetchServices<{ services: ApiService[]; total: number; page: number; limit: number }>({
      q: searchTerm,
      scope,
      serviceCategory: serviceCategory === 'all' ? '' : serviceCategory,
      maxPrice,
      maxDeliveryDays,
      minRating: minRating === '0' ? '' : minRating,
      location,
      sort,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        setServices(res.services)
        setTotal(res.total)
      })
      .catch((e) => {
        if (!cancelled) {
          setServices([])
          setTotal(0)
          setLoadError(e instanceof Error ? e.message : 'Failed to load services')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [searchTerm, scope, serviceCategory, maxPrice, maxDeliveryDays, minRating, location, sort, page])

  const normalizedQuery = searchTerm.trim().toLowerCase()
  const categories = useMemo(() => {
    const distinct = new Set(services.map((service) => service.category).filter(Boolean))
    return ['all', ...Array.from(distinct).sort((a, b) => a.localeCompare(b))]
  }, [services])
  const activeIntent: FilterIntent = scope === 'all' ? inferIntent(normalizedQuery) : scope

  useEffect(() => {
    if (!categories.includes(serviceCategory)) {
      setServiceCategory('all')
    }
  }, [categories, serviceCategory])

  const visibleServices = useMemo(() => services, [services])

  return (
    <section id="available-services" className="scroll-mt-24 py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Find the right expertise for your projects</h2>
          <p className="text-xl text-muted-foreground">Search experts and services with backend-powered filters</p>
        </div>

        <div className="mb-8 flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-center">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search freelancers, skills, or services..."
            className="h-11 w-full md:w-[360px]"
          />
          <Select value={scope} onValueChange={(value) => setScope(value as SearchScope)}>
            <SelectTrigger className="h-11 w-full md:w-[220px]" aria-label="Search scope">
              <SelectValue placeholder="All results" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All results</SelectItem>
              <SelectItem value="freelancer">Expertise</SelectItem>
              <SelectItem value="service">Projects</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as ServiceSort)}>
            <SelectTrigger className="h-11 w-full md:w-[220px]" aria-label="Sort results">
              <SelectValue placeholder="Newest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating_desc">Top rated</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="delivery_asc">Fastest delivery</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 cursor-pointer">
                <Filter className="mr-2 h-4 w-4" />
                More filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{activeIntent === 'service' ? 'Project filters' : 'Expertise filters'}</SheetTitle>
                <SheetDescription>
                  Filters adapt based on your search intent ({activeIntent === 'service' ? 'projects' : 'expertise'}).
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4">
                {activeIntent === 'service' ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="service-category-filter">Project category</Label>
                      <Select value={serviceCategory} onValueChange={setServiceCategory}>
                        <SelectTrigger id="service-category-filter" className="w-full">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item === 'all' ? 'All categories' : item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="max-price-filter">Maximum price (Br/hr)</Label>
                      <Input
                        id="max-price-filter"
                        type="number"
                        min={0}
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value)}
                        placeholder="e.g. 2000"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="max-delivery-filter">Maximum delivery days</Label>
                      <Input
                        id="max-delivery-filter"
                        type="number"
                        min={1}
                        value={maxDeliveryDays}
                        onChange={(event) => setMaxDeliveryDays(event.target.value)}
                        placeholder="e.g. 14"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="min-rating-filter">Minimum rating</Label>
                      <Select value={minRating} onValueChange={setMinRating}>
                        <SelectTrigger id="min-rating-filter" className="w-full">
                          <SelectValue placeholder="Any rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any rating</SelectItem>
                          <SelectItem value="3">3.0+</SelectItem>
                          <SelectItem value="3.5">3.5+</SelectItem>
                          <SelectItem value="4">4.0+</SelectItem>
                          <SelectItem value="4.5">4.5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location-filter">Location contains</Label>
                      <Input
                        id="location-filter"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        placeholder="e.g. Addis Ababa"
                      />
                    </div>
                  </>
                )}
              </div>
              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setServiceCategory('all')
                    setMaxPrice('')
                    setMaxDeliveryDays('')
                    setMinRating('0')
                    setLocation('')
                  }}
                >
                  Reset sheet filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Button
            variant="outline"
            className="h-11 cursor-pointer"
            onClick={() => {
              setSearchTerm('')
              setScope('all')
              setServiceCategory('all')
              setMaxPrice('')
              setMaxDeliveryDays('')
              setMinRating('0')
              setLocation('')
              setSort('newest')
              setPage(1)
            }}
          >
            Clear filters
          </Button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Showing {visibleServices.length} of {total} results
        </p>

        {loading && <p className="text-center text-muted-foreground">Loading services…</p>}
        {loadError && (
          <p className="text-center text-destructive text-sm mb-6">
            {loadError} — start the API server and MySQL, or check NEXT_PUBLIC_API_URL.
          </p>
        )}

        {!loading && !loadError && visibleServices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {normalizedQuery ? `No results match "${searchTerm.trim()}".` : 'No results available yet.'}
          </p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleServices.map((service) => {
            const img = service.imageUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop'
            const completed = service.freelancerCompletedProjects ?? 0
            const priceLabel = `Br ${service.priceMin}–${service.priceMax}/hr`

            if (activeIntent === 'freelancer') {
              const skills = service.tags.length ? service.tags : [service.category]
              return (
                <div
                  key={service.freelancerId}
                  className="border border-teal-200/70 rounded-xl bg-teal-50/30 p-6 hover:shadow-lg transition-shadow flex flex-col"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <Image
                      src={avatarUrl(service.freelancerName)}
                      alt={service.freelancerName}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full ring-2 ring-teal-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate">{service.freelancerName}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{service.freelancerRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">· {completed} projects</span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {service.freelancerLocation || 'Ethiopia'}
                      </p>
                    </div>
                  </div>

                  {service.freelancerBio ? (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{service.freelancerBio}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {skills.map((tag) => (
                      <span key={tag} className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between mb-4">
                    <span className="text-xs text-muted-foreground">From</span>
                    <span className="font-bold text-primary">{priceLabel}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 cursor-pointer"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedProfile({
                          id: service.freelancerId,
                          name: service.freelancerName,
                          title: service.title,
                          avatar: avatarUrl(service.freelancerName),
                          bio:
                            service.freelancerBio ||
                            `Expert offering ${service.title}. Delivery in about ${service.deliveryDays} days.`,
                          location: service.freelancerLocation || 'Ethiopia',
                          rating: service.freelancerRating,
                          reviews: 0,
                          projects: completed,
                          hourlyRate: service.priceMax,
                          skills,
                          serviceId: service.id,
                        })
                      }
                    >
                      View Profile
                    </Button>
                    {canHireOrContact ? (
                      <Button
                        size="sm"
                        className="flex-1 cursor-pointer"
                        onClick={() =>
                          setHireTarget({
                            freelancerId: service.freelancerId,
                            freelancerName: service.freelancerName,
                            serviceId: service.id,
                          })
                        }
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Hire me
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            }

            return (
              <div key={service.id} className="border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 w-full">
                  <Image src={img} alt={service.title} fill className="object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2">{service.title}</h3>

                  <div className="flex items-center gap-3 mb-4">
                    <Image
                      src={avatarUrl(service.freelancerName)}
                      alt={service.freelancerName}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{service.freelancerName}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{service.freelancerRating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">· {completed} projects</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(service.tags.length ? service.tags : [service.category]).map((tag) => (
                      <span key={tag} className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-primary">{priceLabel}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {service.freelancerLocation || 'Ethiopia'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 cursor-pointer"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedProfile({
                          id: service.freelancerId,
                          name: service.freelancerName,
                          title: service.title,
                          avatar: avatarUrl(service.freelancerName),
                          bio:
                            service.freelancerBio ||
                            `Professional offering ${service.title}. Delivery in about ${service.deliveryDays} days.`,
                          location: service.freelancerLocation || 'Ethiopia',
                          rating: service.freelancerRating,
                          reviews: 0,
                          projects: completed,
                          hourlyRate: service.priceMax,
                          skills: service.tags.length ? service.tags : [service.category],
                          serviceId: service.id,
                        })
                      }
                    >
                      View Profile
                    </Button>
                    {canHireOrContact ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 cursor-pointer"
                        onClick={() =>
                          setSelectedProfile({
                            id: service.freelancerId,
                            name: service.freelancerName,
                            title: service.title,
                            avatar: avatarUrl(service.freelancerName),
                            bio:
                              service.freelancerBio ||
                              `Professional offering ${service.title}. Delivery in about ${service.deliveryDays} days.`,
                            location: service.freelancerLocation || 'Ethiopia',
                            rating: service.freelancerRating,
                            reviews: 0,
                            projects: completed,
                            hourlyRate: service.priceMax,
                            skills: service.tags.length ? service.tags : [service.category],
                            serviceId: service.id,
                          })
                        }
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Contact
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {total > PAGE_SIZE ? (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      {selectedProfile ? (
        <ProfileModal isOpen={!!selectedProfile} onClose={() => setSelectedProfile(null)} profile={selectedProfile} />
      ) : null}

      {hireTarget ? (
        <HireInvitationDialog
          open={!!hireTarget}
          onOpenChange={(open) => {
            if (!open) setHireTarget(null)
          }}
          freelancerId={hireTarget.freelancerId}
          freelancerName={hireTarget.freelancerName}
          serviceId={hireTarget.serviceId}
        />
      ) : null}
    </section>
  )
}
