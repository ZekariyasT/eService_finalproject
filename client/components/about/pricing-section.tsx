'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function PricingSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Pricing</h2>
          <p className="text-xl text-muted-foreground">
            Subscription tiers and fee schedules are configured per deployment. Use signup to create an account; billing
            rules will apply once enabled by your administrator.
          </p>
        </div>

        <div className="max-w-lg mx-auto border border-border rounded-xl p-8 text-center bg-card">
          <p className="text-muted-foreground mb-6">
            For partnership or enterprise pricing, reach out through the contact page.
          </p>
          <Button asChild className="w-full">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
