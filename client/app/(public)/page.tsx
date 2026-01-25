import { HeroSection } from '@/components/home/hero-section'
import { FindFreelancersSection } from '@/components/home/find-freelancers-section'
import { FeaturedFreelancers } from '@/components/home/featured-freelancers'
import { LatestJobs } from '@/components/home/latest-jobs'
import { WhyChooseEliteSection } from '@/components/home/why-choose-elite-section'
import { HowItWorks } from '@/components/home/how-it-works'
import { HomeFaqSection } from '@/components/home/home-faq-section'
import { Testimonials } from '@/components/home/testimonials'

export default function Home() {
  return (
    <>
      <HeroSection />
      <FindFreelancersSection />
      <FeaturedFreelancers />
      <LatestJobs />
      <WhyChooseEliteSection />
      <HowItWorks />
      <HomeFaqSection />
      <Testimonials />
    </>
  )
}
