'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react'
import { apiFetch } from '@/lib/api'

const OFFICE_MAP_URL = 'https://maps.app.goo.gl/en4VHKzDwGktUwKq9'
const OFFICE_PHONE = '+251962042225'
const OFFICE_EMAIL = 'support@eliteethiopia.com'
const OFFICE_LOCATION = 'Addis Ababa, Ethiopia'

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setSubmitting(true)
    try {
      await apiFetch('/contact', {
        method: 'POST',
        json: formData,
      })
      setFeedback({ type: 'ok', text: 'Thank you for your message. We will get back to you soon.' })
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not send your message. Please try again later.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email',
      value: OFFICE_EMAIL,
      href: `mailto:${OFFICE_EMAIL}`,
      hint: 'Tap to compose',
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Phone',
      value: OFFICE_PHONE,
      href: `tel:${OFFICE_PHONE.replace(/\s+/g, '')}`,
      hint: 'Mon – Sat, 9am – 6pm EAT',
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Address',
      value: OFFICE_LOCATION,
      href: OFFICE_MAP_URL,
      hint: 'Open in Google Maps',
      external: true,
    },
  ]

  return (
    <>
      <section className="relative py-24 md:py-40 overflow-hidden bg-gradient-to-br from-[#e6f7f5] via-[#d4ede8] to-[#c2e5dd]">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute -top-40 left-10 w-80 h-80 bg-[#8fe9e2] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute -bottom-40 right-10 w-80 h-80 bg-[#a8e6d9] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-[#0A5B59] mb-6">
            Get in{' '}
            <span className="bg-gradient-to-r from-[#00786F] to-[#34bdb3] bg-clip-text text-transparent">
              Touch
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#0A5B59]/80 max-w-2xl mx-auto">
            Have a question or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {contactInfo.map((info, index) => (
            <a
              key={index}
              href={info.href}
              {...(info.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group relative bg-card p-8 rounded-xl border border-border text-center hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              {info.external ? (
                <ExternalLink className="absolute top-3 right-3 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              ) : null}
              <div className="text-primary mb-4 flex justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  {info.icon}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-foreground">{info.title}</h3>
              <p className="text-primary font-medium break-words">{info.value}</p>
              {info.hint ? (
                <p className="mt-2 text-xs text-muted-foreground">{info.hint}</p>
              ) : null}
            </a>
          ))}
        </div>

        {/* Embedded map */}
        <div className="mb-16 overflow-hidden rounded-xl border border-border shadow-sm">
          <iframe
            title="Elite Ethiopia office location"
            src={`https://www.google.com/maps?q=${encodeURIComponent(OFFICE_LOCATION)}&output=embed`}
            width="100%"
            height="320"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-72 md:h-96 border-0"
            allowFullScreen
          />
          <div className="flex items-center justify-between gap-3 bg-card px-5 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{OFFICE_LOCATION}</span>
            </div>
            <a
              href={OFFICE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Get directions
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div id="contact-form" className="max-w-2xl mx-auto bg-card p-8 rounded-lg border border-border scroll-mt-24">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <Input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="How can we help?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your message..."
                rows={6}
                required
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {feedback ? (
              <p
                role="status"
                className={
                  feedback.type === 'ok' ? 'text-sm text-primary' : 'text-sm text-destructive'
                }
              >
                {feedback.text}
              </p>
            ) : null}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Message'}
            </Button>
          </form>
        </div>
      </div>
    </section>
    </>
  )
}
