import type { Response, NextFunction } from 'express'
import type { RowDataPacket } from 'mysql2'
import { z } from 'zod'
import type { AuthedRequest } from '../middlewares/auth.middleware.js'
import * as userRepo from '../repositories/user.repository.js'
import * as disputeRepo from '../repositories/dispute.repository.js'
import * as adminService from '../services/admin.service.js'
import * as coinRepo from '../repositories/coin.repository.js'
import * as notificationRepo from '../repositories/notification.repository.js'
import * as jobRepo from '../repositories/job.repository.js'
import * as serviceRepo from '../repositories/service.repository.js'
import * as productRepo from '../repositories/product.repository.js'
import * as orderRepo from '../repositories/order.repository.js'
import * as platformSettings from '../repositories/platform-settings.repository.js'
import * as telebirrService from '../services/telebirr.service.js'
import { ApiError } from '../errors/api-error.js'
import { getPool } from '../utils/pool.js'

export async function users(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const list = await userRepo.listUsersForAdmin()
    return res.json({ users: list })
  } catch (e) {
    return next(e)
  }
}

export async function disputes(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const list = await disputeRepo.listDisputesEnriched()
    return res.json({ disputes: list })
  } catch (e) {
    return next(e)
  }
}

export async function patchDispute(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const schema = z.object({
      status: z.enum(['open', 'reviewing', 'resolved', 'rejected']).optional(),
      resolutionNotes: z.string().max(4000).optional().nullable(),
    })
    const body = schema.parse(req.body)
    const existing = await disputeRepo.getDisputeById(id)
    const d = await disputeRepo.updateDispute(id, body)
    if (!d) return res.status(404).json({ error: 'Dispute not found' })

    if (existing && body.status && body.status !== existing.status) {
      const headline = `Dispute ${body.status}`
      const detail = body.resolutionNotes
        ? `Status: ${body.status.replace(/_/g, ' ')}. Note from admin: ${body.resolutionNotes}`
        : `Status: ${body.status.replace(/_/g, ' ')}.`
      const targets = [d.openedBy, d.respondentId]
      for (const target of targets) {
        await notificationRepo.createNotification(target, headline, detail, 'dispute').catch(() => {})
      }
    }

    return res.json({ dispute: d })
  } catch (e) {
    return next(e)
  }
}

export async function deleteUser(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    await adminService.deleteUserAsSuperAdmin(req.auth!.userId, id)
    return res.json({ ok: true })
  } catch (e) {
    return next(e)
  }
}

export async function patchUser(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const schema = z.object({
      isActive: z.boolean().optional(),
      role: z.enum(['client', 'freelancer', 'seller', 'admin', 'super-admin']).optional(),
    })
    const body = schema.parse(req.body)
    await adminService.updateUserAsSuperAdmin(req.auth!.userId, id, body)
    const user = await userRepo.findPublicUserById(id)
    return res.json({ user })
  } catch (e) {
    return next(e)
  }
}

export async function approveVerification(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const body = z.object({ approved: z.boolean() }).parse(req.body)
    await userRepo.updateUserProfile(id, {
      verified: body.approved,
      verificationStatus: body.approved ? 'approved' : 'rejected',
      paidVerificationBadge: body.approved,
    })
    await notificationRepo
      .createNotification(
        id,
        body.approved ? 'Verification approved' : 'Verification update',
        body.approved
          ? 'Your identity verification was approved. Your profile can show the verified badge.'
          : 'Your verification request was not approved. You may resubmit from your profile.',
        'verification'
      )
      .catch(() => {})
    const user = await userRepo.findPublicUserById(id)
    return res.json({ user })
  } catch (e) {
    return next(e)
  }
}

export async function adjustUserCoins(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const body = z.object({ amount: z.number().int(), reason: z.string().max(128).optional() }).parse(req.body)
    if (body.amount === 0) return res.status(400).json({ error: 'Amount cannot be zero' })
    if (body.amount > 0) {
      await coinRepo.earnCoins(id, body.amount, 'BONUS', body.reason || `admin:${req.auth!.userId}`)
    } else {
      await coinRepo.spendCoins(id, Math.abs(body.amount), body.reason || `admin:${req.auth!.userId}`)
    }
    await notificationRepo
      .createNotification(
        id,
        'Coins balance updated',
        `Your coin balance was adjusted by ${body.amount > 0 ? '+' : ''}${body.amount}.${body.reason ? ` Note: ${body.reason}` : ''}`,
        'coins'
      )
      .catch(() => {})
    const balance = await coinRepo.getCoinBalance(id)
    return res.json({ balance })
  } catch (e) {
    return next(e)
  }
}

