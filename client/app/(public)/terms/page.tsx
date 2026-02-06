import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service - Elite Ethiopia',
  description:
    'Terms and conditions for using the Elite Ethiopia freelance and services marketplace.',
}

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 md:pt-40 pb-12 md:pb-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: May 12, 2026</p>

      <div className="mt-10 space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2">
        <section>
          <h2>Agreement</h2>
          <p>
            By accessing or using Elite Ethiopia, you agree to these Terms of Service. If you do not agree, do not use
            the platform. We may update these terms from time to time; continued use after changes constitutes acceptance
            of the revised terms.
          </p>
        </section>

        <section>
          <h2>Eligibility and accounts</h2>
          <p>
            You must be able to form a binding contract in your jurisdiction and provide accurate registration
            information. You are responsible for safeguarding your credentials and for all activity under your account.
          </p>
        </section>

        <section>
          <h2>Marketplace rules</h2>
          <p>Users agree to:</p>
          <ul>
            <li>Use the platform in compliance with applicable laws and our community standards.</li>
            <li>Honor agreements made with other users regarding work, deliverables, and payments as facilitated by the site.</li>
            <li>Not circumvent fees, manipulate reviews, harass others, or misuse the messaging or dispute systems.</li>
          </ul>
        </section>

        <section>
          <h2>Fees and payments</h2>
          <p>
            Platform fees, payouts, and payment processing may be described elsewhere in the product or at checkout. You
            authorize us and our payment partners to charge or transfer amounts in accordance with those rules.
          </p>
        </section>

        <section>
          <h2>Disclaimers and limitation of liability</h2>
          <p>
            The platform is provided &quot;as is&quot; to the maximum extent permitted by law. Elite Ethiopia is not a party
            to contracts between clients and freelancers except as needed to operate payments or disputes as described
            in our policies. To the extent permitted by law, we are not liable for indirect or consequential damages arising
            from your use of the service.
          </p>
        </section>

        <section>
          <h2>Termination</h2>
          <p>
            We may suspend or terminate access for violations of these terms or for security reasons. You may stop using
            the service at any time; certain provisions survive termination where appropriate.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these terms? Visit our{' '}
            <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
              Contact
            </Link>{' '}
            page.
          </p>
        </section>
      </div>
    </div>
  )
}
