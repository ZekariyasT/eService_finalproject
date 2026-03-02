import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

export interface JobRow {
  id: string
  clientId: string
  title: string
  description: string
  category: string
  budgetType: string
  budget: number
  hourlyRate: number
  jobType: string
  deadline: string | null
  duration: string | null
  skills: string[]
  visibility: string
  freelancersNeeded: number
  experienceLevel: string
  attachments: Array<{ name: string; size?: number }>
  status: string
  proposalsCount: number
  selectedFreelancerId: string | null
  selectedFreelancerName: string | null
  createdAt: string
  updatedAt: string
}

export interface JobProposalRow {
  id: string
  jobId: string
  freelancerId: string
  freelancerName: string
  bidAmount: number
  coverLetter: string
  cvFileName: string | null
  status: string
  createdAt: string
  jobTitle?: string
}

function parseJsonArray(raw: unknown): string[] {
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

function parseAttachments(raw: unknown): Array<{ name: string; size?: number }> {
  if (raw == null) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Array<{ name: string; size?: number }>
    } catch {
      return []
    }
  }
  if (Array.isArray(raw)) return raw as Array<{ name: string; size?: number }>
  return []
}

function mapJobRow(r: RowDataPacket): JobRow {
  return {
    id: r.id,
    clientId: r.client_id,
    title: r.title,
    description: r.description,
    category: r.category,
    budgetType: r.budget_type,
    budget: Number(r.budget ?? 0),
    hourlyRate: Number(r.hourly_rate ?? 0),
    jobType: r.job_type,
    deadline: r.deadline ? (r.deadline instanceof Date ? r.deadline.toISOString().slice(0, 10) : String(r.deadline).slice(0, 10)) : null,
    duration: r.duration ? String(r.duration) : null,
    skills: parseJsonArray(r.skills_json),
    visibility: r.visibility,
    freelancersNeeded: Number(r.freelancers_needed ?? 1),
    experienceLevel: r.experience_level,
    attachments: parseAttachments(r.attachments_json),
    status: r.status,
    proposalsCount: Number(r.proposals_count ?? 0),
    selectedFreelancerId: r.selected_freelancer_id ?? null,
    selectedFreelancerName: r.selected_freelancer_name != null ? String(r.selected_freelancer_name) : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }
}

export interface ClientTrust {
  emailVerified: boolean
  idVerified: boolean
  paymentVerified: boolean
  memberSince: string
}

export async function listOpenPublicJobs(limit = 50): Promise<Array<JobRow & { clientTrust: ClientTrust }>> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*,
            u.verified AS client_verified,
            u.verification_status AS client_verification_status,
            u.verified_payment AS client_verified_payment,
            u.created_at AS client_created_at
     FROM jobs j
     JOIN users u ON u.id = j.client_id
     WHERE j.status = 'open' AND j.visibility = 'public'
       AND COALESCE(u.is_active, 1) = 1
       AND u.verified = 1
       AND u.verified_payment = 1
     ORDER BY j.created_at DESC
     LIMIT ${lim}`
  )
  return rows.map((r) => ({
    ...mapJobRow(r),
    clientTrust: {
      emailVerified: Boolean(r.client_verified),
      idVerified: r.client_verification_status === 'approved',
      paymentVerified: Boolean(r.client_verified_payment),
      memberSince: r.client_created_at instanceof Date
        ? r.client_created_at.toISOString()
        : String(r.client_created_at),
    },
  }))
}

export async function getJobById(id: string): Promise<JobRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*, sf.name AS selected_freelancer_name
     FROM jobs j
     LEFT JOIN users sf ON sf.id = j.selected_freelancer_id
     WHERE j.id = :id LIMIT 1`,
    { id }
  )
  return rows.length ? mapJobRow(rows[0]!) : null
}

/** Admin: every job regardless of status/visibility, joined with poster name. */
export async function listAllJobsForAdmin(limit = 200): Promise<Array<JobRow & { clientName: string }>> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 1000)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*, sf.name AS selected_freelancer_name, c.name AS client_name
     FROM jobs j
     LEFT JOIN users sf ON sf.id = j.selected_freelancer_id
     LEFT JOIN users c ON c.id = j.client_id
     ORDER BY j.created_at DESC
     LIMIT ${lim}`
  )
  return rows.map((r) => ({ ...mapJobRow(r), clientName: String(r.client_name ?? '') }))
}

export async function listJobsByClient(clientId: string): Promise<JobRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*, sf.name AS selected_freelancer_name
     FROM jobs j
     LEFT JOIN users sf ON sf.id = j.selected_freelancer_id
     WHERE j.client_id = :clientId ORDER BY j.created_at DESC`,
    { clientId }
  )
  return rows.map(mapJobRow)
}

