import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as orderRepo from '../repositories/order.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as coinRepo from '../repositories/coin.repository.js'
import * as walletRepo from '../repositories/wallet.repository.js'
import * as productRepo from '../repositories/product.repository.js'
import * as telebirrService from '../services/telebirr.service.js'
import { getCommissionPercent } from '../repositories/platform-settings.repository.js'
import { ApiError } from '../errors/api-error.js'

export async function placeServiceOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      serviceId: z.string().min(1),
      notes: z.string().max(2000).optional(),
      paymentMethod: z.enum(['mock', 'telebirr', 'cbe_birr', 'chapa']).optional(),
    })
    const body = schema.parse(req.body)
    const clientId = req.auth!.userId
    try {
      const order = await orderRepo.createServiceOrder({
        serviceId: body.serviceId,
        clientId,
        notes: body.notes,
        paymentMethod: body.paymentMethod,
      })
      await notificationRepo
        .createNotification(
          order.freelancerId,
          'New service order',
          `You have a new confirmed order (reference ${order.id.slice(0, 8)}…).`,
          'order_service'
        )
        .catch(() => {})
      return res.status(201).json({ order })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Order failed'
      if (msg.includes('not found')) throw new ApiError(404, msg)
      if (msg.includes('own')) throw new ApiError(400, msg)
      throw err
    }
  } catch (e) {
    return next(e)
  }
}

export async function listServiceOrders(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const orders = await orderRepo.listServiceOrdersForUser(uid)
    return res.json({ orders })
  } catch (e) {
    return next(e)
  }
}

export async function updateServiceOrderStatus(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const schema = z.object({
      status: z.enum(['confirmed', 'in_progress', 'delivered', 'completed', 'cancelled']),
    })
    const body = schema.parse(req.body)
    const uid = req.auth!.userId
    const order = await orderRepo.updateServiceOrderStatus(id, uid, body.status)
    if (!order) throw new ApiError(404, 'Order not found')
    await notificationRepo
      .createNotification(
        order.clientId,
        'Order status updated',
        `Your order is now: ${body.status.replace(/_/g, ' ')}.`,
        'order_status'
      )
      .catch(() => {})
    return res.json({ order })
  } catch (e) {
    return next(e)
  }
}

async function processSinglePurchase(buyerId: string, productId: string) {
  const result = await orderRepo.createDigitalPurchase({
    productId,
    buyerId,
    paymentMethod: 'wallet',
  })

  await walletRepo.debit(buyerId, result.amount, 'product_purchase', {
    productId,
    purchaseId: result.id,
  })

  const { netAmount, commissionAmount } = await walletRepo.collectCommission(
    result.creatorId,
    result.amount,
    { ref: 'product_sale', productId, purchaseId: result.id }
  )
  await walletRepo.credit(result.creatorId, netAmount, 'product_sale', {
    productId,
    gross: result.amount,
    commission: commissionAmount,
  })

  const commissionPct = await getCommissionPercent()
  await notificationRepo
    .createNotification(
      result.creatorId,
      'Product purchased',
      `"${result.productTitle}" was purchased. You earned ${netAmount.toFixed(2)} Br (${commissionPct}% platform fee applied).`,
      'order_product'
    )
    .catch(() => {})
  void coinRepo.rewardProductSale(result.creatorId, productId).catch(() => {})

  return result
}

export async function purchaseProduct(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      productId: z.string().min(1),
    })
    const body = schema.parse(req.body)
    const buyerId = req.auth!.userId
    try {
      const result = await processSinglePurchase(buyerId, body.productId)
      return res.status(201).json({ purchase: result })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purchase failed'
      if (msg.includes('not found')) throw new ApiError(404, msg)
      if (msg.includes('own')) throw new ApiError(400, msg)
      if (msg.includes('Already purchased')) throw new ApiError(409, msg)
      if (msg.includes('Insufficient')) throw new ApiError(400, msg)
      throw err
    }
  } catch (e) {
    return next(e)
  }
}

export async function checkoutCart(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      items: z.array(z.object({ productId: z.string().min(1) })).min(1).max(50),
      paymentMethod: z.enum(['wallet', 'telebirr']).optional(),
      phone: z.string().min(4).optional(),
      pin: z.string().min(4).max(8).optional(),
    })
    const body = schema.parse(req.body)
    const buyerId = req.auth!.userId
    const method = body.paymentMethod ?? 'wallet'

    const uniqueIds = [...new Set(body.items.map((i) => i.productId))]

    // For Telebirr, charge the full unpurchased total upfront. We pre-load the
    // products to compute the total, skipping items the user already owns.
    let telebirrRef: string | undefined
    if (method === 'telebirr') {
      if (!body.phone || !body.pin) {
        throw new ApiError(400, 'Telebirr phone number and PIN are required')
      }
      let owedTotal = 0
      for (const productId of uniqueIds) {
        const prod = await productRepo.getProductById(productId)
        if (!prod) throw new ApiError(404, `Product not found: ${productId}`)
        const already = await orderRepo.hasPurchasedDigitalProduct(buyerId, productId)
        if (!already) owedTotal += Number(prod.price)
      }
      if (owedTotal <= 0) throw new ApiError(400, 'All items were already purchased.')
      const charge = await telebirrService.charge({
        phone: body.phone,
        pin: body.pin,
        amount: owedTotal,
        description: 'Elite Ethiopia checkout',
        externalRef: `checkout:${buyerId}`,
      })
      telebirrRef = charge.referenceNo
      // Credit the buyer's Elite wallet with the charged amount. The
      // per-purchase debit below will draw from this credit, keeping seller
      // commission logic identical to the wallet-only path.
      await walletRepo.topup(buyerId, owedTotal, {
        method: 'telebirr',
        telebirrRef,
        purpose: 'checkout_funding',
      })
    }

    const purchases: { id: string; amount: number; creatorId: string; productTitle: string }[] = []
    let totalCharged = 0

    for (const productId of uniqueIds) {
      try {
        const result = await processSinglePurchase(buyerId, productId)
        purchases.push(result)
        totalCharged += result.amount
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Purchase failed'
        if (msg.includes('Already purchased')) continue
        if (msg.includes('not found')) throw new ApiError(404, `Product not found: ${productId}`)
        if (msg.includes('own')) throw new ApiError(400, 'Cannot purchase your own product')
        if (msg.includes('Insufficient')) throw new ApiError(400, 'Insufficient wallet balance. Please top up your wallet first.')
        throw err
      }
    }

    if (purchases.length === 0) {
      throw new ApiError(400, 'All items were already purchased.')
    }

    return res.status(201).json({
      purchases,
      totalCharged,
      paymentMethod: method,
      ...(telebirrRef ? { telebirrRef } : {}),
    })
  } catch (e) {
    return next(e)
  }
}

export async function listProductPurchases(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.auth!.userId
    const rows = await orderRepo.listDigitalPurchasesForBuyer(uid)
    return res.json({ purchases: rows })
  } catch (e) {
    return next(e)
  }
}
