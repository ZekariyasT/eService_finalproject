import { randomUUID } from 'node:crypto'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getPool } from '../utils/pool.js'

export interface TelebirrAccountRow {
  phoneNumber: string
  userId: string | null
  holderName: string
  balance: number
  pinHash: string
  status: 'active' | 'frozen'
  failedAttempts: number
  lockedUntil: string | null
}

function mapAccount(r: RowDataPacket): TelebirrAccountRow {
  return {
    phoneNumber: String(r.phone_number),
    userId: r.user_id ? String(r.user_id) : null,
    holderName: String(r.holder_name),
    balance: Number(r.balance),
    pinHash: String(r.pin_hash),
    status: r.status as 'active' | 'frozen',
    failedAttempts: Number(r.failed_attempts ?? 0),
    lockedUntil:
      r.locked_until instanceof Date
        ? r.locked_until.toISOString()
        : r.locked_until
          ? String(r.locked_until)
          : null,
  }
}

export async function findAccountByPhone(phone: string): Promise<TelebirrAccountRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM telebirr_accounts WHERE phone_number = :phone LIMIT 1`,
    { phone }
  )
  return rows.length ? mapAccount(rows[0]!) : null
}

export async function findAccountByUserId(userId: string): Promise<TelebirrAccountRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM telebirr_accounts WHERE user_id = :userId ORDER BY created_at ASC LIMIT 1`,
    { userId }
  )
  return rows.length ? mapAccount(rows[0]!) : null
}

export async function createAccount(input: {
  phoneNumber: string
  userId?: string | null
  holderName: string
  balance: number
  pinHash: string
}): Promise<TelebirrAccountRow> {
  const pool = getPool()
  await pool.execute(
    `INSERT INTO telebirr_accounts (phone_number, user_id, holder_name, balance, pin_hash)
     VALUES (:phone_number, :user_id, :holder_name, :balance, :pin_hash)`,
    {
      phone_number: input.phoneNumber,
      user_id: input.userId ?? null,
      holder_name: input.holderName,
      balance: input.balance,
      pin_hash: input.pinHash,
    }
  )
  const account = await findAccountByPhone(input.phoneNumber)
  if (!account) throw new Error('Failed to create Telebirr account')
  return account
}

export async function adjustBalance(phone: string, delta: number): Promise<void> {
  const pool = getPool()
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE telebirr_accounts
       SET balance = balance + :delta
     WHERE phone_number = :phone
       AND (balance + :delta) >= 0`,
    { delta, phone }
  )
  if (result.affectedRows === 0) throw new Error('Insufficient Telebirr balance')
}

export async function recordFailedPinAttempt(phone: string, lockSeconds = 0): Promise<void> {
  const pool = getPool()
  if (lockSeconds > 0) {
    await pool.execute(
      `UPDATE telebirr_accounts
         SET failed_attempts = failed_attempts + 1,
             locked_until = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL :seconds SECOND)
       WHERE phone_number = :phone`,
      { phone, seconds: lockSeconds }
    )
  } else {
    await pool.execute(
      `UPDATE telebirr_accounts
         SET failed_attempts = failed_attempts + 1
       WHERE phone_number = :phone`,
      { phone }
    )
  }
}

export async function resetFailedAttempts(phone: string): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `UPDATE telebirr_accounts
       SET failed_attempts = 0, locked_until = NULL
     WHERE phone_number = :phone`,
    { phone }
  )
}

export async function linkAccountToUser(phone: string, userId: string): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `UPDATE telebirr_accounts SET user_id = :userId WHERE phone_number = :phone`,
    { phone, userId }
  )
}

export interface TelebirrTransactionRow {
  id: string
  referenceNo: string
  fromPhone: string | null
  toPhone: string | null
  type: 'debit' | 'credit' | 'transfer'
  amount: number
  fee: number
  status: 'pending' | 'completed' | 'failed'
  description: string | null
  externalRef: string | null
  failureReason: string | null
  createdAt: string
  completedAt: string | null
}

function mapTx(r: RowDataPacket): TelebirrTransactionRow {
  return {
    id: String(r.id),
    referenceNo: String(r.reference_no),
    fromPhone: r.from_phone ? String(r.from_phone) : null,
    toPhone: r.to_phone ? String(r.to_phone) : null,
    type: r.type as 'debit' | 'credit' | 'transfer',
    amount: Number(r.amount),
    fee: Number(r.fee ?? 0),
    status: r.status as 'pending' | 'completed' | 'failed',
    description: r.description ? String(r.description) : null,
    externalRef: r.external_ref ? String(r.external_ref) : null,
    failureReason: r.failure_reason ? String(r.failure_reason) : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    completedAt:
      r.completed_at instanceof Date
        ? r.completed_at.toISOString()
        : r.completed_at
          ? String(r.completed_at)
          : null,
  }
}

export async function createPendingTransaction(input: {
  referenceNo: string
  fromPhone: string | null
  toPhone: string | null
  type: 'debit' | 'credit' | 'transfer'
  amount: number
  fee?: number
  description?: string | null
  externalRef?: string | null
}): Promise<string> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO telebirr_transactions
       (id, reference_no, from_phone, to_phone, type, amount, fee, status, description, external_ref)
     VALUES (:id, :ref, :from_phone, :to_phone, :type, :amount, :fee, 'pending', :description, :external_ref)`,
    {
      id,
      ref: input.referenceNo,
      from_phone: input.fromPhone,
      to_phone: input.toPhone,
      type: input.type,
      amount: input.amount,
      fee: input.fee ?? 0,
      description: input.description ?? null,
      external_ref: input.externalRef ?? null,
    }
  )
  return id
}

export async function markTransactionCompleted(id: string): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `UPDATE telebirr_transactions
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = :id`,
    { id }
  )
}

export async function markTransactionFailed(id: string, reason: string): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `UPDATE telebirr_transactions
       SET status = 'failed', failure_reason = :reason, completed_at = CURRENT_TIMESTAMP
     WHERE id = :id`,
    { id, reason }
  )
}

export async function getTransactionByReference(
  referenceNo: string
): Promise<TelebirrTransactionRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM telebirr_transactions WHERE reference_no = :ref LIMIT 1`,
    { ref: referenceNo }
  )
  return rows.length ? mapTx(rows[0]!) : null
}

export async function listTransactionsForPhone(
  phone: string,
  limit = 50
): Promise<TelebirrTransactionRow[]> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM telebirr_transactions
     WHERE from_phone = :phone OR to_phone = :phone
     ORDER BY created_at DESC
     LIMIT ${lim}`,
    { phone }
  )
  return (rows as RowDataPacket[]).map(mapTx)
}

export async function listAllAccounts(limit = 200): Promise<TelebirrAccountRow[]> {
  const pool = getPool()
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 1000)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM telebirr_accounts ORDER BY created_at DESC LIMIT ${lim}`
  )
  return (rows as RowDataPacket[]).map(mapAccount)
}