export async function listings(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const [jobs, services, products] = await Promise.all([
      jobRepo.listAllJobsForAdmin(200),
      serviceRepo.listAllServicesForAdmin(200),
      productRepo.listAllProductsForAdmin(200),
    ])
    return res.json({ jobs, services, products })
  } catch (e) {
    return next(e)
  }
}

export async function transactions(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const list = await orderRepo.listAllAdminTransactions(500)
    let totalIn = 0
    let totalOut = 0
    let serviceVolume = 0
    let productVolume = 0
    let topupVolume = 0
    let withdrawVolume = 0
    for (const t of list) {
      if (t.kind === 'service_order') {
        totalOut += t.amount
        serviceVolume += t.amount
      } else if (t.kind === 'digital_purchase') {
        totalOut += t.amount
        productVolume += t.amount
      } else if (t.kind === 'wallet') {
        if (t.subType === 'topup') topupVolume += t.amount
        if (t.subType === 'withdraw') withdrawVolume += t.amount
      }
      totalIn += t.fee || 0
    }
    return res.json({
      transactions: list,
      summary: {
        count: list.length,
        platformFees: totalIn,
        userVolume: totalOut,
        serviceVolume,
        productVolume,
        topupVolume,
        withdrawVolume,
      },
    })
  } catch (e) {
    return next(e)
  }
}

/**
 * Live activity feed: latest jobs/services/products posted plus recent paid orders
 * so the admin dashboard can react to new posts without polling each list page.
 */
export async function recentActivity(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const [jobs, services, products] = await Promise.all([
      jobRepo.listAllJobsForAdmin(20),
      serviceRepo.listAllServicesForAdmin(20),
      productRepo.listAllProductsForAdmin(20),
    ])

    type Item = {
      kind: 'job' | 'service' | 'product'
      id: string
      title: string
      authorName: string
      authorId: string
      category?: string
      amount?: number
      status: string
      createdAt: string
    }

    const items: Item[] = [
      ...jobs.map((j) => ({
        kind: 'job' as const,
        id: j.id,
        title: j.title,
        authorName: j.clientName || 'Client',
        authorId: j.clientId,
        category: j.category,
        amount: j.budget || j.hourlyRate || undefined,
        status: j.status,
        createdAt: j.createdAt,
      })),
      ...services.map((s) => ({
        kind: 'service' as const,
        id: s.id,
        title: s.title,
        authorName: s.freelancerName,
        authorId: s.freelancerId,
        category: s.category,
        amount: s.priceMax,
        status: s.status,
        createdAt: s.createdAt,
      })),
      ...products.map((p) => ({
        kind: 'product' as const,
        id: p.id,
        title: p.title,
        authorName: p.creatorName,
        authorId: p.creatorId,
        category: p.category,
        amount: p.price,
        status: p.status,
        createdAt: p.createdAt,
      })),
    ]

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))

    return res.json({ items: items.slice(0, 30) })
  } catch (e) {
    return next(e)
  }
}

/**
 * Comprehensive report for the admin "Reports" page:
 * users / listings / orders / transactions / disputes / top contributors / charts.
 *
 * Aggregations are calculated in MySQL where possible; transaction figures are
 * derived from the unified `listAllAdminTransactions` view so the same numbers
 * appear on the Payments page and the Reports page.
 */
