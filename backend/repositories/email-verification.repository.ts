import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'
import { sha256Hex } from '../utils/opaque-token.js'

export function hashEmailVerificationToken(plainToken: string): string {
  return sha256Hex(plainToken)
}

export async function deleteVerificationTokensForUser(userId: string): Promise<void> {
  const pool = getPool()
  await pool.execute(`DELETE FROM email_verification_tokens WHERE user_id = :userId`, { userId })
}

export async function insertVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
     VALUES (:id, :userId, :tokenHash, :expiresAt)`,
    { id, userId, tokenHash, expiresAt }
  )
}

/** Returns user id if token valid; deletes that token row (and any other verification tokens for that user). */
export async function consumeVerificationToken(tokenHash: string): Promise<{ userId: string } | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id FROM email_verification_tokens
     WHERE token_hash = :tokenHash AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    { tokenHash }
  )
  if (!rows.length) return null
  const userId = String((rows[0] as RowDataPacket).user_id)
  await pool.execute(`DELETE FROM email_verification_tokens WHERE token_hash = :tokenHash`, { tokenHash })
  await deleteVerificationTokensForUser(userId)
  return { userId }
}
