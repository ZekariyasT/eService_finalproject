import type { Response, NextFunction } from 'express'
import type { RowDataPacket } from 'mysql2'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as disputeRepo from '../repositories/dispute.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import * as jobRepo from '../repositories/job.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import { ApiError } from '../errors/api-error.js'
import { getPool } from '../utils/pool.js'

async function resolveRespondent(
  refType: 'service_order' | 'digital_purchase' | 'contract',
  refId: string,
  openerId: string
): Promise<{ respondentId: string; refTitle: string | null }> {
  const pool = getPool()
  if (refType === 'contract') {
    const contract = await jobRepo.getContractById(refId)
    if (!contract) throw new ApiError(404, 'Contract not found')
    const isClient = contract.clientId === openerId
    const isFreelancer = contract.freelancerId === openerId
    if (!isClient && !isFreelancer) {
      throw new ApiError(403, 'You are not part of this contract')
    }
    const respondentId = isClient ? contract.freelancerId : contract.clientId
    return { respondentId, refTitle: contract.title }
  }
  if (refType === 'service_order') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT so.client_id, so.freelancer_id, s.title
         FROM service_orders so
         LEFT JOIN services s ON s.id = so.service_id
        WHERE so.id = :refId LIMIT 1`,
      { refId }
    )
    const r = rows[0]
    if (!r) throw new ApiError(404, 'Service order not found')
    if (r.client_id !== openerId && r.freelancer_id !== openerId) {
      throw new ApiError(403, 'You can only open disputes on your own orders.')
    }
    const respondentId = r.client_id === openerId ? String(r.freelancer_id) : String(r.client_id)
    return { respondentId, refTitle: r.title ? String(r.title) : null }
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT dp.buyer_id, p.creator_id, p.title
       FROM digital_purchases dp
       LEFT JOIN digital_products p ON p.id = dp.product_id
      WHERE dp.id = :refId LIMIT 1`,
    { refId }
  )
  const r = rows[0]
  if (!r) throw new ApiError(404, 'Purchase not found')
  if (r.buyer_id !== openerId && r.creator_id !== openerId) {
    throw new ApiError(403, 'You can only open disputes on your own purchases.')
  }
  const respondentId = r.buyer_id === openerId ? String(r.creator_id) : String(r.buyer_id)
  return { respondentId, refTitle: r.title ? String(r.title) : null }
}

export async function mine(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const list = await disputeRepo.listDisputesForUser(req.auth!.userId)
    return res.json({ disputes: list })
  } catch (e) {
    return next(e)
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      respondentId: z.string().min(1).optional(),
      refType: z.enum(['service_order', 'digital_purchase', 'contract']),
      refId: z.string().min(1),
      reason: z.string().min(1).max(4000),
    })
    const body = schema.parse(req.body)
    const openedBy = req.auth!.userId

    let respondentId = body.respondentId
    let refTitle: string | null = null
    if (!respondentId) {
      const resolved = await resolveRespondent(body.refType, body.refId, openedBy)
      respondentId = resolved.respondentId
      refTitle = resolved.refTitle
    }
    if (respondentId === openedBy) throw new ApiError(400, 'Invalid respondent')

    const respondent = await userRepo.findUserById(respondentId)
    if (!respondent) throw new ApiError(404, 'User not found')

    if (body.refType === 'contract') {
      const contract = await jobRepo.getContractById(body.refId)
      if (!contract) throw new ApiError(404, 'Contract not found')
      const isClient = contract.clientId === openedBy
      const isFreelancer = contract.freelancerId === openedBy
      if (!isClient && !isFreelancer) throw new ApiError(403, 'You are not part of this contract')
      const expectedRespondent = isClient ? contract.freelancerId : contract.clientId
      if (body.respondentId != null && body.respondentId !== expectedRespondent) {
        throw new ApiError(400, 'Invalid respondent for this contract')
      }
    }

    const d = await disputeRepo.createDispute({
      openedBy,
      respondentId,
      refType: body.refType,
      refId: body.refId,
      reason: body.reason,
    })
    const openerUser = await userRepo.findUserById(openedBy)
    const refLabel = refTitle ? `"${refTitle}"` : body.refType.replace(/_/g, ' ')
    await notificationRepo
      .createNotification(
        respondentId,
        'Dispute opened',
        `${openerUser?.name ?? 'A user'} opened a dispute on ${refLabel}. Reason: ${body.reason.slice(0, 200)}`,
        'dispute'
      )
      .catch(() => {})

    const adminRows = await userRepo.findAdminUserIds().catch(() => [])
    for (const adminId of adminRows) {
      await notificationRepo
        .createNotification(
          adminId,
          'New dispute filed',
          `${openerUser?.name ?? 'A user'} filed a dispute on ${refLabel}. Review it in the admin disputes panel.`,
          'dispute'
        )
        .catch(() => {})
    }

    return res.status(201).json({ dispute: d })
  } catch (e) {
    return next(e)
  }
}
