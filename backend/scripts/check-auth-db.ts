/**
 * Diagnose login 401: lists users and tests bcrypt for founder/support from env.
 * Run: npx tsx scripts/check-auth-db.ts  (from backend/)
 */
import bcrypt from 'bcryptjs'
import type { RowDataPacket } from 'mysql2'
import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

async function main() {
  const conn = await mysql.createConnection({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    database: env.mysql.database,
    namedPlaceholders: true,
  })

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT email, role, CONCAT(LEFT(password_hash, 15), '…') AS hash_prefix FROM users ORDER BY email`
  )
  console.log(`Database: ${env.mysql.database} @ ${env.mysql.host}`)
  console.log(`User count: ${rows.length}`)
  if (rows.length === 0) {
    console.log('No users — seed runs only when table is empty; restart API after truncating users.')
  } else {
    console.table(rows.map((r) => ({ email: r.email, role: r.role, hash: r.hash_prefix })))
  }

  const checks = [
    { label: 'founder', email: env.seed.founderEmail.toLowerCase(), password: env.seed.founderPassword },
    { label: 'support admin', email: env.seed.supportAdminEmail.toLowerCase(), password: env.seed.supportAdminPassword },
    { label: 'demo freelancer', email: 'freelancer@test.com', password: 'password123' },
  ] as const

  for (const c of checks) {
    const [urows] = await conn.query<RowDataPacket[]>(
      'SELECT password_hash FROM users WHERE LOWER(email) = LOWER(:e) LIMIT 1',
      { e: c.email }
    )
    if (!urows.length) {
      console.log(`[${c.label}] ${c.email}: NOT FOUND`)
      continue
    }
    const ok = await bcrypt.compare(c.password, String((urows[0] as RowDataPacket).password_hash))
    console.log(`[${c.label}] ${c.email}: bcrypt match = ${ok}`)
  }

  await conn.end()
}

void main().catch((e) => {
  console.error(e)
  process.exit(1)
})
