import type { RowDataPacket } from 'mysql2'
import { getPool } from '../utils/pool.js'
import type { PublicUser, User, UserRole } from '../models/user.model.js'
import type { OnboardingProfileStatus, PersonalProfile } from '../models/personal-profile.model.js'

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }
  if (typeof raw === 'object') return raw as T
  return fallback
}

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v
  return new Date().toISOString()
}

function rowIsActive(row: RowDataPacket): boolean {
  if (row.is_active === undefined || row.is_active === null) return true
  return Boolean(Number(row.is_active))
}

function parsePersonalProfile(raw: unknown): PersonalProfile | undefined {
  if (raw == null) return undefined
  const o = parseJson<PersonalProfile>(raw, {})
  if (!o || typeof o !== 'object') return undefined
  if (Object.keys(o as object).length === 0) return undefined
  return o
}

function rowOnboardingStatus(row: RowDataPacket): OnboardingProfileStatus {
  const raw = row.onboarding_profile_status
  if (raw == null || raw === '') return 'skipped'
  const s = String(raw)
  if (s === 'pending' || s === 'completed' || s === 'skipped') return s
  return 'skipped'
}

export function rowToPublicUser(row: RowDataPacket): PublicUser {
  const base = {
    id: row.id as string,
    username: row.username ? String(row.username) : undefined,
    email: row.email as string,
    name: row.name as string,
    role: row.role as UserRole,
    verified: Boolean(row.verified),
    createdAt: toIso(row.created_at),
    phone: row.phone ? String(row.phone) : undefined,
    isActive: rowIsActive(row),
    nationalId: row.national_id ? String(row.national_id) : undefined,
    idFrontImageUrl: row.id_front_image_url ? String(row.id_front_image_url) : undefined,
    idBackImageUrl: row.id_back_image_url ? String(row.id_back_image_url) : undefined,
    profilePictureUrl: row.profile_picture_url ? String(row.profile_picture_url) : undefined,
    shortBio: row.short_bio ? String(row.short_bio) : undefined,
    socialLinks: parseJson<Record<string, string>>(row.social_links_json, {}),
    verificationStatus: String(row.verification_status ?? 'pending') as
      | 'pending'
      | 'submitted'
      | 'approved'
      | 'rejected',
    paidVerificationBadge: Boolean(row.paid_verification_badge),
    walletAccountNo: row.wallet_account_no ? String(row.wallet_account_no) : undefined,
    coins: Number(row.coins ?? 0),
    personalProfile: parsePersonalProfile(row.personal_profile_json),
    onboardingProfileStatus: rowOnboardingStatus(row),
  }

  const r = row.role as string
  if (r === 'freelancer') {
    return {
      ...base,
      role: 'freelancer',
      bio: String(row.bio ?? ''),
      skills: parseJson<string[]>(row.skills_json, []),
      hourlyRate: Number(row.hourly_rate ?? 0),
      rating: Number(row.rating ?? 0),
      completedProjects: Number(row.completed_projects ?? 0),
      earnings: Number(row.earnings ?? 0),
      location: String(row.location ?? ''),
      profileComplete: Number(row.profile_complete ?? 30),
    } as PublicUser
  }

  if (r === 'client') {
    return {
      ...base,
      role: 'client',
      company: String(row.company ?? ''),
      industry: String(row.industry ?? ''),
      location: String(row.location ?? ''),
      verifiedPayment: Boolean(row.verified_payment),
    } as PublicUser
  }

  return {
    ...base,
    role: r as UserRole,
  } as PublicUser
}

function rowToUser(row: RowDataPacket): User {
  return { ...(rowToPublicUser(row) as object), passwordHash: String(row.password_hash) } as User
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
    { email }
  )
  if (!rows.length) return null
  return rowToUser(rows[0]!)
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM users WHERE google_id = :googleId LIMIT 1`,
    { googleId }
  )
  if (!rows.length) return null
  return rowToUser(rows[0]!)
}

export async function setGoogleId(userId: string, googleId: string): Promise<void> {
  const pool = getPool()
  await pool.execute(`UPDATE users SET google_id = :googleId WHERE id = :userId`, { googleId, userId })
}

export async function findUserById(id: string): Promise<User | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM users WHERE id = :id LIMIT 1`, { id })
  if (!rows.length) return null
  return rowToUser(rows[0]!)
}

