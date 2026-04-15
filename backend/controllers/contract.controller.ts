import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import { ApiError } from '../errors/api-error.js'
import * as jobRepo from '../repositories/job.repository.js'
import * as deliveryRepo from '../repositories/contract-delivery.repository.js'
import * as reviewRepo from '../repositories/review.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as walletRepo from '../repositories/wallet.repository.js'
import * as coinRepo from '../repositories/coin.repository.js'
import { getCommissionPercent } from '../repositories/platform-settings.repository.js'

async function getParticipantContract(id: string, userId: string) {
  const contract = await jobRepo.getContractById(id)
  if (!contract) throw new ApiError(404, 'Contract not found')
  if (contract.clientId !== userId && contract.freelancerId !== userId) {
    throw new ApiError(404, 'Contract not found')
  }
  return contract
}

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const role = req.auth!.role
    const userId = req.auth!.userId

    if (role === 'freelancer') {
      const contracts = await jobRepo.listContractsByFreelancer(userId)
      return res.json({ contracts })
    }
    if (role === 'client') {
      const contracts = await jobRepo.listContractsByClient(userId)
      return res.json({ contracts })
    }

    throw new ApiError(403, 'Only clients and freelancers can view contracts')
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const userId = req.auth!.userId
    const contract = await getParticipantContract(id, userId)
    const deliveries = await deliveryRepo.listDeliveriesByJob(id)
    return res.json({ contract, deliveries })
  } catch (e) {
    return next(e)
  }
}

export async function updateDeadline(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const userId = req.auth!.userId
    if (req.auth!.role !== 'client') throw new ApiError(403, 'Only clients can set contract deadlines')

    const body = z
      .object({
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      })
      .parse(req.body)

    const contract = await jobRepo.updateContractDeadline(id, userId, body.deadline)
    if (!contract) throw new ApiError(404, 'Contract not found')
    return res.json({ contract })
  } catch (e) {
    return next(e)
  }
}

function normalizeDeliveryLinkUrl(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  const t = String(raw).trim()
  if (!t) return null
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new ApiError(400, 'Delivery link must start with http:// or https:// (or paste a domain and we will add https).')
    }
    return withScheme.slice(0, 768)
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(400, 'Delivery link is not a valid URL. Leave it blank or use a full link (e.g. https://…).')
  }
}

export async function submitDelivery(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const userId = req.auth!.userId
    if (req.auth!.role !== 'freelancer') throw new ApiError(403, 'Only freelancers can submit work')

    const body = z
      .object({
        summary: z.string().min(10).max(4000),
        linkUrl: z.union([z.string(), z.literal(''), z.null()]).optional(),
      })
      .parse(req.body)

    const contract = await jobRepo.getContractById(id)
    if (!contract) throw new ApiError(404, 'Contract not found')
    if (contract.freelancerId !== userId) {
      throw new ApiError(403, 'Only the assigned freelancer can submit deliveries for this contract.')
    }
    if (contract.status !== 'in_progress') {
      const hint =
        contract.status === 'completed'
          ? 'This contract is already completed, so no more deliveries can be submitted.'
          : contract.status === 'cancelled'
            ? 'This contract was cancelled.'
            : `Deliveries are only accepted while the contract is active (current status: ${contract.status}).`
      throw new ApiError(400, hint)
    }

    const awaiting = await deliveryRepo.countSubmittedAwaitingReview(id)
    if (awaiting > 0) {
      throw new ApiError(
        400,
        'You already have a delivery waiting for the client. Wait for approval or feedback before submitting again.'
      )
    }

    const linkUrl = normalizeDeliveryLinkUrl(body.linkUrl)

    const delivery = await deliveryRepo.createDelivery({
      jobId: id,
      freelancerId: userId,
      summary: body.summary.trim(),
      linkUrl,
    })
    if (!delivery) throw new ApiError(400, 'Could not record this delivery. Refresh and try again.')

    return res.status(201).json({ delivery })
  } catch (e) {
    return next(e)
  }
}

