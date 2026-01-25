'use client'

import { CATEGORIES } from '@/lib/constants'

export function CategoriesSection() {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Browse by Category</h2>
          <p className="text-muted-foreground text-lg">Find the perfect services for your business needs</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              className="group flex flex-col items-center p-8 rounded-lg border border-border bg-card hover:border-primary hover:shadow-lg transition-all"
            >
              <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {category.icon}
              </span>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {category.name}
              </h3>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
