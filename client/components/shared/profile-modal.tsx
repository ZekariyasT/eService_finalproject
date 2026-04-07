'use client'

import { useState } from 'react'
import { X, Mail, MapPin, Star, Award, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'
import { HireInvitationDialog } from '@/components/hire/hire-invitation-dialog'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: {
    id: string
    name: string
    title: string
    avatar: string
    bio: string
    location: string
    rating: number
    reviews: number
    projects: number
    hourlyRate: number
    skills: string[]
    serviceId?: string
  }
}

export function ProfileModal({ isOpen, onClose, profile }: ProfileModalProps) {
  const { user, isAuthenticated, isInitializing } = useAuth()
  const [contactOpen, setContactOpen] = useState(false)
  const [hireOpen, setHireOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [contactError, setContactError] = useState('')
  const [contactSuccess, setContactSuccess] = useState('')
  const canHireOrContact = isAuthenticated && !isInitializing && user?.role === 'client'

  if (!isOpen && !hireOpen) return null

  const sendMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed) return
    setSending(true)
    setContactError('')
    setContactSuccess('')
    try {
      await apiFetch('/messages', {
        method: 'POST',
        json: {
          receiverId: profile.id,
          body: trimmed,
        },
      })
      setContactSuccess('Message sent.')
      setMessage('')
      setContactOpen(false)
    } catch (e) {
      setContactError(e instanceof Error ? e.message : 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {isOpen && !hireOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-xl">
          <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-primary to-accent p-6">
            <h2 className="text-2xl font-bold text-white">Profile</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white hover:bg-white/20"
              aria-label="Close profile"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div className="flex items-start gap-4">
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={100}
                height={100}
                className="h-24 w-24 rounded-full border-4 border-primary"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <p className="text-lg font-medium text-primary">{profile.title}</p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{profile.rating}</span>
                    <span className="text-muted-foreground">{profile.projects} completed projects</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-bold">About</h3>
              <p className="leading-relaxed text-muted-foreground">{profile.bio}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-secondary/30 p-4 text-center">
                <Award className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">${profile.hourlyRate}/hr</p>
                <p className="text-sm text-muted-foreground">Hourly Rate</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-4 text-center">
                <Users className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{profile.projects}+</p>
                <p className="text-sm text-muted-foreground">Projects</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-4 text-center">
                <Star className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{profile.rating}</p>
                <p className="text-sm text-muted-foreground">Rating</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-bold">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {canHireOrContact ? (
              !contactOpen ? (
                <div className="flex gap-3 border-t pt-4">
                  <Button className="flex-1" size="lg" onClick={() => setHireOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Hire
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      setContactError('')
                      setContactSuccess('')
                      setContactOpen(true)
                    }}
                  >
                    Send Message
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 border-t pt-4">
                  {contactError ? (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{contactError}</p>
                  ) : null}
                  {contactSuccess ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{contactSuccess}</p>
                  ) : null}
                  <textarea
                    placeholder="Write your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-24 w-full rounded-lg border border-border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={!message.trim() || sending} onClick={() => void sendMessage()}>
                      {sending ? 'Sending...' : 'Send'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setContactOpen(false)
                        setMessage('')
                        setContactError('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>
      ) : null}

      <HireInvitationDialog
        open={hireOpen}
        onOpenChange={(open) => {
          setHireOpen(open)
          if (!open) onClose()
        }}
        freelancerId={profile.id}
        freelancerName={profile.name}
        serviceId={profile.serviceId}
      />
    </>
  )
}