export async function findPublicUserById(id: string): Promise<PublicUser | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM users WHERE id = :id LIMIT 1`, { id })
  if (!rows.length) return null
  return rowToPublicUser(rows[0]!)
}

export async function insertUser(user: User & { passwordHash: string }): Promise<void> {
  const pool = getPool()
  const skillsJson = user.role === 'freelancer' ? JSON.stringify((user as { skills?: string[] }).skills ?? []) : '[]'

  await pool.execute(
    `INSERT INTO users (
      id, email, google_id, password_hash, name, role, phone, verified, created_at,
      bio, skills_json, hourly_rate, rating, completed_projects, earnings, location, profile_complete,
      company, industry, verified_payment, is_active, username, national_id, id_front_image_url, id_back_image_url,
      profile_picture_url, short_bio, social_links_json, verification_status, paid_verification_badge, wallet_account_no, coins,
      personal_profile_json, onboarding_profile_status
    ) VALUES (
      :id, :email, :google_id, :password_hash, :name, :role, :phone, :verified, :created_at,
      :bio, :skills_json, :hourly_rate, :rating, :completed_projects, :earnings, :location, :profile_complete,
      :company, :industry, :verified_payment, :is_active, :username, :national_id, :id_front_image_url, :id_back_image_url,
      :profile_picture_url, :short_bio, :social_links_json, :verification_status, :paid_verification_badge, :wallet_account_no, :coins,
      :personal_profile_json, :onboarding_profile_status
    )`,
    {
      id: user.id,
      email: user.email,
      google_id: (user as { googleId?: string | null }).googleId ?? null,
      password_hash: user.passwordHash,
      name: user.name,
      role: user.role,
      phone: (user as { phone?: string }).phone ?? null,
      verified: user.verified ? 1 : 0,
      // MySQL TIMESTAMP rejects ISO strings like 2026-04-21T12:00:00.000Z in many sql_mode settings
      created_at: new Date(user.createdAt),
      bio: user.role === 'freelancer' ? (user as { bio?: string }).bio ?? '' : null,
      skills_json: skillsJson,
      hourly_rate: user.role === 'freelancer' ? (user as { hourlyRate?: number }).hourlyRate ?? 0 : 0,
      rating: user.role === 'freelancer' ? (user as { rating?: number }).rating ?? 0 : 0,
      completed_projects: user.role === 'freelancer' ? (user as { completedProjects?: number }).completedProjects ?? 0 : 0,
      earnings: user.role === 'freelancer' ? (user as { earnings?: number }).earnings ?? 0 : 0,
      location: (user as { location?: string }).location ?? '',
      profile_complete: user.role === 'freelancer' ? (user as { profileComplete?: number }).profileComplete ?? 30 : 30,
      company: user.role === 'client' ? (user as { company?: string }).company ?? '' : '',
      industry: user.role === 'client' ? (user as { industry?: string }).industry ?? '' : '',
      verified_payment: user.role === 'client' && (user as { verifiedPayment?: boolean }).verifiedPayment ? 1 : 0,
      is_active: (user as { isActive?: boolean }).isActive === false ? 0 : 1,
      username: (user as { username?: string }).username ?? null,
      national_id: (user as { nationalId?: string }).nationalId ?? null,
      id_front_image_url: (user as { idFrontImageUrl?: string }).idFrontImageUrl ?? null,
      id_back_image_url: (user as { idBackImageUrl?: string }).idBackImageUrl ?? null,
      profile_picture_url: (user as { profilePictureUrl?: string }).profilePictureUrl ?? null,
      short_bio: (user as { shortBio?: string }).shortBio ?? null,
      social_links_json: JSON.stringify((user as { socialLinks?: Record<string, string> }).socialLinks ?? {}),
      verification_status: (user as { verificationStatus?: string }).verificationStatus ?? 'pending',
      paid_verification_badge: (user as { paidVerificationBadge?: boolean }).paidVerificationBadge ? 1 : 0,
      wallet_account_no: (user as { walletAccountNo?: string }).walletAccountNo ?? null,
      coins: (user as { coins?: number }).coins ?? 0,
      personal_profile_json: JSON.stringify((user as { personalProfile?: PersonalProfile }).personalProfile ?? null),
      onboarding_profile_status:
        (user as { onboardingProfileStatus?: OnboardingProfileStatus }).onboardingProfileStatus ?? 'pending',
    }
  )
}

export async function countByRole(role: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c FROM users WHERE role = :role`, { role })
  return Number((rows[0] as RowDataPacket)?.c ?? 0)
}

export async function countActiveByRole(role: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users WHERE role = :role AND COALESCE(is_active, 1) = 1`,
    { role }
  )
  return Number((rows[0] as RowDataPacket)?.c ?? 0)
}

/** Active accounts by role (for broadcasts such as new job alerts). */
export async function listActiveUserIdsByRole(role: string, limit = 8000): Promise<string[]> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 8000, 1), 20000)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE role = :role AND COALESCE(is_active, 1) = 1 ORDER BY created_at DESC LIMIT ${lim}`,
    { role }
  )
  return (rows as RowDataPacket[]).map((r) => String(r.id))
}

