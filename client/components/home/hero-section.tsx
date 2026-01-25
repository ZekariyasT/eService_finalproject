'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Search } from 'lucide-react'

export function HeroSection() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const runSearch = (term?: string) => {
    const trimmed = (term ?? query).trim()
    const target = trimmed
      ? `/services?q=${encodeURIComponent(trimmed)}#available-services`
      : '/services#available-services'
    router.push(target)
  }

  const onSearchSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    runSearch()
  }

  return (
    <section 
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{
        backgroundImage: `url('/hero-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content — pushed below the fixed top nav so the title never sits under it. */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-28 md:pt-32 pb-16 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-white text-balance">
            Connect with Top <span className="bg-linear-to-r from-[#8fe9e2] to-[#00786F] bg-clip-text text-transparent">Expertise</span> or Find Your Next <span className="bg-linear-to-r from-[#00786F] to-[#8fe9e2] bg-clip-text text-transparent">Project</span>
          </h1>
          
          <p className="text-xl text-white/80 text-balance max-w-2xl mx-auto">
            Elite Ethiopia is Africa's premier freelance marketplace connecting skilled professionals with businesses ready to grow
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link href="/services">
              <Button size="lg" className="bg-primary hover:bg-primary/90 w-full sm:w-auto cursor-pointer">
                I want to hire <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/products">
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-primary/25 hover:text-white w-full sm:w-auto cursor-pointer"
              >
                I want to work <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mt-12">
            <form onSubmit={onSearchSubmit} className="flex items-center rounded-xl bg-white/95 p-1 shadow-lg">
              <Input 
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for expertise or projects..."
                className="h-11 border-0 bg-transparent px-4 text-gray-700 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 shrink-0 bg-primary hover:bg-primary/90 cursor-pointer"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </Button>
            </form>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 justify-center pt-6">
            {['Web Design', 'AI Development', 'Video Editing', 'Google Ads', 'Content Writing'].map((tag) => (
              <button 
                key={tag}
                className="px-4 py-2 rounded-full border border-white/35 text-teal-50 text-sm hover:bg-primary/25 transition-colors cursor-pointer"
                onClick={() => runSearch(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
