import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

export interface ServiceRow {
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

export interface ListServiceFilters {
  q?: string
  scope?: 'all' | 'freelancer' | 'service'
  serviceCategory?: string
  maxPrice?: number
  maxDeliveryDays?: number
  minRating?: number
  location?: string
  page: number
  limit: number
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating_desc' | 'delivery_asc'
}

export interface ListServiceResult {
  services: ServiceRow[]
  total: number
  page: number
  limit: number
}

function parseTags(raw: unknown): string[] {
  if (raw == null) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  }
  if (Array.isArray(raw)) return raw as string[]
  return []
}

function mapRow(r: RowDataPacket): ServiceRow {
  return {
    id: r.id,
    freelancerId: r.freelancer_id,
    freelancerName: r.freelancer_name,
    freelancerRating: Number(r.freelancer_rating ?? 0),
    freelancerBio: String(r.freelancer_bio ?? ''),
    freelancerCompletedProjects: Number(r.freelancer_completed_projects ?? 0),
    freelancerLocation: String(r.freelancer_location ?? 'Ethiopia'),
    title: r.title,
    description: r.description,
    category: r.category,
    priceMin: Number(r.price_min),
    priceMax: Number(r.price_max),
    deliveryDays: Number(r.delivery_days),
    imageUrl: r.image_url,
    tags: parseTags(r.tags_json),
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }
}

export async function listActiveServices(filters?: ListServiceFilters): Promise<ListServiceResult> {
  const pool = getPool()
  const activeFilters: ListServiceFilters = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    sort: filters?.sort ?? 'newest',
    q: filters?.q?.trim() || undefined,
    scope: filters?.scope ?? 'all',
    serviceCategory: filters?.serviceCategory?.trim() || undefined,
    maxPrice: filters?.maxPrice,
    maxDeliveryDays: filters?.maxDeliveryDays,
    minRating: filters?.minRating,
    location: filters?.location?.trim() || undefined,
  }

  const where: string[] = [`s.status = 'active'`]
  const params: Record<string, unknown> = {}

  if (activeFilters.serviceCategory && activeFilters.serviceCategory !== 'all') {
    where.push('s.category = :serviceCategory')
    params.serviceCategory = activeFilters.serviceCategory
  }
  if (activeFilters.maxPrice != null) {
    where.push('s.price_max <= :maxPrice')
    params.maxPrice = activeFilters.maxPrice
  }
  if (activeFilters.maxDeliveryDays != null) {
    where.push('s.delivery_days <= :maxDeliveryDays')
    params.maxDeliveryDays = activeFilters.maxDeliveryDays
  }
  if (activeFilters.minRating != null) {
    where.push('COALESCE(u.rating, 0) >= :minRating')
    params.minRating = activeFilters.minRating
  }
  if (activeFilters.location) {
    where.push('LOWER(COALESCE(u.location, "")) LIKE :locationLike')
    params.locationLike = `%${activeFilters.location.toLowerCase()}%`
  }
  if (activeFilters.q) {
    params.queryLike = `%${activeFilters.q.toLowerCase()}%`
    if (activeFilters.scope === 'freelancer') {
      where.push(
        `(LOWER(COALESCE(u.name, "")) LIKE :queryLike OR LOWER(COALESCE(u.bio, "")) LIKE :queryLike OR LOWER(COALESCE(u.location, "")) LIKE :queryLike)`
      )
    } else if (activeFilters.scope === 'service') {
      where.push(
        `(LOWER(s.title) LIKE :queryLike OR LOWER(s.description) LIKE :queryLike OR LOWER(s.category) LIKE :queryLike OR LOWER(CAST(s.tags_json AS CHAR)) LIKE :queryLike)`
      )
    } else {
      where.push(
        `(LOWER(s.title) LIKE :queryLike OR LOWER(s.description) LIKE :queryLike OR LOWER(s.category) LIKE :queryLike OR LOWER(CAST(s.tags_json AS CHAR)) LIKE :queryLike OR LOWER(COALESCE(u.name, "")) LIKE :queryLike OR LOWER(COALESCE(u.bio, "")) LIKE :queryLike OR LOWER(COALESCE(u.location, "")) LIKE :queryLike)`
      )
    }
  }

  const orderByMap: Record<string, string> = {
    newest: 's.created_at DESC',
    price_asc: 's.price_min ASC, s.created_at DESC',
    price_desc: 's.price_max DESC, s.created_at DESC',
    rating_desc: 'COALESCE(u.rating, 0) DESC, s.created_at DESC',
    delivery_asc: 's.delivery_days ASC, s.created_at DESC',
  }
  const orderBy = orderByMap[activeFilters.sort ?? 'newest'] ?? orderByMap.newest

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  if (activeFilters.scope === 'freelancer') {
    const [allRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.*, u.name AS freelancer_name, u.rating AS freelancer_rating,
              u.bio AS freelancer_bio, u.completed_projects AS freelancer_completed_projects, u.location AS freelancer_location
       FROM services s
       JOIN users u ON u.id = s.freelancer_id
       ${whereSql}
       ORDER BY COALESCE(u.rating, 0) DESC, s.created_at DESC`,
      params
    )
    const mapped = allRows.map(mapRow)
    const seen = new Set<string>()
    const deduped = mapped.filter((service) => {
      if (seen.has(service.freelancerId)) return false
      seen.add(service.freelancerId)
      return true
    })
    const total = deduped.length
    const offset = (activeFilters.page - 1) * activeFilters.limit
    return {
      services: deduped.slice(offset, offset + activeFilters.limit),
      total,
      page: activeFilters.page,
      limit: activeFilters.limit,
    }
  }

  const offset = (activeFilters.page - 1) * activeFilters.limit
  const countParams = { ...params }
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM services s
     JOIN users u ON u.id = s.freelancer_id
     ${whereSql}`,
    countParams
  )
  const total = Number(countRows[0]?.total ?? 0)

  const queryParams = { ...params, limit: activeFilters.limit, offset }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.*, u.name AS freelancer_name, u.rating AS freelancer_rating,
            u.bio AS freelancer_bio, u.completed_projects AS freelancer_completed_projects, u.location AS freelancer_location
     FROM services s
     JOIN users u ON u.id = s.freelancer_id
     ${whereSql}
     ORDER BY ${orderBy}
     LIMIT :limit OFFSET :offset`,
    queryParams
  )
  return { services: rows.map(mapRow), total, page: activeFilters.page, limit: activeFilters.limit }
}

export async function getServiceById(id: string): Promise<ServiceRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.*, u.name AS freelancer_name, u.rating AS freelancer_rating,
            u.bio AS freelancer_bio, u.completed_projects AS freelancer_completed_projects, u.location AS freelancer_location
     FROM services s
     JOIN users u ON u.id = s.freelancer_id
     WHERE s.id = :id LIMIT 1`,
    { id }
  )
  return rows.length ? mapRow(rows[0]!) : null
}

