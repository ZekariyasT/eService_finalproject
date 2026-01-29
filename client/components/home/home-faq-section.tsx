'use client'

import Link from 'next/link'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const FAQ_ITEMS = [
  {
    q: 'What is Elite Ethiopia?',
    a: 'Elite Ethiopia is a freelance and digital marketplace where clients hire freelancers for projects, and creators can offer services and digital products—all with structured workflows, messaging, and payments in one place.',
  },
  {
    q: 'How do I hire a freelancer?',
    a: 'Create a client account, post a job with scope and budget, then review proposals from freelancers. When you are ready, hire through the platform, keep communication in the thread, and approve work before payment is released.',
  },
  {
    q: 'How do payments and the wallet work?',
    a: 'You fund your wallet and use it for orders and purchases depending on your role. Amounts tied to jobs and products follow the platform’s order flow so you can see what is pending, completed, or refunded where applicable.',
  },
  {
    q: 'Can I sell digital products here?',
    a: 'Yes. Sellers can list digital products for clients to discover and purchase. Combine that with freelancing if you offer both custom work and ready-made assets.',
  },
  {
    q: 'What if there is a problem with an order?',
    a: 'Use the disputes flow if you cannot resolve an issue with the other party. That keeps a record for review instead of relying only on informal messages.',
  },
  {
    q: 'Do I need a separate account for freelancing and buying?',
    a: 'Accounts are role-based (client, freelancer, seller). Use the role that matches what you are doing; if you both hire and deliver work, follow the signup paths that match each side of the marketplace.',
  },
  {
    q: 'Where can I get more help?',
    a: 'Visit our About and Contact pages for more detail, or reach out through the contact form if your question is not covered here.',
  },
] as const

export function HomeFaqSection() {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          <p className="mt-3 text-muted-foreground">
            Quick answers about hiring, selling, and using Elite Ethiopia.{' '}
            <Link href="/contact" className="font-medium text-teal-700 underline-offset-4 hover:underline dark:text-teal-400">
              Contact us
            </Link>{' '}
            for anything specific to your account.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-10 w-full">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
