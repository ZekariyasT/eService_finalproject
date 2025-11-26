import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  const host = env.smtp.host
  if (!host) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth:
        env.smtp.user && env.smtp.password
          ? { user: env.smtp.user, pass: env.smtp.password }
          : undefined,
    })
  }
  return transporter
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const tx = getTransporter()
  const subject = 'Reset your Elite Ethiopia password'
  const text = `You requested a password reset. Open this link (valid for about ${env.passwordResetExpiryMinutes} minutes):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
  const safeHref = resetUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const html = `<p>You requested a password reset.</p><p><a href="${safeHref}">Reset your password</a></p><p>This link expires in about ${env.passwordResetExpiryMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`

  if (!tx) {
    return false
  }

  try {
    await tx.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html,
    })
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[smtp] password reset mail failed:', msg)
    }
    return false
  }
}

export async function sendSignupVerificationEmail(to: string, verifyUrl: string): Promise<boolean> {
  const tx = getTransporter()
  const subject = 'Verify your Elite Ethiopia email'
  const minutes = env.emailVerificationExpiryMinutes
  const text = `Welcome to Elite Ethiopia. Confirm your email by opening this link (valid for about ${minutes} minutes):\n\n${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`
  const safeHref = verifyUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const html = `<p>Welcome to Elite Ethiopia.</p><p>Please <a href="${safeHref}">confirm your email address</a>.</p><p>This link expires in about ${minutes} minutes.</p><p>If you did not create an account, you can ignore this email.</p>`

  if (!tx) {
    return false
  }

  try {
    await tx.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html,
    })
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[smtp] verification mail failed:', msg)
    }
    return false
  }
}
