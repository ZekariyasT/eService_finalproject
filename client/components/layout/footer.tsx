'use client'

import Link from 'next/link'
import Image from 'next/image'
import { TranslatedText } from '@/lib/translation-context'

export function Footer() {
  return (
    <footer className="border-t border-primary/15 bg-secondary/35">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center mb-4 hover:opacity-80 transition-opacity">
              <Image 
                src="/logo.png" 
                alt="Elite Ethiopia" 
                width={50} 
                height={50}
                className="w-12 h-12"
              />
            </Link>
            <p className="text-muted-foreground text-sm">
              <TranslatedText text="Africa's premier freelance marketplace connecting talent with opportunity." />
            </p>
          </div>

          {/* For Freelancers */}
          <div>
            <h4 className="font-semibold mb-4"><TranslatedText text="For Freelancers" /></h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Find Work" /></Link></li>
              <li><Link href="/signup/freelancer" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Create Profile" /></Link></li>
              <li><Link href="/dashboard/freelancer/wallet" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Earnings" /></Link></li>
              <li><Link href="/about/how-to-find-job" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Resources" /></Link></li>
            </ul>
          </div>

          {/* For Clients */}
          <div>
            <h4 className="font-semibold mb-4"><TranslatedText text="For Clients" /></h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/signup/client" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Post Job" /></Link></li>
              <li><Link href="/about/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="How It Works" /></Link></li>
              <li><Link href="/services" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Pricing" /></Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Enterprise" /></Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4"><TranslatedText text="Company" /></h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="About" /></Link></li>
              <li><Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Products" /></Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Support" /></Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors"><TranslatedText text="Contact" /></Link></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8"></div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>
            <TranslatedText text="© 2026 Elite Ethiopia. All rights reserved." />
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-primary transition-colors"><TranslatedText text="Privacy Policy" /></Link>
            <Link href="/terms" className="hover:text-primary transition-colors"><TranslatedText text="Terms of Service" /></Link>
            <Link href="/cookies" className="hover:text-primary transition-colors"><TranslatedText text="Cookie Policy" /></Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
