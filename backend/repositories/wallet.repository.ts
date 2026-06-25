import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'
import { getCommissionPercent } from './platform-settings.repository.js'

function accountNumber(): string {
  return `EE${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`
}

export async function ensureWallet(userId: string): Promise<{ id: string; accountNo: string; balance: number }> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM wallets WHERE user_id = :userId LIMIT 1`, { userId })
  if (rows.length) {
    const r = rows[0]!
    return { id: String(r.id), accountNo: String(r.account_no), balance: Number(r.balance) }
  }
  const id = randomUUID()
  const accountNo = accountNumber()
  await pool.execute(
    `INSERT INTO wallets (id, user_id, account_no, balance) VALUES (:id, :user_id, :account_no, 0)`,
    { id, user_id: userId, account_no: accountNo }
  )
  await pool.execute(`UPDATE users SET wallet_account_no = :account_no WHERE id = :user_id`, {
    account_no: accountNo,
    user_id: userId,
  })
  return { id, accountNo, balance: 0 }
}

async function appendTx(walletId: string, type: string, amount: number, feeAmount = 0, meta: Record<string, unknown> = {}) {
  const pool = getPool()
  await pool.execute(
    `INSERT INTO wallet_transactions (id, wallet_id, type, amount, fee_amount, status, meta_json)
     VALUES (:id, :wallet_id, :type, :amount, :fee_amount, 'completed', :meta_json)`,
    {
      id: randomUUID(),
      wallet_id: walletId,
      type,
      amount,
      fee_amount: feeAmount,
      meta_json: JSON.stringify(meta),
    }
  )
}

export async function topup(userId: string, amount: number, meta: Record<string, unknown> = {}) {
  const wallet = await ensureWallet(userId)
  const pool = getPool()
  await pool.execute(`UPDATE wallets SET balance = balance + :amount WHERE id = :walletId`, { amount, walletId: wallet.id })
  await appendTx(wallet.id, 'topup', amount, 0, meta)
  return getWallet(userId)
}

export async function debit(userId: string, amount: number, type = 'product_purchase', meta: Record<string, unknown> = {}) {
  if (amount <= 0) throw new Error('Debit amount must be positive')
  const wallet = await ensureWallet(userId)
  if (wallet.balance < amount) throw new Error('Insufficient wallet balance')
  const pool = getPool()
  await pool.execute(`UPDATE wallets SET balance = balance - :amount WHERE id = :walletId`, { amount, walletId: wallet.id })
  await appendTx(wallet.id, type, amount, 0, meta)
  return getWallet(userId)
}

export async function credit(userId: string, amount: number, type = 'delivery_payment', meta: Record<string, unknown> = {}) {
  const wallet = await ensureWallet(userId)
  const pool = getPool()
  await pool.execute(`UPDATE wallets SET balance = balance + :amount WHERE id = :walletId`, { amount, walletId: wallet.id })
  await appendTx(wallet.id, type, amount, 0, meta)
  return getWallet(userId)
}

export async function withdraw(userId: string, amount: number) {
  const wallet = await ensureWallet(userId)
  const commissionRate = (await getCommissionPercent()) / 100
  const fee = Number((amount * commissionRate).toFixed(2))
  const total = amount + fee
  if (wallet.balance < total) throw new Error('Insufficient wallet balance')
  const pool = getPool()
  await pool.execute(`UPDATE wallets SET balance = balance - :amount WHERE id = :walletId`, { amount: total, walletId: wallet.id })
  await appendTx(wallet.id, 'withdraw', amount, fee)
  return getWallet(userId)
}

export async function transfer(senderId: string, receiverAccountNo: string, amount: number) {
  const sender = await ensureWallet(senderId)
  const commissionRate = (await getCommissionPercent()) / 100
  const fee = Number((amount * commissionRate).toFixed(2))
  const total = amount + fee
  if (sender.balance < total) throw new Error('Insufficient wallet balance')
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM wallets WHERE account_no = :receiverAccountNo LIMIT 1`, {
    receiverAccountNo,
  })
  if (!rows.length) throw new Error('Receiver account not found')
  const receiver = rows[0]!
  await pool.query('START TRANSACTION')
  try {
    await pool.execute(`UPDATE wallets SET balance = balance - :amount WHERE id = :walletId`, {
      amount: total,
      walletId: sender.id,
    })
    await pool.execute(`UPDATE wallets SET balance = balance + :amount WHERE id = :walletId`, {
      amount,
      walletId: String(receiver.id),
    })
    await appendTx(sender.id, 'transfer_out', amount, fee, { to: receiverAccountNo })
    await appendTx(String(receiver.id), 'transfer_in', amount, 0, { from: sender.accountNo })
    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e
  }
  return getWallet(senderId)
}

export async function collectCommission(
  payeeId: string,
  grossAmount: number,
  meta: Record<string, unknown> = {}
): Promise<{ netAmount: number; commissionAmount: number }> {
  const commissionRate = (await getCommissionPercent()) / 100
  const commissionAmount = Number((grossAmount * commissionRate).toFixed(2))
  const netAmount = Number((grossAmount - commissionAmount).toFixed(2))

  if (commissionAmount > 0) {
    const pool = getPool()
    const [adminRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE role = 'super-admin' ORDER BY created_at ASC LIMIT 1`
    )
    if (adminRows.length) {
      const adminId = String(adminRows[0]!.id)
      const adminWallet = await ensureWallet(adminId)
      await pool.execute(`UPDATE wallets SET balance = balance + :amount WHERE id = :walletId`, {
        amount: commissionAmount,
        walletId: adminWallet.id,
      })
      await appendTx(adminWallet.id, 'commission', commissionAmount, 0, meta)
    }
  }

  return { netAmount, commissionAmount }
}

export async function history(userId: string) {
  const wallet = await ensureWallet(userId)
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM wallet_transactions WHERE wallet_id = :walletId ORDER BY created_at DESC LIMIT 300`,
    { walletId: wallet.id }
  )
  return rows
}

export async function getWallet(userId: string) {
  const wallet = await ensureWallet(userId)
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM wallets WHERE id = :walletId LIMIT 1`, { walletId: wallet.id })
  const row = rows[0]!
  return { id: String(row.id), accountNo: String(row.account_no), balance: Number(row.balance) }
}

