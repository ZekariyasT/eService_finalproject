import { randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { getPool } from '../utils/pool.js'

const DEFAULTS: Record<string, string> = {
  commission_percent: '10',
  coin_to_birr_rate: '20',
  job_publish_min_wallet_balance: '100',
  job_publish_max_open_jobs: '10',
  job_publish_max_per_day: '5',
  job_publish_require_id_verification: '1',
  job_publish_min_profile_complete: '60',
}

export async function getSetting(key: string): Promise<string> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = :key LIMIT 1`,
    { key }
  )
  if (rows.length) return String(rows[0]!.setting_value)
  return DEFAULTS[key] ?? ''
}

export async function setSetting(key: string, value: string): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `INSERT INTO platform_settings (id, setting_key, setting_value)
     VALUES (:id, :key, :val)
     ON DUPLICATE KEY UPDATE setting_value = :val`,
    { id: randomUUID(), key, val: value }
  )
}

export async function getCommissionPercent(): Promise<number> {
  const val = await getSetting('commission_percent')
  const n = Number(val)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 10
}

export async function setCommissionPercent(percent: number): Promise<void> {
  await setSetting('commission_percent', String(percent))
}

export async function getJobPublishSettings() {
  const [minBalance, maxOpen, maxPerDay, requireId, minProfile] = await Promise.all([
    getSetting('job_publish_min_wallet_balance'),
    getSetting('job_publish_max_open_jobs'),
    getSetting('job_publish_max_per_day'),
    getSetting('job_publish_require_id_verification'),
    getSetting('job_publish_min_profile_complete'),
  ])
  return {
    minWalletBalance: Math.max(0, Number(minBalance) || 0),
    maxOpenJobs: Math.max(1, Number(maxOpen) || 10),
    maxPerDay: Math.max(1, Number(maxPerDay) || 5),
    requireIdVerification: minBalance !== '' ? requireId === '1' : true,
    minProfileComplete: Math.max(0, Number(minProfile) || 60),
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT setting_key, setting_value FROM platform_settings`
  )
  const result: Record<string, string> = { ...DEFAULTS }
  for (const r of rows as RowDataPacket[]) {
    result[String(r.setting_key)] = String(r.setting_value)
  }
  return result
}
