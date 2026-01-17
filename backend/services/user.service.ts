import * as userRepo from '../repositories/user.repository.js'
import type { PublicUser } from '../models/user.model.js'
import { ApiError } from '../errors/api-error.js'

function profileCompletionFromPatch(patch: Record<string, unknown>, current: PublicUser): number {
  const merged = { ...current, ...patch } as Record<string, unknown>
  const required = [
    'name',
    'email',
    'phone',
    'nationalId',
    'idFrontImageUrl',
    'idBackImageUrl',
    'profilePictureUrl',
    'shortBio',
  ]
  let done = 0
  for (const key of required) {
    const v = merged[key]
    if (typeof v === 'string' && v.trim().length > 0) done += 1
  }
  return Math.round((done / required.length) * 100)
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await userRepo.findPublicUserById(userId)
  if (!user) throw new ApiError(404, 'User not found')
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been suspended.')
  }
  return user
}

export async function updateProfile(userId: string, patchIn: Record<string, unknown>): Promise<PublicUser> {
  const current = await userRepo.findPublicUserById(userId)
  if (!current) throw new ApiError(404, 'User not found')
  const profileComplete = profileCompletionFromPatch(patchIn, current)
  const patch = { ...patchIn, profileComplete }
  const user = await userRepo.updateUserProfile(userId, patch)
  if (!user) throw new ApiError(404, 'User not found')
  return user
}
