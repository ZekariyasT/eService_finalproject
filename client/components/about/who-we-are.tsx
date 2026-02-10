'use client'

import { CheckCircle } from 'lucide-react'

export function WhoWeAre() {
  const values = [
    { title: 'Integrity', description: 'We believe in transparent, honest partnerships' },
    { title: 'Excellence', description: 'Quality work and professional standards always' },
    { title: 'Innovation', description: 'Embracing new ideas and technologies' },
    { title: 'Community', description: 'Building a supportive ecosystem for all' },
  ]

  return (
    <section className="pt-32 md:pt-40 pb-20 md:pb-32 container mx-auto px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold mb-8">Who We Are</h2>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Elite Ethiopia is Africa's leading platform connecting talented freelancers, digital product creators, and innovative businesses. Founded with a mission to democratize work and commerce, we've built a trusted ecosystem where creativity and skill meet opportunity.
        </p>
        <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
          Our platform enables professionals to showcase their expertise, connect with clients worldwide, and build sustainable careers. Whether you're a freelancer seeking projects, a business hiring talent, or an entrepreneur selling digital products, Elite Ethiopia is your bridge to success.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {values.map((value) => (
            <div key={value.title} className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