export async function report(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const pool = getPool()

    const queryAll = async <T = RowDataPacket>(sql: string): Promise<T[]> => {
      const [rows] = await pool.query<RowDataPacket[]>(sql)
      return rows as unknown as T[]
    }
    const queryOne = async (sql: string): Promise<RowDataPacket | undefined> => {
      const [rows] = await pool.query<RowDataPacket[]>(sql)
      return rows[0]
    }

    const userTotals = await queryOne(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(is_active, 1) = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN COALESCE(is_active, 1) = 0 THEN 1 ELSE 0 END) AS suspended,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS last24h,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS last7d,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30d
      FROM users
    `)
    const usersByRole = await queryAll(
      `SELECT role, COUNT(*) AS count FROM users GROUP BY role`
    )

    const jobTotals = await queryOne(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30d,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS last7d
      FROM jobs
    `)
    const jobsByStatus = await queryAll(
      `SELECT status, COUNT(*) AS count FROM jobs GROUP BY status`
    )
    const jobTopCategories = await queryAll(
      `SELECT category, COUNT(*) AS count FROM jobs GROUP BY category ORDER BY count DESC LIMIT 8`
    )

    const serviceTotals = await queryOne(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30d,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS last7d
      FROM services
    `)
    const servicesByStatus = await queryAll(
      `SELECT status, COUNT(*) AS count FROM services GROUP BY status`
    )
    const serviceTopCategories = await queryAll(
      `SELECT category, COUNT(*) AS count FROM services GROUP BY category ORDER BY count DESC LIMIT 8`
    )

    const productTotals = await queryOne(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30d,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS last7d
      FROM digital_products
    `)
    const productsByStatus = await queryAll(
      `SELECT status, COUNT(*) AS count FROM digital_products GROUP BY status`
    )
    const productTopCategories = await queryAll(
      `SELECT category, COUNT(*) AS count FROM digital_products GROUP BY category ORDER BY count DESC LIMIT 8`
    )

    const serviceOrderTotals = await queryOne(`
      SELECT COUNT(*) AS count,
             COALESCE(SUM(total_amount), 0) AS volume,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30d_count,
             COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_amount ELSE 0 END), 0) AS last30d_volume
      FROM service_orders
    `)
    const digitalPurchaseTotals = await queryOne(`
      SELECT COUNT(*) AS count,
             COALESCE(SUM(amount), 0) AS volume,
             SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30d_count,
             COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN amount ELSE 0 END), 0) AS last30d_volume
      FROM digital_purchases
    `)

    const walletByType = await queryAll(`
      SELECT type, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS volume,
             COALESCE(SUM(fee_amount), 0) AS fees
      FROM wallet_transactions
      GROUP BY type
    `)

    const disputesByStatus = await queryAll(
      `SELECT status, COUNT(*) AS count FROM disputes GROUP BY status`
    )
    const disputeTotals = await queryOne(`SELECT COUNT(*) AS total FROM disputes`)

    const topFreelancers = await queryAll(`
      SELECT id, name, COALESCE(earnings, 0) AS earnings,
             COALESCE(rating, 0) AS rating,
             COALESCE(completed_projects, 0) AS completed_projects
      FROM users
      WHERE role = 'freelancer'
      ORDER BY earnings DESC
      LIMIT 10
    `)
    const topClients = await queryAll(`
      SELECT u.id, u.name,
             COUNT(so.id) AS orders,
             COALESCE(SUM(so.total_amount), 0) AS spent
      FROM users u
      LEFT JOIN service_orders so ON so.client_id = u.id
      WHERE u.role = 'client'
      GROUP BY u.id, u.name
      HAVING orders > 0 OR spent > 0
      ORDER BY spent DESC
      LIMIT 10
    `)
    const topSellers = await queryAll(`
      SELECT u.id, u.name,
             COUNT(dp.id) AS sales,
             COALESCE(SUM(dp.amount), 0) AS revenue
      FROM users u
      LEFT JOIN digital_products p ON p.creator_id = u.id
      LEFT JOIN digital_purchases dp ON dp.product_id = p.id
      WHERE u.role = 'seller'
      GROUP BY u.id, u.name
      HAVING sales > 0 OR revenue > 0
      ORDER BY revenue DESC
      LIMIT 10
    `)

    const userGrowth = await queryAll(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)
    const orderTrends = await queryAll(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS revenue
      FROM service_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)
    const purchaseTrends = await queryAll(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS revenue
      FROM digital_purchases
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)

    const num = (x: unknown): number => Number(x ?? 0)

    const userVolume = num(serviceOrderTotals?.volume) + num(digitalPurchaseTotals?.volume)
    const totalFees = walletByType.reduce((acc, r) => acc + num(r.fees), 0)

    return res.json({
      generatedAt: new Date().toISOString(),
      users: {
        total: num(userTotals?.total),
        active: num(userTotals?.active),
        suspended: num(userTotals?.suspended),
        verified: num(userTotals?.verified),
        new: {
          last24h: num(userTotals?.last24h),
          last7d: num(userTotals?.last7d),
          last30d: num(userTotals?.last30d),
        },
        byRole: usersByRole.map((r) => ({ role: String(r.role), count: num(r.count) })),
      },
      listings: {
        jobs: {
          total: num(jobTotals?.total),
          last7d: num(jobTotals?.last7d),
          last30d: num(jobTotals?.last30d),
          byStatus: jobsByStatus.map((r) => ({ status: String(r.status), count: num(r.count) })),
          topCategories: jobTopCategories.map((r) => ({
            category: String(r.category ?? 'Uncategorised'),
            count: num(r.count),
          })),
        },
        services: {
          total: num(serviceTotals?.total),
          last7d: num(serviceTotals?.last7d),
          last30d: num(serviceTotals?.last30d),
          byStatus: servicesByStatus.map((r) => ({ status: String(r.status), count: num(r.count) })),
          topCategories: serviceTopCategories.map((r) => ({
            category: String(r.category ?? 'Uncategorised'),
            count: num(r.count),
          })),
        },
        products: {
          total: num(productTotals?.total),
          last7d: num(productTotals?.last7d),
          last30d: num(productTotals?.last30d),
          byStatus: productsByStatus.map((r) => ({ status: String(r.status), count: num(r.count) })),
          topCategories: productTopCategories.map((r) => ({
            category: String(r.category ?? 'Uncategorised'),
            count: num(r.count),
          })),
        },
      },
      orders: {
        serviceOrders: {
          count: num(serviceOrderTotals?.count),
          volume: num(serviceOrderTotals?.volume),
          last30dCount: num(serviceOrderTotals?.last30d_count),
          last30dVolume: num(serviceOrderTotals?.last30d_volume),
        },
        digitalPurchases: {
          count: num(digitalPurchaseTotals?.count),
          volume: num(digitalPurchaseTotals?.volume),
          last30dCount: num(digitalPurchaseTotals?.last30d_count),
          last30dVolume: num(digitalPurchaseTotals?.last30d_volume),
        },
      },
      transactions: {
        userVolume,
        platformFees: totalFees,
        wallet: walletByType.map((r) => ({
          type: String(r.type),
          count: num(r.count),
          volume: num(r.volume),
          fees: num(r.fees),
        })),
      },
      disputes: {
        total: num(disputeTotals?.total),
        byStatus: disputesByStatus.map((r) => ({ status: String(r.status), count: num(r.count) })),
      },
      top: {
        freelancers: topFreelancers.map((r) => ({
          id: String(r.id),
          name: String(r.name),
          earnings: num(r.earnings),
          rating: num(r.rating),
          completedProjects: num(r.completed_projects),
        })),
        clients: topClients.map((r) => ({
          id: String(r.id),
          name: String(r.name),
          orders: num(r.orders),
          spent: num(r.spent),
        })),
        sellers: topSellers.map((r) => ({
          id: String(r.id),
          name: String(r.name),
          sales: num(r.sales),
          revenue: num(r.revenue),
        })),
      },
      charts: {
        userGrowth: userGrowth.map((r) => ({
          date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
          count: num(r.count),
        })),
        orderTrends: orderTrends.map((r) => ({
          date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
          count: num(r.count),
          revenue: num(r.revenue),
        })),
        purchaseTrends: purchaseTrends.map((r) => ({
          date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
          count: num(r.count),
          revenue: num(r.revenue),
        })),
      },
    })
  } catch (e) {
    return next(e)
  }
}

