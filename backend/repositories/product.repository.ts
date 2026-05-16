import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

/** Full row including fields never exposed to anonymous catalog viewers */
export interface ProductRow {
  id: string
  creatorId: string
  creatorName: string
  title: string
  /** Promotion / catalog copy — visible to everyone */
  description: string
  /** Full course or product details — only for buyers & creator */
  fullDescription: string
  promotionSampleUrl: string | null
  category: string
  price: number
  imageUrl: string | null
  images: string[]
  /** Deliverable link (file, folder, course URL) — only after purchase */
  filePath: string | null
  downloadsCount: number
  rating: number
  salesCount: number
  status: string
  createdAt: string
}

/** Safe for public listing & product modal before purchase */
export type PublicProductRow = Omit<ProductRow, 'fullDescription' | 'filePath'>

function parseImages(raw: unknown): string[] {
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

function mapRow(r: RowDataPacket): ProductRow {
  return {
    id: r.id,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    title: r.title,
    description: r.description,
    fullDescription: String(r.full_description ?? ''),
    promotionSampleUrl: r.promotion_sample_url ? String(r.promotion_sample_url) : null,
    category: r.category,
    price: Number(r.price),
    imageUrl: r.image_url,
    images: parseImages(r.images_json),
    filePath: r.file_path ? String(r.file_path) : null,
    downloadsCount: Number(r.downloads_count),
    rating: Number(r.rating),
    salesCount: Number(r.sales_count),
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }
}

export function toPublicProduct(p: ProductRow): PublicProductRow {
  const { fullDescription: _f, filePath: _fp, ...rest } = p
  return rest
}

export async function listActiveProducts(): Promise<PublicProductRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, u.name AS creator_name
     FROM digital_products p
     JOIN users u ON u.id = p.creator_id
     WHERE p.status = 'active'
     ORDER BY p.created_at DESC
     LIMIT 200`
  )
  return rows.map((r) => toPublicProduct(mapRow(r)))
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, u.name AS creator_name
     FROM digital_products p
     JOIN users u ON u.id = p.creator_id
     WHERE p.id = :id LIMIT 1`,
    { id }
  )
  return rows.length ? mapRow(rows[0]!) : null
}

export async function createProduct(input: {
  creatorId: string
  title: string
  description: string
  fullDescription?: string
  promotionSampleUrl?: string | null
  category: string
  price: number
  imageUrl?: string | null
  images?: string[]
  fullFilePath?: string | null
}): Promise<ProductRow> {
  const pool = getPool()
  const id = randomUUID()
  const imgs = input.images?.length ? input.images : input.imageUrl ? [input.imageUrl] : []
  await pool.execute(
    `INSERT INTO digital_products (
       id, creator_id, title, description, full_description, promotion_sample_url,
       category, price, image_url, images_json, file_path,
       downloads_count, rating, sales_count, status)
     VALUES (
       :id, :creator_id, :title, :description, :full_description, :promotion_sample_url,
       :category, :price, :image_url, :images_json, :file_path,
       0, 0, 0, 'active')`,
    {
      id,
      creator_id: input.creatorId,
      title: input.title,
      description: input.description,
      full_description: input.fullDescription ?? '',
      promotion_sample_url: input.promotionSampleUrl ?? null,
      category: input.category,
      price: input.price,
      image_url: input.imageUrl ?? imgs[0] ?? null,
      images_json: JSON.stringify(imgs),
      file_path: input.fullFilePath ?? null,
    }
  )
  const created = await getProductById(id)
  if (!created) throw new Error('Failed to load created product')
  return created
}

/** Admin: every product regardless of status, joined with creator name. */
export async function listAllProductsForAdmin(limit = 200): Promise<ProductRow[]> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 1000)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, u.name AS creator_name
     FROM digital_products p
     JOIN users u ON u.id = p.creator_id
     ORDER BY p.created_at DESC
     LIMIT ${lim}`
  )
  return rows.map(mapRow)
}

export async function listProductsBySeller(sellerId: string): Promise<ProductRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, u.name AS creator_name
     FROM digital_products p
     JOIN users u ON u.id = p.creator_id
     WHERE p.creator_id = :sellerId
     ORDER BY p.created_at DESC`,
    { sellerId }
  )
  return rows.map(mapRow)
}

export async function updateProduct(id: string, sellerId: string, patch: Record<string, unknown>): Promise<ProductRow | null> {
  const pool = getPool()
  const sets: string[] = []
  const params: Record<string, unknown> = { id, sellerId }
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'title' || k === 'category' || k === 'status') {
      sets.push(`${k} = :${k}`)
      params[k] = v
    } else if (k === 'description') {
      sets.push('description = :description')
      params.description = v
    } else if (k === 'fullDescription') {
      sets.push('full_description = :full_description')
      params.full_description = v
    } else if (k === 'promotionSampleUrl') {
      sets.push('promotion_sample_url = :promotion_sample_url')
      params.promotion_sample_url = v
    } else if (k === 'fullFilePath') {
      sets.push('file_path = :file_path')
      params.file_path = v
    } else if (k === 'price') {
      sets.push('price = :price')
      params.price = Number(v)
    } else if (k === 'images' && Array.isArray(v)) {
      sets.push('images_json = :images_json')
      params.images_json = JSON.stringify(v)
      if (!patch.imageUrl && v.length > 0) {
        sets.push('image_url = :image_url')
        params.image_url = String(v[0])
      }
    } else if (k === 'imageUrl') {
      sets.push('image_url = :image_url')
      params.image_url = v
    }
  }
  if (!sets.length) return getProductById(id)
  await pool.execute(`UPDATE digital_products SET ${sets.join(', ')} WHERE id = :id AND creator_id = :sellerId`, params)
  return getProductById(id)
}

export async function deleteProduct(id: string, sellerId: string): Promise<boolean> {
  const pool = getPool()
  const [result] = await pool.execute(
    `DELETE FROM digital_products WHERE id = :id AND creator_id = :sellerId`,
    { id, sellerId }
  )
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0
}
