import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-12 bg-gradient-to-br from-background to-card">
      <Suspense fallback={<div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