export async function stats(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const pool = getPool()
    const count = async (sql: string) => {
      const [rows] = await pool.query<RowDataPacket[]>(sql)
      return Number((rows[0] as RowDataPacket)?.c ?? 0)
    }

    // Time-series data for the last 30 days
    const [userGrowth] = await pool.query<RowDataPacket[]>(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)

    const [orderTrends] = await pool.query<RowDataPacket[]>(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue
      FROM service_orders 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)

    const [roleDistribution] = await pool.query<RowDataPacket[]>(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `)

    const [categoryDistribution] = await pool.query<RowDataPacket[]>(`
      SELECT category, COUNT(*) as count FROM services GROUP BY category
    `)

    return res.json({
      users: await count(`SELECT COUNT(*) AS c FROM users`),
      services: await count(`SELECT COUNT(*) AS c FROM services`),
      products: await count(`SELECT COUNT(*) AS c FROM digital_products`),
      serviceOrders: await count(`SELECT COUNT(*) AS c FROM service_orders`),
      openDisputes: await count(`SELECT COUNT(*) AS c FROM disputes WHERE status = 'open'`),
      charts: {
        userGrowth,
        orderTrends,
        roleDistribution,
        categoryDistribution,
      },
    })
  } catch (e) {
    return next(e)
  }
}

export async function getCommissionSetting(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const percent = await platformSettings.getCommissionPercent()
    return res.json({ commissionPercent: percent })
  } catch (e) {
    return next(e)
  }
}

export async function setCommissionSetting(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = z.object({ commissionPercent: z.number().min(0).max(100) }).parse(req.body)
    await platformSettings.setCommissionPercent(body.commissionPercent)
    return res.json({ commissionPercent: body.commissionPercent })
  } catch (e) {
    return next(e)
  }
}

export async function getJobGateSettings(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const settings = await platformSettings.getJobPublishSettings()
    return res.json(settings)
  } catch (e) {
    return next(e)
  }
}

export async function setJobGateSettings(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      minWalletBalance: z.number().min(0).optional(),
      maxOpenJobs: z.number().int().min(1).max(100).optional(),
      maxPerDay: z.number().int().min(1).max(100).optional(),
      requireIdVerification: z.boolean().optional(),
      minProfileComplete: z.number().int().min(0).max(100).optional(),
    }).parse(req.body)

    const writes: Promise<void>[] = []
    if (body.minWalletBalance !== undefined)
      writes.push(platformSettings.setSetting('job_publish_min_wallet_balance', String(body.minWalletBalance)))
    if (body.maxOpenJobs !== undefined)
      writes.push(platformSettings.setSetting('job_publish_max_open_jobs', String(body.maxOpenJobs)))
    if (body.maxPerDay !== undefined)
      writes.push(platformSettings.setSetting('job_publish_max_per_day', String(body.maxPerDay)))
    if (body.requireIdVerification !== undefined)
      writes.push(platformSettings.setSetting('job_publish_require_id_verification', body.requireIdVerification ? '1' : '0'))
    if (body.minProfileComplete !== undefined)
      writes.push(platformSettings.setSetting('job_publish_min_profile_complete', String(body.minProfileComplete)))

    await Promise.all(writes)
    const updated = await platformSettings.getJobPublishSettings()
    return res.json(updated)
  } catch (e) {
    return next(e)
  }
}

export async function closeJob(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const job = await jobRepo.getJobById(id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    const updated = await jobRepo.updateJob(id, job.clientId, { status: 'closed' })
    if (!updated) return res.status(404).json({ error: 'Job not found' })
    await notificationRepo.createNotification(
      job.clientId,
      'Job closed by admin',
      `Your job "${job.title}" was closed by a platform administrator.`,
      'admin_action',
    ).catch(() => {})
    return res.json({ job: updated })
  } catch (e) {
    return next(e)
  }
}

export async function suspendUser(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id)
    const body = z.object({ suspend: z.boolean() }).parse(req.body)
    await adminService.updateUserAsSuperAdmin(req.auth!.userId, id, { isActive: !body.suspend })
    await notificationRepo.createNotification(
      id,
      body.suspend ? 'Account suspended' : 'Account reactivated',
      body.suspend
        ? 'Your account has been suspended by a platform administrator. Contact support for more information.'
        : 'Your account has been reactivated.',
      'admin_action',
    ).catch(() => {})
    const user = await userRepo.findPublicUserById(id)
    return res.json({ user })
  } catch (e) {
    return next(e)
  }
}

export async function telebirrAccounts(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const accounts = await telebirrService.listAllAccountsForAdmin()
    return res.json({ accounts })
  } catch (e) {
    return next(e)
  }
}

export async function topUpTelebirrAccount(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const phone = z.string().min(4).parse(req.params.phone)
    const body = z.object({ amount: z.number().positive() }).parse(req.body)
    const account = await telebirrService.adminTopUpAccount(phone, body.amount)
    return res.json({ account })
  } catch (e) {
    if (e instanceof ApiError) return next(e)
    return next(e)
  }
}