export interface ContractRow {
  id: string
  clientId: string
  clientName: string
  freelancerId: string
  freelancerName: string
  title: string
  description: string
  category: string
  budget: number
  hourlyRate: number
  jobType: string
  status: string
  deadline: string | null
  duration: string | null
  createdAt: string
  updatedAt: string
}

function mapContractRow(r: RowDataPacket): ContractRow {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    clientName: String(r.client_name ?? ''),
    freelancerId: String(r.selected_freelancer_id ?? ''),
    freelancerName: String(r.selected_freelancer_name ?? ''),
    title: String(r.title),
    description: String(r.description),
    category: String(r.category),
    budget: Number(r.budget ?? 0),
    hourlyRate: Number(r.hourly_rate ?? 0),
    jobType: String(r.job_type),
    status: String(r.status),
    deadline: r.deadline
      ? r.deadline instanceof Date
        ? r.deadline.toISOString().slice(0, 10)
        : String(r.deadline).slice(0, 10)
      : null,
    duration: r.duration ? String(r.duration) : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }
}

export async function listContractsByFreelancer(freelancerId: string): Promise<ContractRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*, c.name AS client_name, sf.name AS selected_freelancer_name
     FROM jobs j
     JOIN users c ON c.id = j.client_id
     JOIN users sf ON sf.id = j.selected_freelancer_id
     WHERE j.selected_freelancer_id = :freelancerId
       AND j.status IN ('in_progress', 'completed', 'cancelled')
     ORDER BY j.updated_at DESC`,
    { freelancerId }
  )
  return rows.map(mapContractRow)
}

export async function listContractsByClient(clientId: string): Promise<ContractRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*, c.name AS client_name, sf.name AS selected_freelancer_name
     FROM jobs j
     JOIN users c ON c.id = j.client_id
     JOIN users sf ON sf.id = j.selected_freelancer_id
     WHERE j.client_id = :clientId
       AND j.status IN ('in_progress', 'completed', 'cancelled')
     ORDER BY j.updated_at DESC`,
    { clientId }
  )
  return rows.map(mapContractRow)
}

export async function completeContractByClient(jobId: string, clientId: string): Promise<ContractRow | null> {
  const contract = await getContractById(jobId)
  if (!contract || contract.clientId !== clientId || contract.status !== 'in_progress') return null

  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM contract_deliveries WHERE job_id = :jobId AND status = 'approved'`,
    { jobId }
  )
  if (Number(rows[0]?.c ?? 0) === 0) return null

  await pool.execute(`UPDATE jobs SET status = 'completed' WHERE id = :id`, { id: jobId })
  return getContractById(jobId)
}

export async function closeContractByClient(jobId: string, clientId: string): Promise<ContractRow | null> {
  const contract = await getContractById(jobId)
  if (!contract || contract.clientId !== clientId || contract.status !== 'in_progress') return null

  const pool = getPool()
  await pool.execute(`UPDATE jobs SET status = 'cancelled' WHERE id = :id`, { id: jobId })
  return getContractById(jobId)
}

export async function updateContractDeadline(
  jobId: string,
  clientId: string,
  deadline: string | null
): Promise<ContractRow | null> {
  const contract = await getContractById(jobId)
  if (!contract || contract.clientId !== clientId || contract.status !== 'in_progress') return null

  const pool = getPool()
  await pool.execute(`UPDATE jobs SET deadline = :deadline WHERE id = :id`, { id: jobId, deadline })
  return getContractById(jobId)
}

export async function getContractById(id: string): Promise<ContractRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*, c.name AS client_name, sf.name AS selected_freelancer_name
     FROM jobs j
     JOIN users c ON c.id = j.client_id
     JOIN users sf ON sf.id = j.selected_freelancer_id
     WHERE j.id = :id
       AND j.status IN ('in_progress', 'completed', 'cancelled')
     LIMIT 1`,
    { id }
  )
  return rows.length ? mapContractRow(rows[0]!) : null
}