export async function approveDelivery(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const deliveryId = z.string().min(1).parse(req.params.deliveryId)
    const userId = req.auth!.userId
    if (req.auth!.role !== 'client') throw new ApiError(403, 'Only clients can approve work')

    const result = await deliveryRepo.approveDelivery(deliveryId, userId)
    if (!result) throw new ApiError(404, 'Delivery not found')

    return res.json(result)
  } catch (e) {
    return next(e)
  }
}

export async function complete(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const userId = req.auth!.userId
    if (req.auth!.role !== 'client') throw new ApiError(403, 'Only clients can end contracts')

    const preContract = await jobRepo.getContractById(id)
    if (!preContract || preContract.clientId !== userId) throw new ApiError(404, 'Contract not found')

    const contract = await jobRepo.completeContractByClient(id, userId)
    if (!contract) {
      throw new ApiError(
        400,
        'This contract can only be ended after at least one approved delivery when no milestones are used'
      )
    }

    const grossAmount = preContract.budget
    if (grossAmount > 0 && preContract.freelancerId) {
      const { netAmount, commissionAmount } = await walletRepo.collectCommission(
        preContract.freelancerId,
        grossAmount,
        { ref: 'contract_complete', jobId: id }
      )
      await walletRepo.credit(preContract.freelancerId, netAmount, 'job_payment', {
        jobId: id,
        gross: grossAmount,
        commission: commissionAmount,
      })
      const commissionPct = await getCommissionPercent()
      await notificationRepo
        .createNotification(
          preContract.freelancerId,
          'Payment received',
          `You earned ${netAmount.toFixed(2)} Br for completing the contract (${commissionPct}% platform fee applied).`,
          'payment'
        )
        .catch(() => {})
    }

    void coinRepo.rewardJobPost(preContract.clientId, id).catch(() => {})

    return res.json({ contract })
  } catch (e) {
    return next(e)
  }
}

const contractEndReasonSchema = z.enum([
  'no_longer_needed',
  'job_completed',
  'freelancer_not_responsive',
  'freelancer_misrepresented_skills',
  'hired_different_freelancer',
  'other',
])

const contractEndReasonLabels: Record<z.infer<typeof contractEndReasonSchema>, string> = {
  no_longer_needed: 'I no longer need this work completed',
  job_completed: 'Job completed successfully',
  freelancer_not_responsive: 'Freelancer not responsive',
  freelancer_misrepresented_skills: 'Freelancer misrepresented his/her skills',
  hired_different_freelancer: 'I hired a different freelancer',
  other: 'Another reason',
}

const freelancerFeedbackCategoryLabels = {
  skills: 'Skills',
  qualityOfWork: 'Quality of Work',
  availability: 'Availability',
  adherenceToSchedule: 'Adherence to Schedule',
  communication: 'Communication',
  cooperation: 'Cooperation',
} as const

const freelancerFeedbackScoresSchema = z.object({
  skills: z.number().min(1).max(5),
  qualityOfWork: z.number().min(1).max(5),
  availability: z.number().min(1).max(5),
  adherenceToSchedule: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
  cooperation: z.number().min(1).max(5),
})

function averageFeedbackScores(scores: z.infer<typeof freelancerFeedbackScoresSchema>): number {
  const values = Object.values(scores)
  const total = values.reduce((sum, value) => sum + value, 0)
  return Math.round((total / values.length) * 10) / 10
}

function formatCancellationReviewComment(
  reason: z.infer<typeof contractEndReasonSchema>,
  reasonNote: string | undefined,
  scores: z.infer<typeof freelancerFeedbackScoresSchema>
): string {
  const lines = [`Reason: ${contractEndReasonLabels[reason]}`]
  if (reasonNote?.trim()) lines.push(`Note: ${reasonNote.trim()}`)
  lines.push('', 'Feedback:')
  for (const [key, label] of Object.entries(freelancerFeedbackCategoryLabels)) {
    const score = scores[key as keyof typeof freelancerFeedbackCategoryLabels]
    lines.push(`- ${label}: ${score}/5`)
  }
  return lines.join('\n')
}

