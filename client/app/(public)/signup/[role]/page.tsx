import { SignupForm } from '@/components/auth/signup-form'

interface RoleSignupPageProps {
  params: Promise<{ role: 'freelancer' | 'client' | 'seller' }>
}

export default async function RoleSignupPage({ params }: RoleSignupPageProps) {
  const { role } = await params
  
  if (!['freelancer', 'client', 'seller'].includes(role)) {
    return <div>Invalid role</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
      <SignupForm role={role} />
    </div>
  )
}
