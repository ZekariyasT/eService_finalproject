import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { ApiError } from '../errors/api-error.js'
import * as tbRepo from '../repositories/telebirr.repository.js'
import type { TelebirrAccountRow, TelebirrTransactionRow } from '../repositories/telebirr.repository.js'

const DEFAULT_PIN = '1234'
const DEFAULT_STARTING_BALANCE = 5000
const MAX_PIN_ATTEMPTS = 3
const PIN_LOCK_SECONDS = 60
const SIM_FAILURE_RATE = 0.02
const SIM_DELAY_MIN_MS = 800
const SIM_DELAY_MAX_MS = 1500
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function simulatedDelay(): Promise<void> {
  const ms = SIM_DELAY_MIN_MS + Math.floor(Math.random() * (SIM_DELAY_MAX_MS - SIM_DELAY_MIN_MS))
  return sleep(ms)
}

function shouldSimulateFailure(): boolean {
  return Math.random() < SIM_FAILURE_RATE
}

function generateReference(): string {
  const buf = randomBytes(6)
  let out = ''
  for (let i = 0; i < 6; i++) {
    const byte = buf[i]
    if (byte === undefined) continue
    out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]
  }
  return `TEB-${out}`
}

function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/\s|-/g, '')
  if (!trimmed) throw new ApiError(400, 'Telebirr phone number is required')
  return trimmed
}

export interface TelebirrAccountPublic {
  phoneNumber: string
  holderName: string
  balance: number
  status: 'active' | 'frozen'
  locked: boolean
  lockedUntil: string | null
}

function toPublic(account: TelebirrAccountRow): TelebirrAccountPublic {
  const locked =
    account.lockedUntil !== null && new Date(account.lockedUntil).getTime() > Date.now()
  return {
    phoneNumber: account.phoneNumber,
    holderName: account.holderName,
    balance: account.balance,
    status: account.status,
    locked,
    lockedUntil: locked ? account.lockedUntil : null,
  }
}

/**
 * Auto-create a mock Telebirr account for a newly-signed-up user, if they have a
 * phone number on file. Idempotent — re-running for an existing phone keeps the
 * stored balance and PIN.
 */
export async function ensureAccount(input: {
  userId: string
  phoneNumber?: string | null
  holderName: string
}): Promise<TelebirrAccountPublic | null> {
  const phone = input.phoneNumber ? input.phoneNumber.trim() : ''
  if (!phone) return null
  const existing = await tbRepo.findAccountByPhone(phone)
  if (existing) {
    if (!existing.userId) await tbRepo.linkAccountToUser(phone, input.userId)
    return toPublic(existing)
  }
  const pinHash = await bcrypt.hash(DEFAULT_PIN, 8)
  const account = await tbRepo.createAccount({
    phoneNumber: phone,
    userId: input.userId,
    holderName: input.holderName,
    balance: DEFAULT_STARTING_BALANCE,
    pinHash,
  })
  return toPublic(account)
}

export async function getAccountForUser(userId: string): Promise<TelebirrAccountPublic | null> {
  const account = await tbRepo.findAccountByUserId(userId)
  return account ? toPublic(account) : null
}

async function loadAccountOrFail(phone: string): Promise<TelebirrAccountRow> {
  const account = await tbRepo.findAccountByPhone(phone)
  if (!account) {
    throw new ApiError(404, 'No Telebirr account found for that phone number')
  }
  if (account.status === 'frozen') {
    throw new ApiError(403, 'This Telebirr account is frozen')
  }
  if (account.lockedUntil && new Date(account.lockedUntil).getTime() > Date.now()) {
    const seconds = Math.ceil(
      (new Date(account.lockedUntil).getTime() - Date.now()) / 1000
    )
    throw new ApiError(
      423,
      `Too many wrong PIN attempts. Try again in ${seconds}s.`
    )
  }
  return account
}

async function verifyPinOrFail(
  account: TelebirrAccountRow,
  pin: string
): Promise<void> {
  const pinTrim = pin.trim()
  if (!pinTrim) throw new ApiError(400, 'Telebirr PIN is required')
  const ok = await bcrypt.compare(pinTrim, account.pinHash)
  if (!ok) {
    const newAttempts = account.failedAttempts + 1
    if (newAttempts >= MAX_PIN_ATTEMPTS) {
      await tbRepo.recordFailedPinAttempt(account.phoneNumber, PIN_LOCK_SECONDS)
      throw new ApiError(
        423,
        `Too many wrong PIN attempts. Telebirr locked for ${PIN_LOCK_SECONDS}s.`
      )
    }
    await tbRepo.recordFailedPinAttempt(account.phoneNumber)
    const left = MAX_PIN_ATTEMPTS - newAttempts
    throw new ApiError(401, `Invalid Telebirr PIN. ${left} attempt(s) left.`)
  }
  await tbRepo.resetFailedAttempts(account.phoneNumber)
}

export interface ChargeResult {
  referenceNo: string
  status: 'completed'
  amount: number
  newBalance: number
  completedAt: string
}

