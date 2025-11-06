import type { OnboardingProfileStatus, PersonalProfile } from './personal-profile.model.js'

export type UserRole = 'client' | 'freelancer' | 'seller' | 'admin' | 'super-admin' | 'guest'

export interface BaseUser {
  id: string
  username?: string
  email: string
  name: string
  role: UserRole
  verified: boolean
  createdAt: string
  passwordHash: string
  phone?: string
  /** false when account suspended (login blocked) */
  isActive: boolean
  nationalId?: string
  idFrontImageUrl?: string
  idBackImageUrl?: string
  profilePictureUrl?: string
  shortBio?: string
  socialLinks?: Record<string, string>
  profileComplete?: number
  verificationStatus?: 'pending' | 'submitted' | 'approved' | 'rejected'
  paidVerificationBadge?: boolean
  walletAccountNo?: string
  coins?: number
  /** Preferences, work context, and other optional self-description (see onboarding / profile). */
  personalProfile?: PersonalProfile
  /** Whether the post-signup profile questionnaire was finished, skipped, or still pending. */
  onboardingProfileStatus?: OnboardingProfileStatus
}

export interface Freelancer extends BaseUser {
  role: 'freelancer'
  bio: string
  skills: string[]
  hourlyRate: number
  rating: number
  completedProjects: number
  earnings: number
  location: string
  profileComplete: number
}

export interface Client extends BaseUser {
  role: 'client'
  company: string
  industry: string
  location: string
  verifiedPayment: boolean
}

export type User = Freelancer | Client | BaseUser

export type PublicUser = Omit<User, 'passwordHash'>

