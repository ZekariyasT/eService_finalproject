import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as jobRepo from '../repositories/job.repository.js'
import type { JobRow } from '../repositories/job.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import * as coinRepo from '../repositories/coin.repository.js'
import * as walletRepo from '../repositories/wallet.repository.js'
import * as platformSettings from '../repositories/platform-settings.repository.js'
import { notifyFreelancersNewPublicJob, shouldBroadcastNewJob } from '../services/job-notifications.service.js'
import { ApiError } from '../errors/api-error.js'

function publicJob(j: JobRow & { clientTrust?: unknown }) {
  const { clientId: _c, selectedFreelancerId: _s, selectedFreelancerName: _n, ...rest } = j
  return rest
}

/**
 * Server-side trust & payment gate that must pass before a job moves to `open`.
 * Returns a list of human-readable failure reasons (empty = all clear).
 */
async function assertClientCanPublishJob(
  userId: string,
  jobBudget: number,
): Promise<string[]> {
  const [user, settings] = await Promise.all([
    userRepo.findPublicUserById(userId),
    platformSettings.getJobPublishSettings(),
  ])
  if (!user) return ['User not found.']

  const errors: string[] = []

  if (!user.isActive) errors.push('Your account is suspended.')
  if (!user.verified) errors.push('Please verify your email before publishing a job.')

  if (settings.requireIdVerification && user.verificationStatus !== 'approved') {
    errors.push('ID verification must be approved before you can publish jobs.')
  }

  if ((user.profileComplete ?? 0) < settings.minProfileComplete) {
    errors.push(`Complete your profile to at least ${settings.minProfileComplete}% (currently ${user.profileComplete ?? 0}%).`)
  }

  if (!user.phone) errors.push('Add a phone number to your profile.')

  if (user.role === 'client' && !(user as { verifiedPayment?: boolean }).verifiedPayment) {
    errors.push('Top up your wallet at least once to verify your payment method.')
  }

  try {
    const wallet = await walletRepo.getWallet(userId)
    const requiredBalance = Math.max(settings.minWalletBalance, jobBudget)
    if (wallet.balance < requiredBalance) {
      errors.push(`Wallet balance must be at least ${requiredBalance} Br (current: ${wallet.balance} Br).`)
    }
  } catch {
    errors.push('Set up your wallet and add funds before publishing.')
  }

  const pool = (await import('../utils/pool.js')).getPool()
  const [openRows] = await pool.query<import('mysql2').RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM jobs WHERE client_id = :userId AND status = 'open'`,
    { userId },
  )
  if (Number(openRows[0]?.c ?? 0) >= settings.maxOpenJobs) {
    errors.push(`You can have at most ${settings.maxOpenJobs} open jobs at a time.`)
  }

  const [dayRows] = await pool.query<import('mysql2').RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM jobs
     WHERE client_id = :userId AND status = 'open'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    { userId },
  )
  if (Number(dayRows[0]?.c ?? 0) >= settings.maxPerDay) {
    errors.push(`You can publish at most ${settings.maxPerDay} jobs per day.`)
  }

  return errors
}

/** Public endpoint so the client UI can pre-flight check before publish. */
export async function preflightPublish(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const budget = Number(req.query.budget) || 0
    const errors = await assertClientCanPublishJob(uid, budget)
    const settings = await platformSettings.getJobPublishSettings()
    return res.json({ canPublish: errors.length === 0, errors, settings })
  } catch (e) {
    return next(e)
  }
}

export async function listOpen(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await jobRepo.listOpenPublicJobs(50)
    return res.json({ jobs: items.map(publicJob) })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const job = await jobRepo.getJobById(id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    const uid = req.auth?.userId
    const isOwner = uid && job.clientId === uid
    if (job.status !== 'open' || job.visibility !== 'public') {
      if (!isOwner) return res.status(404).json({ error: 'Job not found' })
      return res.json({ job })
    }
    return res.json({ job: isOwner ? job : publicJob(job) })
  } catch (e) {
    return next(e)
  }
}

function computeBudget(body: {
  budgetType: string
  fixedBudget?: string
  minBudget?: string
  maxBudget?: string
  hourlyRate?: string
}): { budget: number; hourlyRate: number; jobType: string } {
  if (body.budgetType === 'fixed') {
    return { budget: Number(body.fixedBudget || 0), hourlyRate: 0, jobType: 'contract' }
  }
  if (body.budgetType === 'hourly') {
    return { budget: 0, hourlyRate: Number(body.hourlyRate || 0), jobType: 'hourly' }
  }
  return {
    budget: Number(body.maxBudget || body.minBudget || 0),
    hourlyRate: 0,
    jobType: 'contract',
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      title: z.string().min(5, 'Title must be at least 5 characters'),
      description: z.string().min(20, 'Description must be at least 20 characters'),
      category: z.string().min(1),
      budgetType: z.enum(['fixed', 'range', 'hourly']),
      fixedBudget: z.string().optional(),
      minBudget: z.string().optional(),
      maxBudget: z.string().optional(),
      hourlyRate: z.string().optional(),
      deadline: z.string().optional(),
      duration: z.string().optional(),
      visibility: z.enum(['public', 'private']).optional(),
      freelancersNeeded: z.union([z.string(), z.number()]).optional(),
      experienceLevel: z.enum(['junior', 'mid', 'senior']).optional(),
      skills: z.array(z.string()).optional(),
      attachments: z.array(z.object({ name: z.string(), size: z.number().optional() })).optional(),
      status: z.enum(['draft', 'open']),
    })
    const body = schema.parse(req.body)
    const uid = req.auth!.userId

    const { budget, hourlyRate, jobType } = computeBudget(body)

    if (body.status === 'open' && budget <= 0 && hourlyRate <= 0) {
      throw new ApiError(400, 'Budget or hourly rate must be greater than zero to publish a job.')
    }

    if (body.status === 'open') {
      const gateErrors = await assertClientCanPublishJob(uid, budget || hourlyRate)
      if (gateErrors.length) {
        throw new ApiError(403, 'Cannot publish job yet.', { gateErrors })
      }
    }

    const deadlineStr = body.deadline?.trim()
      ? body.deadline.trim().slice(0, 10)
      : null

    const job = await jobRepo.createJob({
      clientId: uid,
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category,
      budgetType: body.budgetType,
      budget,
      hourlyRate,
      jobType,
      deadline: deadlineStr,
      duration: body.duration?.trim() || null,
      skills: body.skills ?? [],
      visibility: body.visibility ?? 'public',
      freelancersNeeded: Number(body.freelancersNeeded ?? 1) || 1,
      experienceLevel: body.experienceLevel ?? 'mid',
      attachments: body.attachments ?? [],
      status: body.status,
    })

    if (shouldBroadcastNewJob(null, job)) {
      void notifyFreelancersNewPublicJob(job, uid).catch(() => {})
    }

    return res.status(201).json({ job })
  } catch (e) {
    return next(e)
  }
}

export async function mine(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const jobs = await jobRepo.listJobsByClient(uid)
    return res.json({ jobs })
  } catch (e) {
    return next(e)
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const uid = req.auth!.userId
    const existingJob = await jobRepo.getJobById(id)
    if (!existingJob || existingJob.clientId !== uid) throw new ApiError(404, 'Job not found')

    const schema = z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        budgetType: z.enum(['fixed', 'range', 'hourly']).optional(),
        fixedBudget: z.string().optional(),
        minBudget: z.string().optional(),
        maxBudget: z.string().optional(),
        hourlyRate: z.string().optional(),
        deadline: z.string().nullable().optional(),
        duration: z.string().nullable().optional(),
        visibility: z.enum(['public', 'private']).optional(),
        freelancersNeeded: z.union([z.string(), z.number()]).optional(),
        experienceLevel: z.enum(['junior', 'mid', 'senior']).optional(),
        skills: z.array(z.string()).optional(),
        attachments: z.array(z.object({ name: z.string(), size: z.number().optional() })).optional(),
        status: z.enum(['draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled']).optional(),
      })
      .strict()
    const body = schema.parse(req.body)

    const patch: Parameters<typeof jobRepo.updateJob>[2] = {}
    if (body.title != null) patch.title = body.title
    if (body.description != null) patch.description = body.description
    if (body.category != null) patch.category = body.category
    if (body.visibility != null) patch.visibility = body.visibility
    if (body.freelancersNeeded != null) patch.freelancersNeeded = Number(body.freelancersNeeded) || 1
    if (body.experienceLevel != null) patch.experienceLevel = body.experienceLevel
    if (body.skills != null) patch.skills = body.skills
    if (body.attachments != null) patch.attachments = body.attachments
    if (body.status != null) patch.status = body.status
    if (body.duration !== undefined) patch.duration = body.duration
    if (body.deadline !== undefined) patch.deadline = body.deadline?.trim() ? body.deadline.trim().slice(0, 10) : null

    if (body.budgetType != null) {
      const { budget, hourlyRate, jobType } = computeBudget({
        budgetType: body.budgetType,
        fixedBudget: body.fixedBudget,
        minBudget: body.minBudget,
        maxBudget: body.maxBudget,
        hourlyRate: body.hourlyRate,
      })
      patch.budgetType = body.budgetType
      patch.budget = budget
      patch.hourlyRate = hourlyRate
      patch.jobType = jobType
    }

    if (patch.status === 'open' && existingJob.status !== 'open') {
      const effectiveBudget = patch.budget ?? existingJob.budget ?? patch.hourlyRate ?? existingJob.hourlyRate ?? 0
      const gateErrors = await assertClientCanPublishJob(uid, effectiveBudget)
      if (gateErrors.length) {
        throw new ApiError(403, 'Cannot publish job yet.', { gateErrors })
      }
    }

    const job = await jobRepo.updateJob(id, uid, patch)
    if (!job) throw new ApiError(404, 'Job not found')

    if (shouldBroadcastNewJob(existingJob, job)) {
      void notifyFreelancersNewPublicJob(job, uid).catch(() => {})
    }

    return res.json({ job })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const uid = req.auth!.userId
    const ok = await jobRepo.deleteJob(id, uid)
    if (!ok) throw new ApiError(404, 'Job not found')
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}

export async function submitProposal(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const jobId = z.string().min(1).parse(req.params.id)
    const schema = z.object({
      bidAmount: z.number().positive(),
      coverLetter: z.string().min(1),
      cvFileName: z.string().max(255).optional().nullable(),
    })
    const body = schema.parse(req.body)
    const freelancerId = req.auth!.userId

    const job = await jobRepo.getJobById(jobId)
    if (!job || job.status !== 'open') throw new ApiError(400, 'Job is not open for proposals')
    if (job.clientId === freelancerId) throw new ApiError(400, 'You cannot propose on your own job')

    try {
      const proposal = await jobRepo.createJobProposal({
        jobId,
        freelancerId,
        bidAmount: body.bidAmount,
        coverLetter: body.coverLetter.trim(),
        cvFileName: body.cvFileName ?? null,
      })
      const freelancer = await userRepo.findUserById(freelancerId)
      await notificationRepo
        .createNotification(
          job.clientId,
          'New proposal on your job',
          `${freelancer?.name ?? 'A freelancer'} submitted a proposal on “${job.title}” — bid $${Number(body.bidAmount).toFixed(2)}.`,
          'job_proposal'
        )
        .catch(() => {})

      return res.status(201).json({ proposal })
    } catch (e: unknown) {
      const err = e as { code?: string; errno?: number }
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        throw new ApiError(409, 'You already submitted a proposal for this job')
      }
      throw e
    }
  } catch (e) {
    return next(e)
  }
}

export async function proposalsMineFreelancer(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const proposals = await jobRepo.listProposalsByFreelancer(uid)
    return res.json({ proposals })
  } catch (e) {
    return next(e)
  }
}

export async function proposalsForClient(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const proposals = await jobRepo.listProposalsForClientJobs(uid)
    return res.json({ proposals })
  } catch (e) {
    return next(e)
  }
}

export async function patchProposal(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const proposalId = z.string().min(1).parse(req.params.proposalId)
    const uid = req.auth!.userId
    const schema = z.object({
      status: z.enum(['accepted', 'rejected']),
    })
    const body = schema.parse(req.body)

    const result = await jobRepo.updateProposalStatus(proposalId, uid, body.status)
    if (!result) throw new ApiError(404, 'Proposal not found')

    if (body.status === 'accepted') {
      void coinRepo.rewardJobAwarded(result.proposal.freelancerId, result.proposal.jobId).catch(() => {})
    }

    return res.json(result)
  } catch (e) {
    return next(e)
  }
}

export async function withdrawMyProposal(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const proposalId = z.string().min(1).parse(req.params.proposalId)
    const uid = req.auth!.userId
    const ok = await jobRepo.withdrawProposal(proposalId, uid)
    if (!ok) throw new ApiError(400, 'Cannot withdraw this proposal')
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}

export async function reportJob(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const jobId = z.string().min(1).parse(req.params.id)
    const body = z.object({ reason: z.string().min(5).max(2000) }).parse(req.body)
    const uid = req.auth!.userId

    const job = await jobRepo.getJobById(jobId)
    if (!job) throw new ApiError(404, 'Job not found')
    if (job.clientId === uid) throw new ApiError(400, 'You cannot report your own job')

    const { randomUUID } = await import('node:crypto')
    const pool = (await import('../utils/pool.js')).getPool()
    await pool.execute(
      `INSERT INTO job_reports (id, job_id, reporter_id, reason) VALUES (:id, :jobId, :reporterId, :reason)`,
      { id: randomUUID(), jobId, reporterId: uid, reason: body.reason.trim() },
    )

    return res.status(201).json({ ok: true, message: 'Report submitted. Thank you for helping keep the platform safe.' })
  } catch (e) {
    return next(e)
  }
}
