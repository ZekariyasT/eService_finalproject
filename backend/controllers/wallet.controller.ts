import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as walletRepo from '../repositories/wallet.repository.js'
import * as userRepo from '../repositories/user.repository.js'
import * as telebirrService from '../services/telebirr.service.js'
import { ApiError } from '../errors/api-error.js'

async function assertProfileComplete(userId: string) {
  const me = await userRepo.findPublicUserById(userId)
  if (!me) throw new ApiError(404, 'User not found')
  if ((me.profileComplete ?? 0) < 100) {
    throw new ApiError(403, 'Complete profile to 100% before withdrawals')
  }
}

export async function getMyWallet(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const wallet = await walletRepo.getWallet(req.auth!.userId)
    return res.json({ wallet })
  } catch (e) {
    return next(e)
  }
}

export async function topup(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = z
      .object({
        amount: z.number().positive(),
        method: z.enum(['mock', 'telebirr']).optional(),
        phone: z.string().min(4).optional(),
        pin: z.string().min(4).max(8).optional(),
      })
      .parse(req.body)
    const userId = req.auth!.userId

    let telebirrRef: string | undefined
    if (body.method === 'telebirr') {
      if (!body.phone || !body.pin) {
        throw new ApiError(400, 'Telebirr phone number and PIN are required')
      }
      const result = await telebirrService.charge({
        phone: body.phone,
        pin: body.pin,
        amount: body.amount,
        description: 'Wallet top-up from Telebirr',
        externalRef: `topup:${userId}`,
      })
      telebirrRef = result.referenceNo
    }

    const wallet = await walletRepo.topup(userId, body.amount, {
      method: body.method ?? 'mock',
      telebirrRef,
    })

    const me = await userRepo.findPublicUserById(userId)
    if (me && me.role === 'client' && !(me as { verifiedPayment?: boolean }).verifiedPayment) {
      await userRepo.updateUserProfile(userId, { verifiedPayment: true })
    }

    return res.json({ wallet, telebirrRef })
  } catch (e) {
    return next(e)
  }
}

export async function withdraw(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = z
      .object({
        amount: z.number().positive(),
        method: z.enum(['mock', 'telebirr']).optional(),
        phone: z.string().min(4).optional(),
      })
      .parse(req.body)
    const userId = req.auth!.userId
    await assertProfileComplete(userId)

    const wallet = await walletRepo.withdraw(userId, body.amount)

    let telebirrRef: string | undefined
    if (body.method === 'telebirr') {
      if (!body.phone) throw new ApiError(400, 'Telebirr phone number is required')
      try {
        const result = await telebirrService.payout({
          phone: body.phone,
          amount: body.amount,
          description: 'Wallet withdrawal to Telebirr',
          externalRef: `withdraw:${userId}`,
        })
        telebirrRef = result.referenceNo
      } catch (err) {
        // Best-effort: Telebirr payout failed after Elite wallet was debited.
        // Refund the wallet to keep balances consistent and rethrow.
        await walletRepo.credit(userId, body.amount, 'withdraw_refund', {
          reason: err instanceof Error ? err.message : String(err),
        }).catch(() => {})
        throw err
      }
    }

    return res.json({ wallet, telebirrRef })
  } catch (e) {
    return next(e)
  }
}

export async function transfer(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = z.object({ receiverAccountNo: z.string().min(4), amount: z.number().positive() }).parse(req.body)
    const wallet = await walletRepo.transfer(req.auth!.userId, body.receiverAccountNo, body.amount)
    return res.json({ wallet })
  } catch (e) {
    return next(e)
  }
}

export async function transactions(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const transactions = await walletRepo.history(req.auth!.userId)
    return res.json({ transactions })
  } catch (e) {
    return next(e)
  }
}

export async function getMyTelebirr(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const account = await telebirrService.getAccountForUser(req.auth!.userId)
    return res.json({ account })
  } catch (e) {
    return next(e)
  }
}

export async function telebirrTransactions(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const txs = await telebirrService.listTransactionsForUser(req.auth!.userId, 100)
    return res.json({ transactions: txs })
  } catch (e) {
    return next(e)
  }
}
