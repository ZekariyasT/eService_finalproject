import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

export interface ReviewRow {
  id: string
  reviewerId: string
  targetUserId: string
  serviceOrderId: string | null
  jobId: string | null
  rating: number
  comment: string
  createdAt: string
}

function mapRow(r: RowDataPacket): ReviewRow {
  return {
    id: r.id,
    reviewerId: r.reviewer_id,
    targetUserId: r.target_user_id,
    serviceOrderId: r.service_order_id,
    jobId: r.job_id ?? null,
    rating: Number(r.rating),
    comment: r.comment,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }
}

async function refreshTargetUserRating(targetUserId: string): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `UPDATE users
     SET rating = COALESCE((
       SELECT AVG(rating) FROM reviews WHERE target_user_id = :targetUserId
     ), 0)
     WHERE id = :targetUserId`,
    { targetUserId }
  )
}

export async function createReview(input: {
  reviewerId: string
  targetUserId: string
  serviceOrderId?: string | null
  jobId?: string | null
  rating: number
  comment: string
}): Promise<ReviewRow> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO reviews (id, reviewer_id, target_user_id, service_order_id, job_id, rating, comment)
     VALUES (:id, :reviewer_id, :target_user_id, :service_order_id, :job_id, :rating, :comment)`,
    {
      id,
      reviewer_id: input.reviewerId,
      target_user_id: input.targetUserId,
      service_order_id: input.serviceOrderId ?? null,
      job_id: input.jobId ?? null,
      rating: input.rating,
      comment: input.comment,
    }
  )
  await refreshTargetUserRating(input.targetUserId)
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM reviews WHERE id = :id`, { id })
  return mapRow(rows[0]!)
}

export async function listReviewsForUser(targetUserId: string): Promise<ReviewRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM reviews WHERE target_user_id = :targetUserId ORDER BY created_at DESC LIMIT 100`,
    { targetUserId }
  )
  return rows.map(mapRow)
}

export async function findReviewForJobByReviewer(
  jobId: string,
  reviewerId: string
): Promise<ReviewRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM reviews WHERE job_id = :jobId AND reviewer_id = :reviewerId LIMIT 1`,
    { jobId, reviewerId }
  )
  return rows.length ? mapRow(rows[0]!) : null
}

export async function listReviewsForJob(jobId: string): Promise<ReviewRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM reviews WHERE job_id = :jobId ORDER BY created_at DESC`,
    { jobId }
  )
  return rows.map(mapRow)
}
