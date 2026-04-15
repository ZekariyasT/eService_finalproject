import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'
import * as jobRepo from './job.repository.js'

export interface ContractDeliveryRow {
  id: string
  jobId: string
  freelancerId: string
  summary: string
  linkUrl: string | null
  status: string
  clientFeedback: string | null
  createdAt: string
  reviewedAt: string | null
}

function mapRow(r: RowDataPacket): ContractDeliveryRow {
  return {
    id: String(r.id),
    jobId: String(r.job_id),
    freelancerId: String(r.freelancer_id),
    summary: String(r.summary),
    linkUrl: r.link_url != null ? String(r.link_url) : null,
    status: String(r.status),
    clientFeedback: r.client_feedback != null ? String(r.client_feedback) : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    reviewedAt:
      r.reviewed_at == null
        ? null
        : r.reviewed_at instanceof Date
          ? r.reviewed_at.toISOString()
          : String(r.reviewed_at),
  }
}

export async function listDeliveriesByJob(jobId: string): Promise<ContractDeliveryRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM contract_deliveries WHERE job_id = :jobId ORDER BY created_at DESC`,
    { jobId }
  )
  return rows.map(mapRow)
}

export async function getDeliveryById(id: string): Promise<ContractDeliveryRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM contract_deliveries WHERE id = :id LIMIT 1`,
    { id }
  )
  return rows.length ? mapRow(rows[0]!) : null
}

/** Deliveries awaiting client action block another submission. */
export async function countSubmittedAwaitingReview(jobId: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM contract_deliveries WHERE job_id = :jobId AND status = 'submitted'`,
    { jobId }
  )
  return Number(rows[0]?.c ?? 0)
}

export async function createDelivery(input: {
  jobId: string
  freelancerId: string
  summary: string
  linkUrl: string | null
}): Promise<ContractDeliveryRow | null> {
  const contract = await jobRepo.getContractById(input.jobId)
  if (!contract || contract.freelancerId !== input.freelancerId || contract.status !== 'in_progress') {
    return null
  }

  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO contract_deliveries (id, job_id, freelancer_id, summary, link_url, status)
     VALUES (:id, :job_id, :freelancer_id, :summary, :link_url, 'submitted')`,
    {
      id,
      job_id: input.jobId,
      freelancer_id: input.freelancerId,
      summary: input.summary,
      link_url: input.linkUrl,
    }
  )
  return getDeliveryById(id)
}

export async function approveDelivery(
  deliveryId: string,
  clientId: string
): Promise<{ delivery: ContractDeliveryRow; contract: jobRepo.ContractRow } | null> {
  const delivery = await getDeliveryById(deliveryId)
  if (!delivery || delivery.status !== 'submitted') return null

  const contract = await jobRepo.getContractById(delivery.jobId)
  if (!contract || contract.clientId !== clientId || contract.status !== 'in_progress') return null

  const pool = getPool()
  await pool.execute(
    `UPDATE contract_deliveries
     SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP
     WHERE id = :id`,
    { id: deliveryId }
  )
  await pool.execute(`UPDATE jobs SET status = 'completed' WHERE id = :jobId`, { jobId: delivery.jobId })

  const updatedDelivery = await getDeliveryById(deliveryId)
  const updatedContract = await jobRepo.getContractById(delivery.jobId)
  if (!updatedDelivery || !updatedContract) return null
  return { delivery: updatedDelivery, contract: updatedContract }
}

export async function requestDeliveryChanges(
  deliveryId: string,
  clientId: string,
  feedback: string
): Promise<ContractDeliveryRow | null> {
  const delivery = await getDeliveryById(deliveryId)
  if (!delivery || delivery.status !== 'submitted') return null

  const contract = await jobRepo.getContractById(delivery.jobId)
  if (!contract || contract.clientId !== clientId || contract.status !== 'in_progress') return null

  const pool = getPool()
  await pool.execute(
    `UPDATE contract_deliveries
     SET status = 'changes_requested', client_feedback = :feedback, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = :id`,
    { id: deliveryId, feedback }
  )
  return getDeliveryById(deliveryId)
}
