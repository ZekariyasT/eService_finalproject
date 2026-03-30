import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'
import * as jobRepo from './job.repository.js'

export interface HireInvitationRow {
  id: string
  clientId: string
  clientName: string
  freelancerId: string
  freelancerName: string
  serviceId: string | null
  serviceTitle: string | null
  jobId: string | null
  jobTitle: string | null
  title: string
  message: string
  proposedAmount: number
  status: string
  createdAt: string
  respondedAt: string | null
}

function mapRow(r: RowDataPacket): HireInvitationRow {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    clientName: String(r.client_name ?? ''),
    freelancerId: String(r.freelancer_id),
    freelancerName: String(r.freelancer_name ?? ''),
    serviceId: r.service_id ? String(r.service_id) : null,
    serviceTitle: r.service_title != null ? String(r.service_title) : null,
    jobId: r.job_id ? String(r.job_id) : null,
    jobTitle: r.job_title != null ? String(r.job_title) : null,
    title: String(r.title),
    message: String(r.message),
    proposedAmount: Number(r.proposed_amount ?? 0),
    status: String(r.status),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    respondedAt:
      r.responded_at == null
        ? null
        : r.responded_at instanceof Date
          ? r.responded_at.toISOString()
          : String(r.responded_at),
  }
}

const SELECT_BASE = `
  SELECT hi.*,
    c.name AS client_name,
    f.name AS freelancer_name,
    s.title AS service_title,
    j.title AS job_title
  FROM hire_invitations hi
  JOIN users c ON c.id = hi.client_id
  JOIN users f ON f.id = hi.freelancer_id
  LEFT JOIN services s ON s.id = hi.service_id
  LEFT JOIN jobs j ON j.id = hi.job_id
`

export async function findPendingDuplicate(
  clientId: string,
  freelancerId: string,
  serviceId: string | null,
  jobId: string | null
): Promise<boolean> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM hire_invitations
     WHERE client_id = :clientId AND freelancer_id = :freelancerId AND status = 'pending'
       AND service_id <=> :serviceId
       AND job_id <=> :jobId
     LIMIT 1`,
    { clientId, freelancerId, serviceId, jobId }
  )
  return rows.length > 0
}

export async function createInvitation(input: {
  clientId: string
  freelancerId: string
  serviceId: string | null
  jobId: string | null
  title: string
  message: string
  proposedAmount: number
}): Promise<HireInvitationRow> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO hire_invitations (
      id, client_id, freelancer_id, service_id, job_id, title, message, proposed_amount, status
    ) VALUES (
      :id, :client_id, :freelancer_id, :service_id, :job_id, :title, :message, :proposed_amount, 'pending'
    )`,
    {
      id,
      client_id: input.clientId,
      freelancer_id: input.freelancerId,
      service_id: input.serviceId,
      job_id: input.jobId,
      title: input.title,
      message: input.message,
      proposed_amount: input.proposedAmount,
    }
  )
  const row = await getById(id)
  if (!row) throw new Error('Failed to load hire invitation')
  return row
}

export async function getById(id: string): Promise<HireInvitationRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE hi.id = :id LIMIT 1`, { id })
  return rows.length ? mapRow(rows[0]!) : null
}

export async function listSentByClient(clientId: string): Promise<HireInvitationRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE} WHERE hi.client_id = :clientId ORDER BY hi.created_at DESC`,
    { clientId }
  )
  return rows.map(mapRow)
}

export async function listReceivedByFreelancer(freelancerId: string): Promise<HireInvitationRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE} WHERE hi.freelancer_id = :freelancerId ORDER BY hi.created_at DESC`,
    { freelancerId }
  )
  return rows.map(mapRow)
}

async function attachFreelancerToJob(
  jobId: string,
  freelancerId: string,
  bidAmount: number,
  coverLetter: string
): Promise<void> {
  const pool = getPool()
  const proposalId = randomUUID()
  await pool.execute(
    `INSERT INTO job_proposals (id, job_id, freelancer_id, bid_amount, cover_letter, cv_file_name, status)
     VALUES (:id, :job_id, :freelancer_id, :bid_amount, :cover_letter, NULL, 'accepted')
     ON DUPLICATE KEY UPDATE status = 'accepted', bid_amount = VALUES(bid_amount), cover_letter = VALUES(cover_letter)`,
    {
      id: proposalId,
      job_id: jobId,
      freelancer_id: freelancerId,
      bid_amount: bidAmount,
      cover_letter: coverLetter,
    }
  )
  await pool.execute(`UPDATE job_proposals SET status = 'rejected' WHERE job_id = :jobId AND freelancer_id <> :fid`, {
    jobId,
    fid: freelancerId,
  })
  await pool.execute(
    `UPDATE jobs SET status = 'in_progress', selected_freelancer_id = :fid WHERE id = :jobId`,
    { fid: freelancerId, jobId }
  )
}

export async function acceptInvitation(
  invitationId: string,
  freelancerId: string
): Promise<{ invitation: HireInvitationRow; jobId: string } | null> {
  const invitation = await getById(invitationId)
  if (!invitation || invitation.freelancerId !== freelancerId || invitation.status !== 'pending') return null

  let jobId = invitation.jobId
  if (!jobId) {
    const job = await jobRepo.createJob({
      clientId: invitation.clientId,
      title: invitation.title,
      description: invitation.message,
      category: 'General',
      budgetType: 'fixed',
      budget: invitation.proposedAmount,
      hourlyRate: 0,
      jobType: 'contract',
      deadline: null,
      duration: null,
      skills: [],
      visibility: 'private',
      freelancersNeeded: 1,
      experienceLevel: 'mid',
      attachments: [],
      status: 'in_progress',
    })
    jobId = job.id
    await attachFreelancerToJob(jobId, freelancerId, invitation.proposedAmount, invitation.message)
  } else {
    const job = await jobRepo.getJobById(jobId)
    if (!job || job.clientId !== invitation.clientId || job.status !== 'open') return null
    await attachFreelancerToJob(jobId, freelancerId, invitation.proposedAmount, invitation.message)
  }

  const pool = getPool()
  await pool.execute(
    `UPDATE hire_invitations SET status = 'accepted', responded_at = CURRENT_TIMESTAMP, job_id = :jobId WHERE id = :id`,
    { id: invitationId, jobId }
  )

  const updated = await getById(invitationId)
  if (!updated) return null
  return { invitation: updated, jobId }
}

export async function declineInvitation(invitationId: string, freelancerId: string): Promise<HireInvitationRow | null> {
  const invitation = await getById(invitationId)
  if (!invitation || invitation.freelancerId !== freelancerId || invitation.status !== 'pending') return null

  const pool = getPool()
  await pool.execute(
    `UPDATE hire_invitations SET status = 'declined', responded_at = CURRENT_TIMESTAMP WHERE id = :id`,
    { id: invitationId }
  )
  return getById(invitationId)
}

export async function cancelInvitation(invitationId: string, clientId: string): Promise<HireInvitationRow | null> {
  const invitation = await getById(invitationId)
  if (!invitation || invitation.clientId !== clientId || invitation.status !== 'pending') return null

  const pool = getPool()
  await pool.execute(
    `UPDATE hire_invitations SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP WHERE id = :id`,
    { id: invitationId }
  )
  return getById(invitationId)
}