export async function createJob(input: {
  clientId: string
  title: string
  description: string
  category: string
  budgetType: string
  budget: number
  hourlyRate: number
  jobType: string
  deadline: string | null
  duration: string | null
  skills: string[]
  visibility: string
  freelancersNeeded: number
  experienceLevel: string
  attachments: Array<{ name: string; size?: number }>
  status: string
}): Promise<JobRow> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO jobs (
      id, client_id, title, description, category, budget_type, budget, hourly_rate, job_type,
      deadline, duration, skills_json, visibility, freelancers_needed, experience_level, attachments_json, status
    ) VALUES (
      :id, :client_id, :title, :description, :category, :budget_type, :budget, :hourly_rate, :job_type,
      :deadline, :duration, :skills_json, :visibility, :freelancers_needed, :experience_level, :attachments_json, :status
    )`,
    {
      id,
      client_id: input.clientId,
      title: input.title,
      description: input.description,
      category: input.category,
      budget_type: input.budgetType,
      budget: input.budget,
      hourly_rate: input.hourlyRate,
      job_type: input.jobType,
      deadline: input.deadline,
      duration: input.duration,
      skills_json: JSON.stringify(input.skills),
      visibility: input.visibility,
      freelancers_needed: input.freelancersNeeded,
      experience_level: input.experienceLevel,
      attachments_json: JSON.stringify(input.attachments ?? []),
      status: input.status,
    }
  )
  const row = await getJobById(id)
  if (!row) throw new Error('Failed to load created job')
  return row
}

export async function updateJob(
  id: string,
  clientId: string,
  patch: Partial<{
    title: string
    description: string
    category: string
    budgetType: string
    budget: number
    hourlyRate: number
    jobType: string
    deadline: string | null
    duration: string | null
    skills: string[]
    visibility: string
    freelancersNeeded: number
    experienceLevel: string
    attachments: Array<{ name: string; size?: number }>
    status: string
    selectedFreelancerId: string | null
  }>
): Promise<JobRow | null> {
  const existing = await getJobById(id)
  if (!existing || existing.clientId !== clientId) return null

  const pool = getPool()
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
  if (patch.budgetType != null) {
    sets.push('budget_type = :budget_type')
    params.budget_type = patch.budgetType
  }
  if (patch.budget != null) {
    sets.push('budget = :budget')
    params.budget = patch.budget
  }
  if (patch.hourlyRate != null) {
    sets.push('hourly_rate = :hourly_rate')
    params.hourly_rate = patch.hourlyRate
  }
  if (patch.jobType != null) {
    sets.push('job_type = :job_type')
    params.job_type = patch.jobType
  }
  if (patch.deadline !== undefined) {
    sets.push('deadline = :deadline')
    params.deadline = patch.deadline
  }
  if (patch.duration !== undefined) {
    sets.push('duration = :duration')
    params.duration = patch.duration
  }
  if (patch.skills != null) {
    sets.push('skills_json = :skills_json')
    params.skills_json = JSON.stringify(patch.skills)
  }
  if (patch.visibility != null) {
    sets.push('visibility = :visibility')
    params.visibility = patch.visibility
  }
  if (patch.freelancersNeeded != null) {
    sets.push('freelancers_needed = :freelancers_needed')
    params.freelancers_needed = patch.freelancersNeeded
  }
  if (patch.experienceLevel != null) {
    sets.push('experience_level = :experience_level')
    params.experience_level = patch.experienceLevel
  }
  if (patch.attachments != null) {
    sets.push('attachments_json = :attachments_json')
    params.attachments_json = JSON.stringify(patch.attachments)
  }
  if (patch.status != null) {
    sets.push('status = :status')
    params.status = patch.status
  }
  if (patch.selectedFreelancerId !== undefined) {
    sets.push('selected_freelancer_id = :selected_freelancer_id')
    params.selected_freelancer_id = patch.selectedFreelancerId
  }

  if (sets.length) await pool.query(`UPDATE jobs SET ${sets.join(', ')} WHERE id = :id`, params)
  return getJobById(id)
}

export async function deleteJob(id: string, clientId: string): Promise<boolean> {
  const existing = await getJobById(id)
  if (!existing || existing.clientId !== clientId) return false
  const pool = getPool()
  await pool.execute(`DELETE FROM jobs WHERE id = :id`, { id })
  return true
}

export async function incrementJobProposalCount(jobId: string, delta: number): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `UPDATE jobs SET proposals_count = GREATEST(0, proposals_count + :d) WHERE id = :id`,
    { d: delta, id: jobId }
  )
}

function mapProposalRow(r: RowDataPacket, jobTitle?: string): JobProposalRow {
  return {
    id: r.id,
    jobId: r.job_id,
    freelancerId: r.freelancer_id,
    freelancerName: String(r.freelancer_name ?? ''),
    bidAmount: Number(r.bid_amount),
    coverLetter: String(r.cover_letter ?? ''),
    cvFileName: r.cv_file_name ?? null,
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    jobTitle,
  }
}

export async function createJobProposal(input: {
  jobId: string
  freelancerId: string
  bidAmount: number
  coverLetter: string
  cvFileName: string | null
}): Promise<JobProposalRow> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO job_proposals (id, job_id, freelancer_id, bid_amount, cover_letter, cv_file_name, status)
     VALUES (:id, :job_id, :freelancer_id, :bid_amount, :cover_letter, :cv_file_name, 'pending')`,
    {
      id,
      job_id: input.jobId,
      freelancer_id: input.freelancerId,
      bid_amount: input.bidAmount,
      cover_letter: input.coverLetter,
      cv_file_name: input.cvFileName,
    }
  )
  await incrementJobProposalCount(input.jobId, 1)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.*, u.name AS freelancer_name FROM job_proposals jp
     JOIN users u ON u.id = jp.freelancer_id WHERE jp.id = :id LIMIT 1`,
    { id }
  )
  if (!rows.length) throw new Error('Failed to load proposal')
  return mapProposalRow(rows[0]!)
}

export async function listProposalsByFreelancer(freelancerId: string): Promise<JobProposalRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.*, u.name AS freelancer_name, j.title AS job_title
     FROM job_proposals jp
     JOIN users u ON u.id = jp.freelancer_id
     JOIN jobs j ON j.id = jp.job_id
     WHERE jp.freelancer_id = :freelancerId
     ORDER BY jp.created_at DESC`,
    { freelancerId }
  )
  return rows.map((r) => mapProposalRow(r, String(r.job_title ?? '')))
}

