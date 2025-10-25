export type UserRole = 'client' | 'freelancer' | 'seller' | 'admin' | 'super-admin' | 'guest'

export type OnboardingProfileStatus = 'pending' | 'completed' | 'skipped'

/** Stored in `personalProfile` — likes/dislikes, work context, communication preferences, etc. */
export interface PersonalProfile {
  likes?: string
  dislikes?: string
  workRole?: string
  workSummary?: string
  yearsExperience?: string
  availability?: string
  languages?: string
  timezone?: string
  communicationPreference?: string
  education?: string
  personalNotes?: string
  dateOfBirth?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  username?: string
  avatar?: string
  verified: boolean
  createdAt: string
  /** false when suspended by Super Admin */
  isActive?: boolean
  phone?: string
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
  personalProfile?: PersonalProfile
  onboardingProfileStatus?: OnboardingProfileStatus
}

export interface Freelancer extends User {
  bio: string
  skills: string[]
  hourlyRate: number
  rating: number
  completedProjects: number
  earnings: number
  location: string
  profileComplete: number
}

export interface Client extends User {
  company: string
  industry: string
  location: string
  verifiedPayment: boolean
}

export interface Job {
  id: string
  title: string
  description: string
  clientId: string
  category: string
  budget: number
  deadline: string
  skillsRequired: string[]
  status: 'open' | 'in-progress' | 'completed' | 'closed'
  proposals: number
  createdAt: string
}

export interface Proposal {
  id: string
  jobId: string
  freelancerId: string
  bidAmount: number
  coverLetter: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export interface Contract {
  id: string
  jobId: string
  freelancerId: string
  clientId: string
  status: 'active' | 'completed' | 'cancelled'
  startDate: string
  endDate?: string
  amount: number
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: string
  read: boolean
}

/** In-app notification from GET /api/notifications */
export interface AppNotification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

export interface Review {
  id: string
  authorId: string
  targetId: string
  rating: number
  comment: string
  createdAt: string
}

export interface Transaction {
  id: string
  userId: string
  type: 'deposit' | 'withdrawal' | 'payment'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  date: string
}
