import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import { ApiError } from '../errors/api-error.js'
import * as hireRepo from '../repositories/hire-invitation.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import * as serviceRepo from '../repositories/service.repository.js'
import * as jobRepo from '../repositories/job.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as coinRepo from '../repositories/coin.repository.js'

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const clientId = req.auth!.userId
    const schema = z.object({
      freelancerId: z.string().min(1),
      serviceId: z.string().min(1).optional(),
      jobId: z.string().min(1).optional(),
      title: z.string().min(3).max(255),
      message: z.string().min(10).max(4000),
      proposedAmount: z.number().nonnegative().optional(),
    })
    const body = schema.parse(req.body)

    const freelancer = await userRepo.findUserById(body.freelancerId)
    if (!freelancer || freelancer.role !== 'freelancer') {
      throw new ApiError(400, 'Freelancer not found')
    }
    if (body.freelancerId === clientId) {
      throw new ApiError(400, 'You cannot invite yourself')
    }

    let serviceId: string | null = body.serviceId ?? null
    if (serviceId) {
      const service = await serviceRepo.getServiceById(serviceId)
      if (!service || service.freelancerId !== body.freelancerId) {
        throw new ApiError(400, 'Service not found for this freelancer')
      }
    }

    let jobId: string | null = body.jobId ?? null
    if (jobId) {
      const job = await jobRepo.getJobById(jobId)
      if (!job || job.clientId !== clientId) {
        throw new ApiError(400, 'Job not found')
      }
      if (job.status !== 'open') {
        throw new ApiError(400, 'Only open jobs can receive invitations')
      }
    }

    const duplicate = await hireRepo.findPendingDuplicate(clientId, body.freelancerId, serviceId, jobId)
    if (duplicate) {
      throw new ApiError(409, 'A pending invitation already exists for this expert')
    }

    const invitation = await hireRepo.createInvitation({
      clientId,
      freelancerId: body.freelancerId,
      serviceId,
      jobId,
      title: body.title.trim(),
      message: body.message.trim(),
      proposedAmount: body.proposedAmount ?? 0,
    })

    const client = await userRepo.findUserById(clientId)
    await notificationRepo.createNotification(
      body.freelancerId,
      'Hire invitation',
      `${client?.name ?? 'A client'} invited you to work on “${invitation.title}”.`,
      'hire_invitation'
    )

    return res.status(201).json({ invitation })
  } catch (e) {
    return next(e)
  }
}

export async function sent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invitations = await hireRepo.listSentByClient(req.auth!.userId)
    return res.json({ invitations })
  } catch (e) {
    return next(e)
  }
}

export async function received(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invitations = await hireRepo.listReceivedByFreelancer(req.auth!.userId)
    return res.json({ invitations })
  } catch (e) {
    return next(e)
  }
}

export async function accept(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invitationId = z.string().min(1).parse(req.params.invitationId)
    const freelancerId = req.auth!.userId
    const result = await hireRepo.acceptInvitation(invitationId, freelancerId)
    if (!result) throw new ApiError(404, 'Invitation not found')

    const freelancer = await userRepo.findUserById(freelancerId)
    await notificationRepo.createNotification(
      result.invitation.clientId,
      'Invitation accepted',
      `${freelancer?.name ?? 'The expert'} accepted your hire invitation for “${result.invitation.title}”.`,
      'hire_invitation_accepted'
    )

    void coinRepo.rewardJobAwarded(freelancerId, result.jobId).catch(() => {})

    return res.json(result)
  } catch (e) {
    return next(e)
  }
}

export async function decline(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invitationId = z.string().min(1).parse(req.params.invitationId)
    const freelancerId = req.auth!.userId
    const invitation = await hireRepo.declineInvitation(invitationId, freelancerId)
    if (!invitation) throw new ApiError(404, 'Invitation not found')

    const freelancer = await userRepo.findUserById(freelancerId)
    await notificationRepo.createNotification(
      invitation.clientId,
      'Invitation declined',
      `${freelancer?.name ?? 'The expert'} declined your hire invitation for “${invitation.title}”.`,
      'hire_invitation_declined'
    )

    return res.json({ invitation })
  } catch (e) {
    return next(e)
  }
}

export async function cancel(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const invitationId = z.string().min(1).parse(req.params.invitationId)
    const clientId = req.auth!.userId
    const invitation = await hireRepo.cancelInvitation(invitationId, clientId)
    if (!invitation) throw new ApiError(404, 'Invitation not found')
    return res.json({ invitation })
  } catch (e) {
    return next(e)
  }
}
