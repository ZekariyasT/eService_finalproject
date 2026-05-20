import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'
import * as serviceRepo from './service.repository.js'
import * as productRepo from './product.repository.js'

export interface ServiceOrderRow {
  id: string
  serviceId: string
  clientId: string
  freelancerId: string
  status: string
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  notes: string | null
  createdAt: string
}

function mapServiceOrder(r: RowDataPacket): ServiceOrderRow {
  return {
    id: r.id,
    serviceId: r.service_id,
    clientId: r.client_id,
    freelancerId: r.freelancer_id,
    status: r.status,
    totalAmount: Number(r.total_amount),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    notes: r.notes,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }
}

export async function createServiceOrder(input: {
  serviceId: string
  clientId: string
  paymentMethod?: string
  notes?: string
}): Promise<ServiceOrderRow> {
  const svc = await serviceRepo.getServiceById(input.serviceId)
  if (!svc) throw new Error('Service not found')
  if (svc.freelancerId === input.clientId) throw new Error('Cannot order your own service')

  const total = Math.max(svc.priceMax, svc.priceMin)
  const pool = getPool()
  const id = randomUUID()
  const payId = randomUUID()
  const method = input.paymentMethod || 'mock'

  await pool.execute(
    `INSERT INTO service_orders (id, service_id, client_id, freelancer_id, status, total_amount, payment_method, payment_status, notes)
     VALUES (:id, :service_id, :client_id, :freelancer_id, 'confirmed', :total_amount, :payment_method, 'completed', :notes)`,
    {
      id,
      service_id: input.serviceId,
      client_id: input.clientId,
      freelancer_id: svc.freelancerId,
      total_amount: total,
      payment_method: method,
      notes: input.notes ?? null,
    }
  )

  await pool.execute(
    `INSERT INTO payments (id, ref_type, ref_id, payer_id, amount, method, status)
     VALUES (:id, 'service_order', :ref_id, :payer_id, :amount, :method, 'completed')`,
    { id: payId, ref_id: id, payer_id: input.clientId, amount: total, method }
  )

  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM service_orders WHERE id = :id`, { id })
  return mapServiceOrder(rows[0]!)
}

export interface AdminTransactionRow {
  id: string
  kind: 'service_order' | 'digital_purchase' | 'wallet'
  /** Sub-type for wallet rows (topup, withdraw, transfer_in, transfer_out, etc.) */
  subType?: string | null
  refType: string
  refId: string
  payerId: string | null
  payerName: string | null
  payerEmail: string | null
  payeeId: string | null
  payeeName: string | null
  payeeEmail: string | null
  amount: number
  fee: number
  method: string | null
  status: string
  description: string | null
  createdAt: string
}

/**
 * Admin: combined view of all user-to-user money flows on the platform.
 *
 *  - `service_order` rows: client → freelancer for service purchases.
 *  - `digital_purchase` rows: buyer → product creator for digital products.
 *  - `wallet` rows: every wallet transaction (top-up, withdraw, transfer in/out, …)
 *    with the wallet owner attributed as the payer. Transfers also resolve the peer.
 */
export async function listAllAdminTransactions(limit = 500): Promise<AdminTransactionRow[]> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 500, 1), 2000)

  const [serviceRows] = await pool.query<RowDataPacket[]>(
    `SELECT so.id, so.created_at, so.total_amount, so.payment_method, so.payment_status,
            so.client_id, so.freelancer_id, so.service_id,
            cu.name AS payer_name, cu.email AS payer_email,
            fu.name AS payee_name, fu.email AS payee_email,
            s.title AS service_title
     FROM service_orders so
     LEFT JOIN users cu ON cu.id = so.client_id
     LEFT JOIN users fu ON fu.id = so.freelancer_id
     LEFT JOIN services s ON s.id = so.service_id
     ORDER BY so.created_at DESC
     LIMIT ${lim}`
  )

  const [purchaseRows] = await pool.query<RowDataPacket[]>(
    `SELECT dp.id, dp.created_at, dp.amount, dp.payment_method, dp.payment_status,
            dp.buyer_id, dp.product_id,
            bu.name AS payer_name, bu.email AS payer_email,
            p.title AS product_title, p.creator_id,
            cu.name AS payee_name, cu.email AS payee_email
     FROM digital_purchases dp
     LEFT JOIN users bu ON bu.id = dp.buyer_id
     LEFT JOIN digital_products p ON p.id = dp.product_id
     LEFT JOIN users cu ON cu.id = p.creator_id
     ORDER BY dp.created_at DESC
     LIMIT ${lim}`
  )

  const [walletRows] = await pool.query<RowDataPacket[]>(
    `SELECT wt.id, wt.type, wt.amount, wt.fee_amount, wt.status, wt.meta_json, wt.created_at,
            w.user_id AS owner_id, w.account_no,
            u.name AS owner_name, u.email AS owner_email
     FROM wallet_transactions wt
     JOIN wallets w ON w.id = wt.wallet_id
     LEFT JOIN users u ON u.id = w.user_id
     ORDER BY wt.created_at DESC
     LIMIT ${lim}`
  )

  const out: AdminTransactionRow[] = []

  for (const r of serviceRows as RowDataPacket[]) {
    out.push({
      id: String(r.id),
      kind: 'service_order',
      subType: null,
      refType: 'service_order',
      refId: String(r.id),
      payerId: r.client_id ? String(r.client_id) : null,
      payerName: r.payer_name ? String(r.payer_name) : null,
      payerEmail: r.payer_email ? String(r.payer_email) : null,
      payeeId: r.freelancer_id ? String(r.freelancer_id) : null,
      payeeName: r.payee_name ? String(r.payee_name) : null,
      payeeEmail: r.payee_email ? String(r.payee_email) : null,
      amount: Number(r.total_amount ?? 0),
      fee: 0,
      method: r.payment_method ? String(r.payment_method) : null,
      status: String(r.payment_status ?? ''),
      description: r.service_title ? `Service order — ${String(r.service_title)}` : 'Service order',
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    })
  }

  for (const r of purchaseRows as RowDataPacket[]) {
    out.push({
      id: String(r.id),
      kind: 'digital_purchase',
      subType: null,
      refType: 'digital_purchase',
      refId: String(r.id),
      payerId: r.buyer_id ? String(r.buyer_id) : null,
      payerName: r.payer_name ? String(r.payer_name) : null,
      payerEmail: r.payer_email ? String(r.payer_email) : null,
      payeeId: r.creator_id ? String(r.creator_id) : null,
      payeeName: r.payee_name ? String(r.payee_name) : null,
      payeeEmail: r.payee_email ? String(r.payee_email) : null,
      amount: Number(r.amount ?? 0),
      fee: 0,
      method: r.payment_method ? String(r.payment_method) : null,
      status: String(r.payment_status ?? ''),
      description: r.product_title ? `Digital purchase — ${String(r.product_title)}` : 'Digital purchase',
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    })
  }

  for (const r of walletRows as RowDataPacket[]) {
    let meta: Record<string, unknown> = {}
    if (r.meta_json) {
      try {
        meta =
          typeof r.meta_json === 'string'
            ? (JSON.parse(r.meta_json) as Record<string, unknown>)
            : (r.meta_json as Record<string, unknown>)
      } catch {
        meta = {}
      }
    }
    const subType = String(r.type ?? '')
    let description = `${subType} (${String(r.account_no)})`
    if (subType === 'transfer_out' && typeof meta.to === 'string') description = `Transfer to ${meta.to}`
    if (subType === 'transfer_in' && typeof meta.from === 'string') description = `Transfer from ${meta.from}`
    if (subType === 'topup') description = `Wallet top-up`
    if (subType === 'withdraw') description = `Wallet withdrawal`

    out.push({
      id: String(r.id),
      kind: 'wallet',
      subType,
      refType: 'wallet_transaction',
      refId: String(r.id),
      payerId: r.owner_id ? String(r.owner_id) : null,
      payerName: r.owner_name ? String(r.owner_name) : null,
      payerEmail: r.owner_email ? String(r.owner_email) : null,
      payeeId: null,
      payeeName: null,
      payeeEmail: null,
      amount: Number(r.amount ?? 0),
      fee: Number(r.fee_amount ?? 0),
      method: 'wallet',
      status: String(r.status ?? ''),
      description,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    })
  }

  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  return out.slice(0, lim)
}

export async function listServiceOrdersForUser(userId: string): Promise<ServiceOrderRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM service_orders WHERE client_id = :userId OR freelancer_id = :userId ORDER BY created_at DESC`,
    { userId }
  )
  return rows.map(mapServiceOrder)
}

