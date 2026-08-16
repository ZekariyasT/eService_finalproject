import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

export interface DisputeRow {
  id: string
  openedBy: string
  respondentId: string
  refType: string
  refId: string
  reason: string
  status: string
  resolutionNotes: string | null
  createdAt: string
}

function mapRow(r: RowDataPacket): DisputeRow {
  return {
    id: r.id,
    openedBy: r.opened_by,
    respondentId: r.respondent_id,
    refType: r.ref_type,
    refId: r.ref_id,
    reason: r.reason,
    status: r.status,
    resolutionNotes: r.resolution_notes,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }
}

export async function createDispute(input: {
  openedBy: string
  respondentId: string
  refType: string
  refId: string
  reason: string
}): Promise<DisputeRow> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO disputes (id, opened_by, respondent_id, ref_type, ref_id, reason, status)
     VALUES (:id, :opened_by, :respondent_id, :ref_type, :ref_id, :reason, 'open')`,
    {
      id,
      opened_by: input.openedBy,
      respondent_id: input.respondentId,
      ref_type: input.refType,
      ref_id: input.refId,
      reason: input.reason,
    }
  )
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM disputes WHERE id = :id`, { id })
  return mapRow(rows[0]!)
}

export async function listDisputes(): Promise<DisputeRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM disputes ORDER BY created_at DESC LIMIT 200`)
  return rows.map(mapRow)
}

export interface EnrichedDisputeRow extends DisputeRow {
  openedByName: string | null
  openedByEmail: string | null
  respondentName: string | null
  respondentEmail: string | null
  refTitle: string | null
  refAmount: number | null
}

function mapEnriched(r: RowDataPacket): EnrichedDisputeRow {
  return {
    ...mapRow(r),
    openedByName: r.opener_name ? String(r.opener_name) : null,
    openedByEmail: r.opener_email ? String(r.opener_email) : null,
    respondentName: r.respondent_name ? String(r.respondent_name) : null,
    respondentEmail: r.respondent_email ? String(r.respondent_email) : null,
    refTitle: r.ref_title ? String(r.ref_title) : null,
    refAmount: r.ref_amount != null ? Number(r.ref_amount) : null,
  }
}

const ENRICHED_SELECT = `
  SELECT d.*,
         u_op.name AS opener_name, u_op.email AS opener_email,
         u_rs.name AS respondent_name, u_rs.email AS respondent_email,
         CASE
           WHEN d.ref_type = 'service_order' THEN s.title
           WHEN d.ref_type = 'digital_purchase' THEN p.title
           ELSE NULL
         END AS ref_title,
         CASE
           WHEN d.ref_type = 'service_order' THEN so.total_amount
           WHEN d.ref_type = 'digital_purchase' THEN dp.amount
           ELSE NULL
         END AS ref_amount
  FROM disputes d
  LEFT JOIN users u_op ON u_op.id = d.opened_by
  LEFT JOIN users u_rs ON u_rs.id = d.respondent_id
  LEFT JOIN service_orders so ON d.ref_type = 'service_order' AND so.id = d.ref_id
  LEFT JOIN services s ON s.id = so.service_id
  LEFT JOIN digital_purchases dp ON d.ref_type = 'digital_purchase' AND dp.id = d.ref_id
  LEFT JOIN digital_products p ON p.id = dp.product_id
`

export async function listDisputesEnriched(): Promise<EnrichedDisputeRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `${ENRICHED_SELECT} ORDER BY d.created_at DESC LIMIT 200`
  )
  return rows.map(mapEnriched)
}

export async function listDisputesForUser(userId: string): Promise<EnrichedDisputeRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `${ENRICHED_SELECT}
     WHERE d.opened_by = :userId OR d.respondent_id = :userId
     ORDER BY d.created_at DESC LIMIT 200`,
    { userId }
  )
  return rows.map(mapEnriched)
}

export async function getDisputeById(id: string): Promise<DisputeRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM disputes WHERE id = :id LIMIT 1`, { id })
  return rows.length ? mapRow(rows[0]!) : null
}

export async function updateDispute(
  id: string,
  patch: { status?: string; resolutionNotes?: string | null }
): Promise<DisputeRow | null> {
  const pool = getPool()
  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  if (patch.status != null) {
    sets.push('status = :status')
    params.status = patch.status
  }
  if (patch.resolutionNotes !== undefined) {
    sets.push('resolution_notes = :resolution_notes')
    params.resolution_notes = patch.resolutionNotes
  }
  if (!sets.length) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM disputes WHERE id = :id`, { id })
    return rows.length ? mapRow(rows[0]!) : null
  }
  await pool.query(`UPDATE disputes SET ${sets.join(', ')} WHERE id = :id`, params)
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM disputes WHERE id = :id`, { id })
  return rows.length ? mapRow(rows[0]!) : null
}
