import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy - Elite Ethiopia',
  description: 'How Elite Ethiopia uses cookies and similar technologies on our website.',
}

export default function CookiePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-32 md:pt-40 pb-12 md:pb-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Cookie Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: May 12, 2026</p>

      <div className="mt-10 space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2">
        <section>
          <h2>What are cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help the site remember your
            preferences, keep you signed in, and understand how the service is used.
          </p>
        </section>

        <section>
          <h2>How we use cookies</h2>
          <p>Elite Ethiopia may use cookies and similar technologies for purposes such as:</p>
          <ul>
            <li>
              <strong className="text-foreground">Essential:</strong> authentication, security, load balancing, and core
              site functionality.
            </li>
            <li>
              <strong className="text-foreground">Preferences:</strong> remembering settings like language or layout where
              applicable.
            </li>
            <li>
              <strong className="text-foreground">Analytics:</strong> understanding traffic and feature usage to improve the
              product (often through aggregated or pseudonymous data).
            </li>
          </ul>
        </section>

        <section>
          <h2>Third parties</h2>
          <p>
            Some cookies may be set by trusted partners (for example analytics or authentication providers). Their use is
            governed by their respective privacy notices in addition to our{' '}
            <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            Most browsers let you block or delete cookies through settings. Blocking essential cookies may affect sign-in
            or security features. Where required, we will provide additional controls or consent mechanisms for non-essential
            cookies.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For questions about this policy, use our{' '}
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