export async function updateServiceOrderStatus(
  orderId: string,
  freelancerId: string,
  status: string
): Promise<ServiceOrderRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM service_orders WHERE id = :orderId AND freelancer_id = :freelancerId LIMIT 1`,
    { orderId, freelancerId }
  )
  if (!rows.length) return null
  await pool.execute(`UPDATE service_orders SET status = :status WHERE id = :orderId`, { orderId, status })
  const [out] = await pool.query<RowDataPacket[]>(`SELECT * FROM service_orders WHERE id = :orderId`, { orderId })
  return out.length ? mapServiceOrder(out[0]!) : null
}

export async function createDigitalPurchase(input: {
  productId: string
  buyerId: string
  paymentMethod?: string
}): Promise<{ id: string; amount: number; creatorId: string; productTitle: string }> {
  const prod = await productRepo.getProductById(input.productId)
  if (!prod) throw new Error('Product not found')
  if (prod.creatorId === input.buyerId) throw new Error('Cannot purchase your own product')

  const pool = getPool()

  const [dupeRows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM digital_purchases WHERE buyer_id = :buyerId AND product_id = :productId LIMIT 1`,
    { buyerId: input.buyerId, productId: input.productId }
  )
  if (dupeRows.length > 0) throw new Error('Already purchased')

  const id = randomUUID()
  const payId = randomUUID()
  const method = input.paymentMethod || 'wallet'

  await pool.execute(
    `INSERT INTO digital_purchases (id, product_id, buyer_id, amount, payment_method, payment_status)
     VALUES (:id, :product_id, :buyer_id, :amount, :payment_method, 'completed')`,
    {
      id,
      product_id: input.productId,
      buyer_id: input.buyerId,
      amount: prod.price,
      payment_method: method,
    }
  )

  await pool.execute(
    `INSERT INTO payments (id, ref_type, ref_id, payer_id, amount, method, status)
     VALUES (:id, 'digital_purchase', :ref_id, :payer_id, :amount, :method, 'completed')`,
    { id: payId, ref_id: id, payer_id: input.buyerId, amount: prod.price, method }
  )

  await pool.execute(
    `UPDATE digital_products SET sales_count = sales_count + 1, downloads_count = downloads_count + 1 WHERE id = :pid`,
    { pid: input.productId }
  )

  return { id, amount: prod.price, creatorId: prod.creatorId, productTitle: prod.title }
}

