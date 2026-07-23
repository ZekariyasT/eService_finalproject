'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageAttachmentPreview } from '@/components/messaging/message-attachment-preview'
import Link from 'next/link'
import { MessageSquare, Paperclip, Send, Search, User, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiFetch, sendChatMessage } from '@/lib/api'

type Conversation = {
  peerId: string
  peerName: string
  lastMessage: string
  lastAt: string
}

type Msg = {
  id: string
  senderId: string
  receiverId: string
  body: string
  attachmentStoragePath: string | null
  attachmentOriginalName: string | null
  createdAt: string
}

export type DashboardInboxProps = {
  title?: string
  emptyHint?: React.ReactNode
  selectConversationHint?: string
  chatHeaderNote?: string
}

export function DashboardInbox({
  title = 'Messages',
  emptyHint = 'No conversations yet.',
  selectConversationHint = 'Select a conversation to start messaging.',
  chatHeaderNote = 'Messages are stored for dispute resolution',
}: DashboardInboxProps) {
  const pathname = usePathname()
  const { user, isAuthenticated, isInitializing: authInitializing } = useAuth()
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [messageText, setMessageText] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [loadingPeers, setLoadingPeers] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peerNameFallback, setPeerNameFallback] = useState<string | null>(null)

  const loadPeers = useCallback(async () => {
    if (!isAuthenticated) {
      setConversations([])
      setLoadingPeers(false)
      return
    }
    setLoadingPeers(true)
    setError(null)
    try {
      const res = await apiFetch<{ conversations: Conversation[] }>('/messages/peers')
      setConversations(res.conversations)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations')
    } finally {
      setLoadingPeers(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadPeers()
  }, [loadPeers])

  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated) return
    const params = new URLSearchParams(window.location.search)
    const peer = params.get('peer')
    if (peer) {
      setSelectedChat(peer)
      window.history.replaceState({}, '', pathname || window.location.pathname)
    }
  }, [isAuthenticated, pathname])

  const loadThread = useCallback(
    async (peerId: string) => {
      if (!isAuthenticated) return
      setLoadingThread(true)
      try {
        const res = await apiFetch<{ messages: Msg[] }>(`/messages/thread/${encodeURIComponent(peerId)}`)
        setMessages(res.messages)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load messages')
      } finally {
        setLoadingThread(false)
      }
    },
    [isAuthenticated]
  )

  useEffect(() => {
    if (selectedChat) void loadThread(selectedChat)
  }, [selectedChat, loadThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedChat, loadingThread])

  useEffect(() => {
    if (!selectedChat || !isAuthenticated) {
      setPeerNameFallback(null)
      return
    }
    const fromList = conversations.find((c) => c.peerId === selectedChat)?.peerName
    if (fromList) {
      setPeerNameFallback(fromList)
      return
    }
    let cancelled = false
    void apiFetch<{ user: { name: string } }>(`/users/public/${encodeURIComponent(selectedChat)}`)
      .then((r) => {
        if (!cancelled) setPeerNameFallback(r.user.name)
      })
      .catch(() => {
        if (!cancelled) setPeerNameFallback('User')
      })
    return () => {
      cancelled = true
    }
  }, [selectedChat, conversations, isAuthenticated])

  const handleSendMessage = async () => {
    if (!selectedChat || !user) return
    const text = messageText.trim()
    if (!text && !pendingFile) return
    try {
      await sendChatMessage(selectedChat, messageText, pendingFile)
      setMessageText('')
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadThread(selectedChat)
      await loadPeers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    }
  }

  const headerName =
    (selectedChat && conversations.find((c) => c.peerId === selectedChat)?.peerName) || peerNameFallback || 'Conversation'

  if (authInitializing) return null

  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        <p className="text-muted-foreground">Please log in to use messaging.</p>
      </div>
    )
  }

  const canSend = Boolean(selectedChat && (messageText.trim() || pendingFile))

  const scrollAreaClass =
    'overflow-y-auto overflow-x-hidden min-h-0 overscroll-contain scroll-smooth [scrollbar-gutter:stable] ' +
    '[scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent] ' +
    '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent ' +
    '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40'

  return (
    <div className="p-4 md:p-6 flex flex-col min-h-[420px] h-[calc(100dvh-7rem)] md:h-[calc(100dvh-8rem)]">
      <h1 className="text-3xl font-bold mb-4 shrink-0">{title}</h1>
      <p className="text-xs text-muted-foreground mb-4 shrink-0">Attachments up to 25 MB (documents, images, zip, video).</p>
      {error && <p className="text-sm text-destructive mb-4 shrink-0">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 min-w-0">
        <div className="lg:col-span-1 border border-border rounded-lg bg-card overflow-hidden flex flex-col min-h-0 max-h-[min(42vh,360px)] lg:max-h-none lg:h-full">
          <div className="p-4 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9" readOnly aria-readonly />
            </div>
          </div>

          <div className={`flex-1 min-h-0 ${scrollAreaClass}`}>
            {loadingPeers ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : conversations.length === 0 && !selectedChat ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {emptyHint}
              </div>
            ) : (
              <>
                {selectedChat && !conversations.some((c) => c.peerId === selectedChat) && (
                  <button
                    type="button"
                    onClick={() => setSelectedChat(selectedChat)}
                    className="w-full p-4 border-b border-border text-left bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary">
                        {(peerNameFallback || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{peerNameFallback || 'Loading…'}</p>
                        <p className="text-xs text-muted-foreground">New conversation</p>
                      </div>
                    </div>
                  </button>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.peerId}
                    type="button"
                    onClick={() => setSelectedChat(conv.peerId)}
                    className={`w-full p-4 border-b border-border text-left hover:bg-secondary transition-colors ${
                      selectedChat === conv.peerId ? 'bg-secondary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary">
                        {conv.peerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.peerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {selectedChat ? (
          <div className="lg:col-span-2 border border-border rounded-lg bg-card overflow-hidden flex flex-col min-h-0 max-h-[min(52vh,480px)] lg:max-h-none lg:h-full">
            <div className="p-4 border-b border-border bg-secondary shrink-0 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{headerName}</h3>
                <p className="text-xs text-muted-foreground truncate">{chatHeaderNote}</p>
              </div>
              {selectedChat && (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={`/profile/${encodeURIComponent(selectedChat)}`}>
                    <User className="w-4 h-4" /> View profile
                  </Link>
                </Button>
              )}
            </div>

            <div className={`flex-1 min-h-0 p-4 space-y-4 ${scrollAreaClass}`}>
              {loadingThread ? (
                <p className="text-center text-muted-foreground text-sm">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm pt-4">
                  Send a message or attach a file below.
                </p>
              ) : (
                messages.map((msg) => {
                  const mine = msg.senderId === user?.id
                  const showText = Boolean(msg.body?.trim())
                  const showFile = Boolean(msg.attachmentStoragePath)
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[min(100%,24rem)] px-4 py-2 rounded-lg space-y-2 ${
                          mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {showText ? <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p> : null}
                        {showFile ? (
                          <MessageAttachmentPreview
                            messageId={msg.id}
                            filename={msg.attachmentOriginalName}
                            mine={mine}
                          />
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} aria-hidden className="h-px shrink-0" />
            </div>

            <div className="p-4 border-t border-border space-y-2 shrink-0 bg-card">
              {pendingFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{pendingFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => {
                      setPendingFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    aria-label="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".zip,.rar,.7z,.tar,.gz,.pdf,.mp4,.webm,.mkv,.mov,.avi,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setPendingFile(f ?? null)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSendMessage()
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  size="icon"
                  disabled={!canSend}
                  className="bg-primary hover:bg-primary/90 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 border border-border rounded-lg bg-card flex items-center justify-center min-h-[200px] lg:min-h-0 lg:h-full">
            <p className="text-muted-foreground">{selectConversationHint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