/** Admin: every service regardless of status, joined with freelancer name. */
export async function listAllServicesForAdmin(limit = 200): Promise<ServiceRow[]> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 1000)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.*, u.name AS freelancer_name, u.rating AS freelancer_rating,
            u.bio AS freelancer_bio, u.completed_projects AS freelancer_completed_projects, u.location AS freelancer_location
     FROM services s
     JOIN users u ON u.id = s.freelancer_id
     ORDER BY s.created_at DESC
     LIMIT ${lim}`
  )
  return rows.map(mapRow)
}

export async function listServicesByFreelancer(freelancerId: string): Promise<ServiceRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.*, u.name AS freelancer_name, u.rating AS freelancer_rating,
            u.bio AS freelancer_bio, u.completed_projects AS freelancer_completed_projects, u.location AS freelancer_location
     FROM services s
     JOIN users u ON u.id = s.freelancer_id
     WHERE s.freelancer_id = :freelancerId
     ORDER BY s.created_at DESC`,
    { freelancerId }
  )
  return rows.map(mapRow)
}

export async function createService(input: {
  freelancerId: string
  title: string
  description: string
  category: string
  priceMin: number
  priceMax: number
  deliveryDays: number
  imageUrl?: string | null
  tags?: string[]
}): Promise<ServiceRow> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO services (id, freelancer_id, title, description, category, price_min, price_max, delivery_days, image_url, tags_json, status)
     VALUES (:id, :freelancer_id, :title, :description, :category, :price_min, :price_max, :delivery_days, :image_url, :tags_json, 'active')`,
    {
      id,
      freelancer_id: input.freelancerId,
      title: input.title,
      description: input.description,
      category: input.category,
      price_min: input.priceMin,
      price_max: input.priceMax,
      delivery_days: input.deliveryDays,
      image_url: input.imageUrl ?? null,
      tags_json: JSON.stringify(input.tags ?? []),
    }
  )
  const created = await getServiceById(id)
  if (!created) throw new Error('Failed to load created service')
  return created
}

export async function updateService(
  id: string,
  freelancerId: string,
  patch: Partial<{
    title: string
    description: string
    category: string
    priceMin: number
    priceMax: number
    deliveryDays: number
    imageUrl: string | null
    tags: string[]
    status: string
  }>
): Promise<ServiceRow | null> {
  const pool = getPool()
  const existing = await getServiceById(id)
  if (!existing || existing.freelancerId !== freelancerId) return null

  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  if (patch.title != null) {
    sets.push('title = :title')
    params.title = patch.title
  }
  if (patch.description != null) {
    sets.push('description = :description')
    params.description = patch.description
  }
  if (patch.category != null) {
    sets.push('category = :category')
    params.category = patch.category
  }
  if (patch.priceMin != null) {
    sets.push('price_min = :price_min')
    params.price_min = patch.priceMin
  }
  if (patch.priceMax != null) {
    sets.push('price_max = :price_max')
    params.price_max = patch.priceMax
  }
  if (patch.deliveryDays != null) {
    sets.push('delivery_days = :delivery_days')
    params.delivery_days = patch.deliveryDays
  }
  if (patch.imageUrl !== undefined) {
    sets.push('image_url = :image_url')
    params.image_url = patch.imageUrl
  }
  if (patch.tags != null) {
    sets.push('tags_json = :tags_json')
    params.tags_json = JSON.stringify(patch.tags)
  }
  if (patch.status != null) {
    sets.push('status = :status')
    params.status = patch.status
  }
  if (sets.length) await pool.query(`UPDATE services SET ${sets.join(', ')} WHERE id = :id`, params)
  return getServiceById(id)
}

export async function deleteService(id: string, freelancerId: string): Promise<boolean> {
  const existing = await getServiceById(id)
  if (!existing || existing.freelancerId !== freelancerId) return false
  const pool = getPool()
  await pool.execute(`DELETE FROM services WHERE id = :id`, { id })
  return true
}
