/** Optional questionnaire stored as JSON on `users.personal_profile_json`. */
export type OnboardingProfileStatus = 'pending' | 'completed' | 'skipped'

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
