'use client'

import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, DollarSign, CheckCircle2, Star, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function FreelancerDashboard() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your account today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Earnings this month</p>
              <p className="text-3xl font-bold">${user?.earnings || 0}</p>
            </div>
            <DollarSign className="w-10 h-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Active Contracts</p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <Briefcase className="w-10 h-10 text-accent opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Proposals Sent</p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-secondary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Your Rating</p>
              <p className="text-3xl font-bold">{user?.rating || 0}</p>
            </div>
            <Star className="w-10 h-10 text-amber-400 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Profile Completion */}
      <Card className="p-6 mb-8">
        <h3 className="font-semibold mb-4">Complete Your Profile</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{user?.profileComplete || 0}% Complete</p>
              <p className="text-xs text-muted-foreground">Increase visibility</p>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${user?.profileComplete || 0}%` }}
              ></div>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { done: true, label: 'Create profile' },
              { done: true, label: 'Add profile photo' },
              { done: user?.profileComplete > 50, label: 'Add work samples' },
              { done: false, label: 'Verify identity' },
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <div className="w-4 h-4 border-2 border-border rounded-full" />
                )}
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Featured Jobs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recommended Jobs For You</h3>
          <Link href="/freelancer/find-jobs">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">Check back later for personalized job recommendations based on your skills</p>
      </Card>
    </div>
  )
}
