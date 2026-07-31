import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

export async function createNotification(userId: string, title: string, body: string, type = 'system') {
  const pool = getPool()
  await pool.execute(
    `INSERT INTO notifications (id, user_id, title, body, type, is_read) VALUES (:id, :user_id, :title, :body, :type, 0)`,
    { id: randomUUID(), user_id: userId, title, body, type }
  )
}

const NOTIFICATION_CHUNK = 120

/** Max rows returned per user; notifications are never deleted, only marked read. */
const LIST_MAX = 10_000

/** Same notification text for many users (e.g. new job broadcast). Chunked INSERTs. */
export async function createNotificationsBulk(
  entries: Array<{ userId: string; title: string; body: string; type: string }>
): Promise<void> {
  if (!entries.length) return
  const pool = getPool()
  for (let i = 0; i < entries.length; i += NOTIFICATION_CHUNK) {
    const chunk = entries.slice(i, i + NOTIFICATION_CHUNK)
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, 0)').join(', ')
    const values: unknown[] = []
    for (const e of chunk) {
      values.push(randomUUID(), e.userId, e.title, e.body, e.type)
    }
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, body, type, is_read) VALUES ${placeholders}`,
      values
    )
  }
}

export async function listMyNotifications(userId: string) {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC LIMIT ${LIST_MAX}`,
    { userId }
  )
  return rows
}

export async function markRead(userId: string, id: string) {
  const pool = getPool()
  await pool.execute(`UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :userId`, { id, userId })
}

export async function markAllRead(userId: string) {
  const pool = getPool()
  await pool.execute(`UPDATE notifications SET is_read = 1 WHERE user_id = :userId AND is_read = 0`, { userId })
}

export async function countUnread(userId: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM notifications WHERE user_id = :userId AND is_read = 0`,
    { userId }
  )
  const c = (rows[0] as { c?: unknown })?.c
  return typeof c === 'number' ? c : Number(c ?? 0)
}

