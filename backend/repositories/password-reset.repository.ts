import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'
import { sha256Hex } from '../utils/opaque-token.js'

export function hashPasswordResetToken(plainToken: string): string {
  return sha256Hex(plainToken)
}

export async function deleteTokensForUser(userId: string): Promise<void> {
  const pool = getPool()
  await pool.execute(`DELETE FROM password_reset_tokens WHERE user_id = :userId`, { userId })
}

export async function insertToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (:id, :userId, :tokenHash, :expiresAt)`,
    { id, userId, tokenHash, expiresAt }
  )
}

export async function consumeTokenRow(tokenHash: string): Promise<{ userId: string } | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM password_reset_tokens
     WHERE token_hash = :tokenHash AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    { tokenHash }
  )
  if (!rows.length) return null
  const userId = String((rows[0] as RowDataPacket).user_id)
  await pool.execute(`DELETE FROM password_reset_tokens WHERE token_hash = :tokenHash`, { tokenHash })
  await deleteTokensForUser(userId)
  return { userId }
}
