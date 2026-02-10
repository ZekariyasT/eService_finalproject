'use client'

import { ArrowRight } from 'lucide-react'

export function HowItWorksAbout() {
  const steps = [
    {
      number: '01',
      title: 'Create Your Profile',
      description: 'Sign up and tell us about your skills, experience, or business'
    },
    {
      number: '02',
      title: 'Browse & Connect',
      description: 'Discover opportunities or find the perfect freelancer for your needs'
    },
    {
      number: '03',
      title: 'Collaborate',
      description: 'Work together, communicate in real-time, and deliver exceptional results'
    },
    {
      number: '04',
      title: 'Get Paid Securely',
      description: 'Receive payments safely through our secure escrow system'
    },
  ]

  return (
    <section className="pt-32 md:pt-40 pb-20 md:pb-32 bg-secondary/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">How It Works</h2>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-card p-8 rounded-lg border border-border hover:border-primary transition-colors">
                  <div className="text-5xl font-bold text-primary/20 mb-4">{step.number}</div>
                  <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-primary/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
