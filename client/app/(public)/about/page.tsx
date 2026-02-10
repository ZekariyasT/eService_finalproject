import { SplitHero } from '@/components/shared/split-hero'
import { AboutOverview } from '@/components/about/about-overview'
import { HowToSection } from '@/components/about/how-to-section'
import { PricingSection } from '@/components/about/pricing-section'
import { Testimonials } from '@/components/home/testimonials'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: 'About Elite Ethiopia - Our Story & Mission',
  description: 'Learn about Elite Ethiopia, our mission to connect talented professionals with opportunities across Africa.',
}

export default function AboutPage() {
  return (
    <>
      <SplitHero
        title="Empowering Talent Across the Continent"
        titleAccent="Talent"
        description="Elite Ethiopia connects skilled professionals with businesses that need them. We're revolutionizing how work gets done in Africa, one project at a time."
        image="/about-hero-image.jpg"
        imageAlt="Elite Ethiopia Team"
        cta={
          <>
            <Link href="/signup/freelancer">
              <Button size="lg" className="bg-teal-600  text-white hover:bg-teal-700 cursor-pointer">
                Join as Freelancer
              </Button>
            </Link>
            <Link href="/signup/client">
              <Button size="lg" variant="outline" className="border-white text-black hover:bg-white/10 cursor-pointer">
                Hire Talent
              </Button>
            </Link>
          </>
        }
      />
      <AboutOverview />
      <HowToSection />
      <PricingSection />
      <Testimonials variant="about" />
    </>
  )
}
