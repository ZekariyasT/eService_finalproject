import { RoleSelector } from '@/components/auth/role-selector'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
      <RoleSelector />
    </div>
  )
}
