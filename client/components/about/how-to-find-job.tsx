'use client'

import { Briefcase, Search, Send, CheckCircle } from 'lucide-react'

export function HowToFindJob() {
  const steps = [
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: 'Complete Your Profile',
      description: 'Highlight your skills, portfolio, and experience to attract clients'
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: 'Browse Available Jobs',
      description: 'Search through thousands of projects matching your expertise'
    },
    {
      icon: <Send className="w-8 h-8" />,
      title: 'Send Proposals',
      description: 'Submit personalized proposals to clients and stand out from the crowd'
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: 'Get Hired & Earn',
      description: 'Once selected, complete the work and receive payment securely'
    },
  ]

  return (
    <section className="pt-32 md:pt-40 pb-20 md:pb-32 container mx-auto px-4">
      <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">How to Find a Job</h2>
      <p className="text-lg text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
        Finding your next project on Elite Ethiopia is simple and straightforward
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <div key={index} className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-lg border border-primary/20 h-full">
              <div className="text-primary mb-4">{step.icon}</div>
              <div className="text-3xl font-bold text-primary/20 mb-2">{String(index + 1).padStart(2, '0')}</div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-primary rounded-full"></div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