export async function close(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const userId = req.auth!.userId
    if (req.auth!.role !== 'client') throw new ApiError(403, 'Only clients can close contracts')

    const body = z
      .object({
        reason: contractEndReasonSchema,
        reasonNote: z.string().max(2000).optional(),
        categoryScores: freelancerFeedbackScoresSchema,
      })
      .superRefine((value, ctx) => {
        if (value.reason === 'other' && (!value.reasonNote || value.reasonNote.trim().length < 5)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Add a short note for your selected reason.',
            path: ['reasonNote'],
          })
        }
      })
      .parse(req.body)

    const existing = await jobRepo.getContractById(id)
    if (!existing || existing.clientId !== userId) throw new ApiError(404, 'Contract not found')
    if (existing.status !== 'in_progress') {
      throw new ApiError(400, 'Only active contracts can be cancelled')
    }

    const priorReview = await reviewRepo.findReviewForJobByReviewer(id, userId)
    if (priorReview) throw new ApiError(409, 'You already left feedback for this contract')

    const rating = averageFeedbackScores(body.categoryScores)
    const reviewComment = formatCancellationReviewComment(
      body.reason,
      body.reasonNote?.trim(),
      body.categoryScores
    )
    const review = await reviewRepo.createReview({
      reviewerId: userId,
      targetUserId: existing.freelancerId,
      jobId: id,
      rating,
      comment: reviewComment,
    })

    const contract = await jobRepo.closeContractByClient(id, userId)
    if (!contract) throw new ApiError(404, 'Contract not found')

    const reviewer = await userRepo.findUserById(userId)
    await notificationRepo
      .createNotification(
        existing.freelancerId,
        'Contract cancelled',
        `${reviewer?.name ?? 'The client'} cancelled the contract and left ${rating}★ feedback.`,
        'review'
      )
      .catch(() => {})

    return res.json({
      contract,
      reason: contractEndReasonLabels[body.reason],
      review,
    })
  } catch (e) {
    return next(e)
  }
}

export async function feedback(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const userId = req.auth!.userId
    await getParticipantContract(id, userId)
    const reviews = await reviewRepo.listReviewsForJob(id)
    return res.json({
      myReview: reviews.find((review) => review.reviewerId === userId) ?? null,
      partnerReview: reviews.find((review) => review.targetUserId === userId) ?? null,
    })
  } catch (e) {
    return next(e)
  }
}

export async function submitFeedback(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const userId = req.auth!.userId
    const contract = await getParticipantContract(id, userId)
    if (contract.status !== 'completed') {
      throw new ApiError(400, 'Feedback is available after the contract ends')
    }

    const body = z
      .object({
        rating: z.number().min(1).max(5),
        comment: z.string().min(1).max(2000),
      })
      .parse(req.body)

    const targetUserId = contract.clientId === userId ? contract.freelancerId : contract.clientId
    const existing = await reviewRepo.findReviewForJobByReviewer(id, userId)
    if (existing) throw new ApiError(409, 'You already left feedback for this contract')

    const review = await reviewRepo.createReview({
      reviewerId: userId,
      targetUserId,
      jobId: id,
      rating: body.rating,
      comment: body.comment.trim(),
    })

    const reviewer = await userRepo.findUserById(userId)
    await notificationRepo
      .createNotification(
        targetUserId,
        'New review received',
        `${reviewer?.name ?? 'Your partner'} left ${body.rating}★ feedback after a completed contract.`,
        'review'
      )
      .catch(() => {})

    return res.status(201).json({ review })
  } catch (e) {
    return next(e)
  }
}

export async function requestDeliveryChanges(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const deliveryId = z.string().min(1).parse(req.params.deliveryId)
    const userId = req.auth!.userId
    if (req.auth!.role !== 'client') throw new ApiError(403, 'Only clients can request changes')

    const body = z
      .object({
        feedback: z.string().min(5).max(2000),
      })
      .parse(req.body)

    const delivery = await deliveryRepo.requestDeliveryChanges(deliveryId, userId, body.feedback.trim())
    if (!delivery) throw new ApiError(404, 'Delivery not found')

    return res.json({ delivery })
  } catch (e) {
    return next(e)
  }
}
