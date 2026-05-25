'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function ProductsHero() {
  return (
    <section className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-br from-[#0A5B59] via-[#00786F] to-[#065a54]">
      <div className="absolute inset-0 opacity-25">
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#34bdb3] rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#00786F] rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative container mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight mb-6 text-white">
            Digital Products
          </h1>
          <p className="text-lg md:text-xl text-teal-50 mb-8">
            Buy and sell high-quality digital products: templates, courses, themes, graphics, and more. Scale your income with passive sales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                Shop Products
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 border-white/30 text-white hover:text-white">
                Sell Your Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