/**
 * Charge a Telebirr account (debit the mock Telebirr balance). Used by both
 * wallet top-up and direct product checkout. Simulates network latency and
 * a small random failure rate.
 */
export async function charge(input: {
  phone: string
  pin: string
  amount: number
  description?: string
  externalRef?: string
}): Promise<ChargeResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError(400, 'Charge amount must be positive')
  }
  const phone = normalizePhone(input.phone)
  const account = await loadAccountOrFail(phone)
  await verifyPinOrFail(account, input.pin)

  if (account.balance < input.amount) {
    throw new ApiError(402, 'Insufficient Telebirr balance', {
      telebirrBalance: account.balance,
    })
  }

  const referenceNo = generateReference()
  const txId = await tbRepo.createPendingTransaction({
    referenceNo,
    fromPhone: phone,
    toPhone: null,
    type: 'debit',
    amount: input.amount,
    description: input.description ?? 'Telebirr payment',
    externalRef: input.externalRef ?? null,
  })

  await simulatedDelay()

  if (shouldSimulateFailure()) {
    await tbRepo.markTransactionFailed(
      txId,
      'Telebirr service temporarily unavailable. Please try again.'
    )
    throw new ApiError(
      503,
      'Telebirr service temporarily unavailable. Please try again.',
      { referenceNo }
    )
  }

  try {
    await tbRepo.adjustBalance(phone, -input.amount)
  } catch {
    await tbRepo.markTransactionFailed(txId, 'Insufficient Telebirr balance')
    throw new ApiError(402, 'Insufficient Telebirr balance')
  }

  await tbRepo.markTransactionCompleted(txId)

  const after = await tbRepo.findAccountByPhone(phone)
  return {
    referenceNo,
    status: 'completed',
    amount: input.amount,
    newBalance: after?.balance ?? 0,
    completedAt: new Date().toISOString(),
  }
}

export interface PayoutResult {
  referenceNo: string
  status: 'completed'
  amount: number
  newBalance: number
  completedAt: string
}

/**
 * Credit a Telebirr account (used for wallet withdraw → Telebirr payout). The
 * mock Telebirr "float" is unlimited, so credits never fail on balance.
 */
export async function payout(input: {
  phone: string
  amount: number
  description?: string
  externalRef?: string
}): Promise<PayoutResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError(400, 'Payout amount must be positive')
  }
  const phone = normalizePhone(input.phone)
  const account = await tbRepo.findAccountByPhone(phone)
  if (!account) {
    throw new ApiError(404, 'No Telebirr account found for that phone number')
  }

  const referenceNo = generateReference()
  const txId = await tbRepo.createPendingTransaction({
    referenceNo,
    fromPhone: null,
    toPhone: phone,
    type: 'credit',
    amount: input.amount,
    description: input.description ?? 'Telebirr payout',
    externalRef: input.externalRef ?? null,
  })

  await simulatedDelay()

  if (shouldSimulateFailure()) {
    await tbRepo.markTransactionFailed(
      txId,
      'Telebirr service temporarily unavailable. Please try again.'
    )
    throw new ApiError(
      503,
      'Telebirr service temporarily unavailable. Please try again.',
      { referenceNo }
    )
  }

  await tbRepo.adjustBalance(phone, input.amount)
  await tbRepo.markTransactionCompleted(txId)

  const after = await tbRepo.findAccountByPhone(phone)
  return {
    referenceNo,
    status: 'completed',
    amount: input.amount,
    newBalance: after?.balance ?? 0,
    completedAt: new Date().toISOString(),
  }
}

export async function listTransactionsForUser(
  userId: string,
  limit = 50
): Promise<TelebirrTransactionRow[]> {
  const account = await tbRepo.findAccountByUserId(userId)
  if (!account) return []
  return tbRepo.listTransactionsForPhone(account.phoneNumber, limit)
}

export async function listAllAccountsForAdmin(): Promise<TelebirrAccountPublic[]> {
  const rows = await tbRepo.listAllAccounts(500)
  return rows.map(toPublic)
}

export async function adminTopUpAccount(
  phone: string,
  amount: number
): Promise<TelebirrAccountPublic> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'Top-up amount must be positive')
  }
  const normalized = normalizePhone(phone)
  const account = await tbRepo.findAccountByPhone(normalized)
  if (!account) throw new ApiError(404, 'Telebirr account not found')
  const referenceNo = generateReference()
  const txId = await tbRepo.createPendingTransaction({
    referenceNo,
    fromPhone: null,
    toPhone: normalized,
    type: 'credit',
    amount,
    description: 'Admin top-up',
  })
  await tbRepo.adjustBalance(normalized, amount)
  await tbRepo.markTransactionCompleted(txId)
  const updated = await tbRepo.findAccountByPhone(normalized)
  if (!updated) throw new ApiError(500, 'Failed to load Telebirr account after top-up')
  return toPublic(updated)
}

export type { TelebirrTransactionRow }