export interface PurchasedDigitalProductRow {
  purchaseId: string
  productId: string
  title: string
  category: string
  amount: number
  purchasedAt: string
  promoDescription: string
  fullDescription: string
  /** External https link only; hosted uploads use `fullCourseHosted` + download API */
  deliverableUrl: string | null
  /** True when full course file is stored on this server (buyers download via authenticated route) */
  fullCourseHosted: boolean
  promotionSampleUrl: string | null
  imageUrl: string | null
}

export async function hasPurchasedDigitalProduct(buyerId: string, productId: string): Promise<boolean> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM digital_purchases WHERE buyer_id = :buyerId AND product_id = :productId LIMIT 1`,
    { buyerId, productId }
  )
  return rows.length > 0
}

export async function listDigitalPurchasesForBuyer(buyerId: string): Promise<PurchasedDigitalProductRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       dp.id AS purchase_id,
       dp.product_id,
       dp.amount,
       dp.created_at AS purchased_at,
       p.title,
       p.category,
       p.description AS promo_description,
       p.full_description,
       p.file_path,
       p.promotion_sample_url,
       p.image_url
     FROM digital_purchases dp
     JOIN digital_products p ON p.id = dp.product_id
     WHERE dp.buyer_id = :buyerId
     ORDER BY dp.created_at DESC`,
    { buyerId }
  )
  return (rows as RowDataPacket[]).map((r) => {
    const fp = r.file_path ? String(r.file_path) : null
    const isExternal = fp !== null && /^https?:\/\//i.test(fp)
    return {
      purchaseId: String(r.purchase_id),
      productId: String(r.product_id),
      title: String(r.title),
      category: String(r.category ?? 'Digital'),
      amount: Number(r.amount),
      purchasedAt:
        r.purchased_at instanceof Date ? r.purchased_at.toISOString() : String(r.purchased_at),
      promoDescription: String(r.promo_description ?? ''),
      fullDescription: String(r.full_description ?? ''),
      deliverableUrl: isExternal ? fp : null,
      fullCourseHosted: !!(fp && !isExternal),
      promotionSampleUrl: r.promotion_sample_url ? String(r.promotion_sample_url) : null,
      imageUrl: r.image_url ? String(r.image_url) : null,
    }
  })
}
