import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

export type ContactSubmissionRow = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  isRead: boolean
  createdAt: string
}

const LIST_MAX = 500

export async function createSubmission(input: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<{ id: string }> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO contact_submissions (id, name, email, subject, message, is_read)
     VALUES (:id, :name, :email, :subject, :message, 0)`,
    {
      id,
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
    }
  )
  return { id }
}

export async function listSubmissionsForAdmin(limit = 200): Promise<ContactSubmissionRow[]> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 200, 1), LIST_MAX)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, email, subject, message, is_read AS isRead, created_at AS createdAt
     FROM contact_submissions
     ORDER BY created_at DESC
     LIMIT ${lim}`
  )
  return rows.map((r) => {
    const raw = r as Record<string, unknown>
    const created =
      raw.createdAt ?? raw.created_at
    const createdAt =
      created instanceof Date ? created.toISOString() : String(created ?? '')
    const readFlag = raw.isRead ?? raw.is_read
    return {
      id: String(raw.id),
      name: String(raw.name),
      email: String(raw.email),
      subject: String(raw.subject),
      message: String(raw.message),
      isRead: readFlag === true || readFlag === 1 || readFlag === '1',
      createdAt,
    }
  })
}

export async function markRead(id: string): Promise<boolean> {
  const pool = getPool()
  const [result] = await pool.execute(`UPDATE contact_submissions SET is_read = 1 WHERE id = :id`, { id })
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0
}
