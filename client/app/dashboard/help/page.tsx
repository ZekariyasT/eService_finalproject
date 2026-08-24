'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MessageCircle, FileText, Shield, CreditCard, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const helpCategories = [
    {
      title: 'Getting Started',
      icon: FileText,
      articles: [
        'How to create an account',
        'Setting up your profile',
        'Choosing between freelancer and client',
      ],
    },
    {
      title: 'Payments & Money',
      icon: CreditCard,
      articles: [
        'How payments work',
        'Withdrawal process',
        'Payment methods',
        'Escrow explained',
      ],
    },
    {
      title: 'Safety & Trust',
      icon: Shield,
      articles: [
        'Account security',
        'Reporting issues',
        'Dispute resolution',
        'Verification process',
      ],
    },
    {
      title: 'Account Issues',
      icon: AlertCircle,
      articles: [
        'Password reset',
        'Account recovery',
        'Changing email',
        'Account deletion',
      ],
    },
  ]

  const filteredCategories = helpCategories.map((cat) => ({
    ...cat,
    articles: cat.articles.filter((article) =>
      article.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  }))

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
      <p className="text-muted-foreground mb-8">Find answers to common questions and get support</p>

      {/* Search */}
      <div className="mb-8 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCategories.map((category) => (
          <Card key={category.title} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <category.icon className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-lg">{category.title}</h3>
            </div>

            <ul className="space-y-2">
              {category.articles.length === 0 ? (
                <li className="text-sm text-muted-foreground">No articles found</li>
              ) : (
                category.articles.map((article) => (
                  <li key={article}>
                    <button className="text-sm text-primary hover:underline text-left">
                      {article}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </Card>
        ))}
      </div>

      {/* Contact Support */}
      <Card className="mt-8 p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-center gap-4">
          <MessageCircle className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Still need help?</h3>
            <p className="text-muted-foreground text-sm">
              Can't find what you're looking for? Contact our support team
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">Contact Support</Button>
        </div>
      </Card>

      {/* FAQ */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>

        <div className="space-y-4 max-w-2xl">
          {[
            {
              q: 'How do I get paid?',
              a: 'Payments are held in escrow until the project is completed. Once you deliver and the client approves, funds are released to your account.',
            },
            {
              q: 'Is my information safe?',
              a: 'Yes, we use industry-standard encryption and security measures to protect your personal and payment information.',
            },
            {
              q: 'Can I withdraw funds anytime?',
              a: 'You can withdraw available funds anytime through our withdrawal system. Processing takes 1-3 business days.',
            },
            {
              q: "What if there's a dispute?",
              a: 'Our support team helps resolve disputes between clients and freelancers fairly and transparently.',
            },
          ].map((faq, idx) => (
            <Card key={idx} className="p-6">
              <h4 className="font-semibold mb-2">{faq.q}</h4>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
