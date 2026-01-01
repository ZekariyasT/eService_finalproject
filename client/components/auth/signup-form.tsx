'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Lock, Phone, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { getApiBase, getGoogleOAuthStartUrl } from '@/lib/api'
import { FreelancerSkillsField } from '@/components/profile/freelancer-skills-field'

interface SignupFormProps {
  role: 'freelancer' | 'client' | 'seller'
}

export function SignupForm({ role }: SignupFormProps) {
  const router = useRouter()
  const { signup, isAuthActionPending } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company: '',
    industry: '',
  })
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      const { debugVerificationLink } = await signup(role, {
        ...formData,
        skills: role === 'freelancer' ? selectedSkills : undefined,
      })
      if (typeof window !== 'undefined' && debugVerificationLink) {
        sessionStorage.setItem('elite_debug_verification_link', debugVerificationLink)
      }
      const emailQ = encodeURIComponent(formData.email.trim())
      const next = encodeURIComponent(`/auth/check-email?email=${emailQ}`)
      router.push(`/onboarding/profile?next=${next}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Join as {role === 'freelancer' ? 'a Freelancer' : 'a Client'}
        </h1>
        <p className="text-muted-foreground">Get started on Elite Ethiopia in minutes</p>
      </div>

      <p className="mb-4 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100/95 [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1">
        The API must be running at <code>{getApiBase()}</code> (<code>backend</code> folder → <code>npm run dev</code>). Otherwise
        Google sign-in opens a blank/refused page—same as login failures.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="tel"
              name="phone"
              placeholder="+251 9xx xxx xxxx"
              value={formData.phone}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        {role === 'client' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <Input
                name="company"
                placeholder="Your Company"
                value={formData.company}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Industry</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                required
              >
                <option value="">Select an industry</option>
                <option value="tech">Technology</option>
                <option value="ecommerce">E-commerce</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            </div>
          </>
        )}

        {role === 'freelancer' && (
          <div>
            <label className="block text-sm font-medium mb-2">Your skills & services</label>
            <FreelancerSkillsField
              value={selectedSkills}
              onChange={setSelectedSkills}
              helperText="Pick from suggestions or add your own (video, writing, finance, languages, admin work, and more — not only software development)."
            />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={isAuthActionPending || (role === 'freelancer' && selectedSkills.length === 0)}
        >
          <UserCheck className="w-4 h-4 mr-2" />
          {isAuthActionPending ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">Or sign up with</span>
          </div>
        </div>
        <Button variant="outline" className="w-full" type="button" asChild>
          <a href={getGoogleOAuthStartUrl('signup', role)}>Continue with Google</a>
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          We’ll create your {role} account using your Google name and email. You can finish profile details afterward.
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}