export async function hardDeleteUser(userId: string): Promise<void> {
  const pool = getPool()
  await pool.execute(`DELETE FROM users WHERE id = :id`, { id: userId })
}

export async function findAdminUserIds(): Promise<string[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE role IN ('admin', 'super-admin') AND COALESCE(is_active, 1) = 1`
  )
  return rows.map((r) => String(r.id))
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  const pool = getPool()
  await pool.execute(`UPDATE users SET password_hash = :password_hash WHERE id = :id`, {
    id: userId,
    password_hash: passwordHash,
  })
}

export async function adminPatchUser(userId: string, patch: { isActive?: boolean; role?: string }): Promise<void> {
  const pool = getPool()
  const sets: string[] = []
  const params: Record<string, unknown> = { userId }
  if (patch.isActive !== undefined) {
    sets.push('is_active = :is_active')
    params.is_active = patch.isActive ? 1 : 0
  }
  if (patch.role !== undefined) {
    sets.push('role = :role')
    params.role = patch.role
  }
  if (!sets.length) return
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = :userId`, params)
}

export async function updateUserProfile(userId: string, patchIn: Record<string, unknown>): Promise<PublicUser | null> {
  const pool = getPool()
  const exists = await findUserById(userId)
  if (!exists) return null

  const blocked = new Set([
    'id',
    'email',
    'role',
    'passwordHash',
    'createdAt',
    'password',
    'isActive',
    'walletAccountNo',
    'googleId',
  ])
  const sets: string[] = []
  const params: Record<string, unknown> = { userId }

  for (const [k, v] of Object.entries(patchIn)) {
    if (blocked.has(k)) continue
    if (k === 'skills' && Array.isArray(v)) {
      sets.push(`skills_json = :skills_json`)
      params.skills_json = JSON.stringify(v)
      continue
    }
    if (k === 'hourlyRate') {
      sets.push(`hourly_rate = :u_hourly_rate`)
      params.u_hourly_rate = Number(v)
    } else if (k === 'completedProjects') {
      sets.push(`completed_projects = :u_completed_projects`)
      params.u_completed_projects = Number(v)
    } else if (k === 'profileComplete') {
      sets.push(`profile_complete = :u_profile_complete`)
      params.u_profile_complete = Number(v)
    } else if (k === 'verifiedPayment') {
      sets.push(`verified_payment = :u_verified_payment`)
      params.u_verified_payment = v ? 1 : 0
    } else if (k === 'verified') {
      sets.push(`verified = :u_verified`)
      params.u_verified = v ? 1 : 0
    } else if (k === 'socialLinks' && v && typeof v === 'object') {
      sets.push(`social_links_json = :u_social_links_json`)
      params.u_social_links_json = JSON.stringify(v)
    } else if (k === 'paidVerificationBadge') {
      sets.push(`paid_verification_badge = :u_paid_verification_badge`)
      params.u_paid_verification_badge = v ? 1 : 0
    } else if (k === 'coins') {
      sets.push(`coins = :u_coins`)
      params.u_coins = Number(v)
    } else if (k === 'personalProfile' && v !== undefined && (typeof v === 'object' || v === null)) {
      sets.push(`personal_profile_json = :u_personal_profile_json`)
      params.u_personal_profile_json = JSON.stringify(v)
    } else if (k === 'onboardingProfileStatus' && typeof v === 'string') {
      if (v === 'pending' || v === 'completed' || v === 'skipped') {
        sets.push(`onboarding_profile_status = :u_onboarding_profile_status`)
        params.u_onboarding_profile_status = v
      }
    } else if (
      ['name', 'username', 'phone', 'bio', 'location', 'company', 'industry', 'rating', 'earnings', 'nationalId', 'idFrontImageUrl', 'idBackImageUrl', 'profilePictureUrl', 'shortBio', 'verificationStatus'].includes(
        k
      )
    ) {
      const map: Record<string, string> = {
        nationalId: 'national_id',
        idFrontImageUrl: 'id_front_image_url',
        idBackImageUrl: 'id_back_image_url',
        profilePictureUrl: 'profile_picture_url',
        shortBio: 'short_bio',
        verificationStatus: 'verification_status',
      }
      const col = map[k] ?? k
      const pname = `u_${col}`
      sets.push(`${col} = :${pname}`)
      params[pname] = k === 'rating' || k === 'earnings' ? Number(v) : v
    }
  }

  if (sets.length) await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = :userId`, params)

  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM users WHERE id = :userId LIMIT 1`, { userId })
  return rows.length ? rowToPublicUser(rows[0]!) : null
}

export async function listUsersForAdmin(): Promise<PublicUser[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM users ORDER BY created_at DESC LIMIT 500`)
  return rows.map((r) => rowToPublicUser(r))
}
