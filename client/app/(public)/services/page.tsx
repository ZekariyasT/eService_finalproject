import Link from 'next/link'
import { AvailableServices } from '@/components/services/available-services'
import { SplitHero } from '@/components/shared/split-hero'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Expertise - Elite Ethiopia',
  description: 'Explore freelance expertise on Elite Ethiopia. Hire talent or offer your skills in web development, design, content, marketing, and more.',
}

type ServicesPageProps = {
  searchParams?:
    | {
        q?: string
        scope?: string
        serviceCategory?: string
        maxPrice?: string
        maxDeliveryDays?: string
        minRating?: string
        location?: string
        sort?: string
        page?: string
      }
    | Promise<{
        q?: string
        scope?: string
        serviceCategory?: string
        maxPrice?: string
        maxDeliveryDays?: string
        minRating?: string
        location?: string
        sort?: string
        page?: string
      }>
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialFilters = {
    q: typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q : '',
    scope: typeof resolvedSearchParams?.scope === 'string' ? resolvedSearchParams.scope : '',
    serviceCategory: typeof resolvedSearchParams?.serviceCategory === 'string' ? resolvedSearchParams.serviceCategory : '',
    maxPrice: typeof resolvedSearchParams?.maxPrice === 'string' ? resolvedSearchParams.maxPrice : '',
    maxDeliveryDays: typeof resolvedSearchParams?.maxDeliveryDays === 'string' ? resolvedSearchParams.maxDeliveryDays : '',
    minRating: typeof resolvedSearchParams?.minRating === 'string' ? resolvedSearchParams.minRating : '',
    location: typeof resolvedSearchParams?.location === 'string' ? resolvedSearchParams.location : '',
    sort: typeof resolvedSearchParams?.sort === 'string' ? resolvedSearchParams.sort : 'newest',
    page: typeof resolvedSearchParams?.page === 'string' ? resolvedSearchParams.page : '1',
  }

  return (
    <>
      <SplitHero
        title="Find Expert Talent for Any Project"
        titleAccent="Expert Talent"
        description="Browse skilled freelancers across web development, design, content, marketing, video, and more. Hire vetted professionals who deliver — fast."
        image="/expertise-hero.png"
        imageAlt="Three professionals collaborating on laptops and a tablet in a modern Elite Ethiopia office lounge."
        cta={
          <>
            <Link href="#available-services">
              <Button
                size="lg"
                className="bg-white text-[#0A5B59] hover:bg-white/90 shadow-lg shadow-black/10 cursor-pointer"
              >
                Browse Experts
              </Button>
            </Link>
            <Link href="/signup/freelancer">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm cursor-pointer"
              >
                Become a Freelancer
              </Button>
            </Link>
          </>
        }
      />
      <AvailableServices initialFilters={initialFilters} />
    </>
  )
}
