import * as userRepo from '../repositories/user.repository.js'
import { ApiError } from '../errors/api-error.js'

export async function deleteUserAsSuperAdmin(actorId: string, targetUserId: string): Promise<void> {
  if (actorId === targetUserId) {
    throw new ApiError(400, 'You cannot delete your own account')
  }
  const target = await userRepo.findUserById(targetUserId)
  if (!target) throw new ApiError(404, 'User not found')

  if (target.role === 'super-admin') {
    const count = await userRepo.countByRole('super-admin')
    if (count <= 1) {
      throw new ApiError(400, 'Cannot delete the only Super Admin account')
    }
  }

  await userRepo.hardDeleteUser(targetUserId)
}

export async function updateUserAsSuperAdmin(
  actorId: string,
  targetUserId: string,
  patch: { isActive?: boolean; role?: string }
): Promise<void> {
  if (!Object.keys(patch).length) return

  const target = await userRepo.findUserById(targetUserId)
  if (!target) throw new ApiError(404, 'User not found')

  if (targetUserId === actorId && patch.role != null) {
    throw new ApiError(400, 'You cannot change your own role')
  }

  if (patch.role != null) {
    const allowed = new Set(['freelancer', 'client', 'admin'])
    if (!allowed.has(patch.role)) {
      throw new ApiError(400, 'Invalid role. Super Admin role cannot be assigned through the API.')
    }
    if (target.role === 'super-admin') {
      const superCount = await userRepo.countByRole('super-admin')
      if (superCount <= 1) {
        throw new ApiError(400, 'Cannot change role: the platform must keep at least one Super Admin')
      }
    }
  }

  if (patch.isActive === false && target.role === 'super-admin') {
    const activeSuper = await userRepo.countActiveByRole('super-admin')
    if (activeSuper <= 1) {
      throw new ApiError(400, 'Cannot suspend the only active Super Admin')
    }
  }

  await userRepo.adminPatchUser(targetUserId, patch)
}
