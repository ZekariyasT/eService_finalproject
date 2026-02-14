import { SplitHero } from '@/components/shared/split-hero'
import { ContactForm } from '@/components/contact/contact-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: 'Contact Us - Elite Ethiopia',
  description: 'Get in touch with Elite Ethiopia. We would love to hear from you.',
}

export default function ContactPage() {
  return (
    <>
      <SplitHero
        title="Get in Touch With Us"
        titleAccent="Touch"
        description="Have questions about Elite Ethiopia? Want to become a partner? Need support? Our team is ready to help you. Reach out to us through the contact form or visit our office."
        image="/contact-hero-image.jpg"
        imageAlt="Customer Support Team"
        cta={
          <Link href="#contact-form">
            <Button
              size="lg"
              className="bg-white text-[#0A5B59] hover:bg-white/90 shadow-lg shadow-black/10 cursor-pointer"
            >
              Send Message
            </Button>
          </Link>
        }
      />
      <ContactForm />
    </>
  )
}
