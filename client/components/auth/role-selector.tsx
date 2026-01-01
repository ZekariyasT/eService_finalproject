'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Briefcase, Users, Store } from 'lucide-react'

export function RoleSelector() {
  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Get Started</h1>
        <p className="text-lg text-muted-foreground">Choose how you want to use Elite Ethiopia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { role: 'freelancer', title: 'Freelancer', description: 'Offer services and receive jobs', icon: Briefcase },
          { role: 'client', title: 'Client', description: 'Browse and hire professionals', icon: Users },
          { role: 'seller', title: 'Seller', description: 'Sell physical and digital products', icon: Store },
        ].map((item) => (
          <Link href={`/signup/${item.role}`} key={item.role}>
            <div className="h-full border-2 border-border rounded-lg p-8 hover:border-primary hover:shadow-lg transition-all cursor-pointer">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
              <Button className="w-full" variant={item.role === 'client' ? 'outline' : 'default'}>
                Continue
              </Button>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}
