import type { JobRow } from '../repositories/job.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as userRepo from '../repositories/user.repository.js'

export function isPublicOpenJob(job: JobRow): boolean {
  return job.status === 'open' && job.visibility === 'public'
}

/** True when the job becomes publicly visible as open (first publish or switched from draft/private). */
export function shouldBroadcastNewJob(existing: JobRow | null, updated: JobRow): boolean {
  if (!isPublicOpenJob(updated)) return false
  if (!existing) return true
  return !isPublicOpenJob(existing)
}

function jobSummaryLine(job: JobRow): string {
  const budgetPart =
    job.jobType === 'hourly'
      ? `Hourly ~$${Number(job.hourlyRate).toFixed(0)}`
      : `Budget ~$${Number(job.budget).toFixed(0)}`
  const skills = job.skills?.length ? ` · Skills: ${job.skills.slice(0, 5).join(', ')}` : ''
  return `${job.category}. ${budgetPart}.${skills}`.slice(0, 480)
}

/** Notify all active freelancers (excluding the poster if they are also a freelancer — rare). */
export async function notifyFreelancersNewPublicJob(job: JobRow, posterUserId: string): Promise<void> {
  const ids = await userRepo.listActiveUserIdsByRole('freelancer')
  const recipients = ids.filter((id) => id !== posterUserId)
  if (!recipients.length) return

  const title = 'New job opportunity'
  const body = `“${job.title}” — ${jobSummaryLine(job)}`
  const entries = recipients.map((userId) => ({
    userId,
    title,
    body,
    type: 'new_job',
  }))
  await notificationRepo.createNotificationsBulk(entries)
}
