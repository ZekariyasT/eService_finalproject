import { randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { getPool } from '../utils/pool.js'

export type CoinTransactionType = 'EARN' | 'SPEND' | 'BONUS' | 'JOB_POST' | 'JOB_AWARDED' | 'PRODUCT_SALE'

export const COIN_RULES = {
  jobPostCoins: 10,
  jobAwardedCoins: 15,
  productSaleCoins: 10,
  maxCheckoutDiscountPercent: 30,
  coinToBirrRate: 20,
}

export async function ensureCoinWallet(userId: string) {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM coin_wallets WHERE user_id = :userId LIMIT 1`, { userId })
  if (rows.length) return { id: String(rows[0]!.id), balance: Number(rows[0]!.coin_balance) }

  const [users] = await pool.query<RowDataPacket[]>(`SELECT coins FROM users WHERE id = :userId LIMIT 1`, { userId })
  const startingBalance = Math.max(0, Number(users[0]?.coins ?? 0))
  const id = randomUUID()
  await pool.execute(`INSERT INTO coin_wallets (id, user_id, coin_balance) VALUES (:id, :userId, :startingBalance)`, {
    id,
    userId,
    startingBalance,
  })
  return { id, balance: startingBalance }
}

export async function getCoinBalance(userId: string) {
  const wallet = await ensureCoinWallet(userId)
  return wallet.balance
}

async function logTransaction(userId: string, type: CoinTransactionType, amount: number, source?: string) {
  const pool = getPool()
  await pool.execute(
    `INSERT INTO coin_transactions (id, user_id, type, amount, source) VALUES (:id, :userId, :type, :amount, :source)`,
    { id: randomUUID(), userId, type, amount, source: source ?? null }
  )
}

export async function earnCoins(userId: string, amount: number, type: CoinTransactionType = 'EARN', source?: string) {
  if (amount <= 0) return getCoinBalance(userId)
  await ensureCoinWallet(userId)
  const pool = getPool()
  await pool.execute(`UPDATE coin_wallets SET coin_balance = coin_balance + :amount WHERE user_id = :userId`, { amount, userId })
  await pool.execute(`UPDATE users SET coins = COALESCE(coins, 0) + :amount WHERE id = :userId`, { amount, userId })
  await logTransaction(userId, type, amount, source)
  return getCoinBalance(userId)
}

export async function spendCoins(userId: string, amount: number, source?: string) {
  if (amount <= 0) return getCoinBalance(userId)
  const balance = await getCoinBalance(userId)
  if (amount > balance) throw new Error('Insufficient coin balance')
  const pool = getPool()
  await pool.execute(`UPDATE coin_wallets SET coin_balance = coin_balance - :amount WHERE user_id = :userId`, { amount, userId })
  await pool.execute(`UPDATE users SET coins = GREATEST(COALESCE(coins, 0) - :amount, 0) WHERE id = :userId`, { amount, userId })
  await logTransaction(userId, 'SPEND', -amount, source)
  return getCoinBalance(userId)
}

export async function rewardJobPost(clientId: string, jobId: string) {
  const coins = COIN_RULES.jobPostCoins
  if (coins <= 0) return getCoinBalance(clientId)
  return earnCoins(clientId, coins, 'JOB_POST', `job:${jobId}`)
}

export async function rewardJobAwarded(freelancerId: string, jobId: string) {
  const coins = COIN_RULES.jobAwardedCoins
  if (coins <= 0) return getCoinBalance(freelancerId)
  return earnCoins(freelancerId, coins, 'JOB_AWARDED', `job:${jobId}`)
}

export async function rewardProductSale(sellerId: string, productId: string) {
  const coins = COIN_RULES.productSaleCoins
  if (coins <= 0) return getCoinBalance(sellerId)
  return earnCoins(sellerId, coins, 'PRODUCT_SALE', `product:${productId}`)
}

export async function applyCoinsToOrder(userId: string, orderTotal: number, coinsRequested: number, source?: string) {
  const balance = await getCoinBalance(userId)
  const rate = await getCoinToBirrRate()
  const coinValueBirr = 1 / rate
  const maxAllowed = Math.floor((orderTotal / coinValueBirr) * (COIN_RULES.maxCheckoutDiscountPercent / 100))
  const coinsUsed = Math.min(coinsRequested, balance, maxAllowed)
  if (coinsRequested > balance) throw new Error('Cannot use more coins than balance')
  if (coinsRequested > maxAllowed) throw new Error(`Coins cannot exceed ${COIN_RULES.maxCheckoutDiscountPercent}% of order total`)
  if (coinsUsed > 0) await spendCoins(userId, coinsUsed, source)
  const discount = coinsUsed * coinValueBirr
  const finalTotal = Math.max(0, orderTotal - discount)
  return { coinsUsed, discount, finalTotal, balance: await getCoinBalance(userId) }
}

export async function getCoinToBirrRate(): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'coin_to_birr_rate' LIMIT 1`
  )
  if (rows.length) return Number(rows[0]!.setting_value) || COIN_RULES.coinToBirrRate
  return COIN_RULES.coinToBirrRate
}

export async function setCoinToBirrRate(rate: number): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `INSERT INTO platform_settings (id, setting_key, setting_value)
     VALUES (:id, 'coin_to_birr_rate', :val)
     ON DUPLICATE KEY UPDATE setting_value = :val`,
    { id: randomUUID(), val: String(rate) }
  )
}

export async function listCoinTransactions(userId: string) {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM coin_transactions WHERE user_id = :userId ORDER BY created_at DESC LIMIT 300`,
    { userId }
  )
  return rows
}

