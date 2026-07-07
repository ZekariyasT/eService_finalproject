import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as coinRepo from '../repositories/coin.repository.js'
import { ApiError } from '../errors/api-error.js'

export async function summary(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const balance = await coinRepo.getCoinBalance(req.auth!.userId)
    const transactions = await coinRepo.listCoinTransactions(req.auth!.userId)
    const coinToBirrRate = await coinRepo.getCoinToBirrRate()
    return res.json({ balance, rules: { ...coinRepo.COIN_RULES, coinToBirrRate }, transactions })
  } catch (e) {
    return next(e)
  }
}

export async function applyToOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = z
      .object({
        orderTotal: z.number().nonnegative(),
        coinsRequested: z.number().int().nonnegative(),
        source: z.string().optional(),
      })
      .parse(req.body)
    try {
      const result = await coinRepo.applyCoinsToOrder(req.auth!.userId, body.orderTotal, body.coinsRequested, body.source)
      return res.json(result)
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Could not apply coins')
    }
  } catch (e) {
    return next(e)
  }
}

export async function getExchangeRate(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const rate = await coinRepo.getCoinToBirrRate()
    return res.json({ coinToBirrRate: rate })
  } catch (e) {
    return next(e)
  }
}

export async function setExchangeRate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = z.object({ coinToBirrRate: z.number().int().min(1).max(10000) }).parse(req.body)
    await coinRepo.setCoinToBirrRate(body.coinToBirrRate)
    return res.json({ coinToBirrRate: body.coinToBirrRate })
  } catch (e) {
    return next(e)
  }
}