export async function listProposalsForClientJobs(clientId: string): Promise<JobProposalRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.*, u.name AS freelancer_name, j.title AS job_title
     FROM job_proposals jp
     JOIN jobs j ON j.id = jp.job_id
     JOIN users u ON u.id = jp.freelancer_id
     WHERE j.client_id = :clientId
     ORDER BY jp.created_at DESC`,
    { clientId }
  )
  return rows.map((r) => mapProposalRow(r, String(r.job_title ?? '')))
}

export async function getProposalById(id: string): Promise<(JobProposalRow & { clientId: string }) | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.*, u.name AS freelancer_name, j.title AS job_title, j.client_id
     FROM job_proposals jp
     JOIN jobs j ON j.id = jp.job_id
     JOIN users u ON u.id = jp.freelancer_id
     WHERE jp.id = :id LIMIT 1`,
    { id }
  )
  if (!rows.length) return null
  const r = rows[0]!
  return {
    ...mapProposalRow(r, String(r.job_title ?? '')),
    clientId: String(r.client_id),
  }
}

export async function updateProposalStatus(
  proposalId: string,
  clientId: string,
  status: 'accepted' | 'rejected' | 'pending' | 'withdrawn'
): Promise<{ proposal: JobProposalRow; job: JobRow } | null> {
  const full = await getProposalById(proposalId)
  if (!full || full.clientId !== clientId) return null

  const pool = getPool()
  if (status === 'accepted') {
    await pool.execute(`UPDATE job_proposals SET status = 'rejected' WHERE job_id = :jobId AND id <> :id`, {
      jobId: full.jobId,
      id: proposalId,
    })
    await pool.execute(`UPDATE job_proposals SET status = 'accepted' WHERE id = :id`, { id: proposalId })
    await pool.execute(
      `UPDATE jobs SET status = 'in_progress', selected_freelancer_id = :fid WHERE id = :jobId`,
      { fid: full.freelancerId, jobId: full.jobId }
    )
  } else {
    await pool.execute(`UPDATE job_proposals SET status = :st WHERE id = :id`, { st: status, id: proposalId })
  }

  const [proposalRows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.*, u.name AS freelancer_name, j.title AS job_title FROM job_proposals jp
     JOIN users u ON u.id = jp.freelancer_id
     JOIN jobs j ON j.id = jp.job_id
     WHERE jp.id = :id LIMIT 1`,
    { id: proposalId }
  )
  const pr = proposalRows[0]
  const job = await getJobById(full.jobId)
  if (!pr || !job) return null
  return { proposal: mapProposalRow(pr, String(pr.job_title ?? '')), job }
}

export async function withdrawProposal(proposalId: string, freelancerId: string): Promise<boolean> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, job_id, freelancer_id, status FROM job_proposals WHERE id = :id LIMIT 1`,
    { id: proposalId }
  )
  if (!rows.length) return false
  const r = rows[0]!
  if (r.freelancer_id !== freelancerId || r.status !== 'pending') return false
  await pool.execute(`UPDATE job_proposals SET status = 'withdrawn' WHERE id = :id`, { id: proposalId })
  await incrementJobProposalCount(String(r.job_id), -1)
  return true
}
