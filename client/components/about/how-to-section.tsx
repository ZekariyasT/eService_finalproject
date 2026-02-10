'use client'

import { ArrowRight, Search, FileText, MessageSquare, CheckCircle } from 'lucide-react'

export function HowToSection() {
  const freelancerSteps = [
    { icon: FileText, title: 'Create Profile', desc: 'Build your professional profile with portfolio and skills' },
    { icon: Search, title: 'Find Jobs', desc: 'Browse and apply for jobs matching your expertise' },
    { icon: MessageSquare, title: 'Communicate', desc: 'Discuss details with clients and clarify requirements' },
    { icon: CheckCircle, title: 'Deliver & Earn', desc: 'Complete work and receive secure payments' },
  ]

  const clientSteps = [
    { icon: FileText, title: 'Post Job', desc: 'Describe your project and requirements clearly' },
    { icon: Search, title: 'Review Proposals', desc: 'Browse freelancer profiles and their bids' },
    { icon: MessageSquare, title: 'Interview', desc: 'Connect with top candidates and discuss details' },
    { icon: CheckCircle, title: 'Pay Securely', desc: 'Payment held in escrow until project completion' },
  ]

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground">Simple steps to find work or hire talent</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Freelancer Path */}
          <div>
            <h3 className="text-2xl font-bold mb-8 text-primary">For Freelancers</h3>
            <div className="space-y-8">
              {freelancerSteps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{step.title}</h4>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client Path */}
          <div>
            <h3 className="text-2xl font-bold mb-8 text-primary">For Clients</h3>
            <div className="space-y-8">
              {clientSteps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{step.title}</h4>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
