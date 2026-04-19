export const CONTRACT_END_REASONS = [
  { value: 'no_longer_needed', label: 'I no longer need this work completed' },
  { value: 'job_completed', label: 'Job completed successfully' },
  { value: 'freelancer_not_responsive', label: 'Freelancer not responsive' },
  { value: 'freelancer_misrepresented_skills', label: 'Freelancer misrepresented his/her skills' },
  { value: 'hired_different_freelancer', label: 'I hired a different freelancer' },
  { value: 'other', label: 'Another reason' },
] as const

export type ContractEndReasonValue = (typeof CONTRACT_END_REASONS)[number]['value']

export const FREELANCER_FEEDBACK_CATEGORIES = [
  { key: 'skills', label: 'Skills' },
  { key: 'qualityOfWork', label: 'Quality of Work' },
  { key: 'availability', label: 'Availability' },
  { key: 'adherenceToSchedule', label: 'Adherence to Schedule' },
  { key: 'communication', label: 'Communication' },
  { key: 'cooperation', label: 'Cooperation' },
] as const

export type FreelancerFeedbackCategoryKey = (typeof FREELANCER_FEEDBACK_CATEGORIES)[number]['key']

export type FreelancerFeedbackScores = Record<FreelancerFeedbackCategoryKey, number>

export function averageFeedbackScore(scores: FreelancerFeedbackScores): number {
  const values = FREELANCER_FEEDBACK_CATEGORIES.map((category) => scores[category.key])
  const total = values.reduce((sum, value) => sum + value, 0)
  return Math.round((total / values.length) * 10) / 10
}

export function contractEndReasonLabel(value: ContractEndReasonValue): string {
  return CONTRACT_END_REASONS.find((reason) => reason.value === value)?.label ?? value
}
