export type ContractDeliveryRecord = {
  id: string
  jobId: string
  freelancerId: string
  summary: string
  linkUrl: string | null
  status: string
  clientFeedback: string | null
  createdAt: string
  reviewedAt: string | null
}

export type ContractRecord = {
  id: string
  clientId: string
  clientName: string
  freelancerId: string
  freelancerName: string
  title: string
  description: string
  category: string
  budget: number
  hourlyRate: number
  jobType: string
  status: string
  deadline: string | null
  duration: string | null
  createdAt: string
  updatedAt: string
}

export type ContractTab = 'active' | 'completed' | 'cancelled'

export function contractTabForStatus(status: string): ContractTab {
  if (status === 'completed') return 'completed'
  if (status === 'cancelled') return 'cancelled'
  return 'active'
}
