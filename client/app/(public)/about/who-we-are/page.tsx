import { WhoWeAre } from '@/components/about/who-we-are'
import { Testimonials } from '@/components/home/testimonials'

export const metadata = {
  title: 'Who We Are - Elite Ethiopia',
  description: 'Discover Elite Ethiopia company values and our commitment to connecting talent with opportunity.',
}

export default function WhoWeArePage() {
  return (
    <>
      <WhoWeAre />
      <Testimonials variant="about" />
    </>
  )
}
