import { SplitHero } from '@/components/shared/split-hero'
import { LatestJobs } from '@/components/home/latest-jobs'
import { AvailableProducts } from '@/components/products/available-products'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: 'Digital Products - Elite Ethiopia',
  description: 'Buy and sell digital products on Elite Ethiopia. Explore templates, courses, graphics, and more.',
}

export default function ProductsPage() {
  return (
    <>
      <SplitHero
        title="Monetize Your Creativity"
        titleAccent="Creativity"
        description="Sell digital products and generate passive income. Create once, sell forever. Thousands of products sold daily on our platform by designers, developers, and creators."
        image="/projects-hero.png"
        imageAlt="Desktop computer displaying the Elite Ethiopia Projects marketplace with product listings"
        cta={
          <>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-[#0A5B59] hover:bg-white/90 shadow-lg shadow-black/10 cursor-pointer"
              >
                Shop Products
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm cursor-pointer"
              >
                Sell Your Products
              </Button>
            </Link>
          </>
        }
      />
      <LatestJobs variant="compact" />
      <AvailableProducts />
    </>
  )
}
