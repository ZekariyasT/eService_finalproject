'use client'

import { useEffect, useState } from 'react'
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadMessageAttachment, fetchMessageAttachmentBlob } from '@/lib/api'

function classifyKind(mime: string, fileName: string | null): 'image' | 'video' | 'pdf' | 'audio' | 'other' {
  const m = mime.toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (m === 'application/pdf' || m.includes('pdf')) return 'pdf'
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  return 'other'
}

type Props = {
  messageId: string
  filename: string | null
  mine: boolean
}

export function MessageAttachmentPreview({ messageId, filename, mine }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [kind, setKind] = useState<'image' | 'video' | 'pdf' | 'audio' | 'other'>('other')

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    ;(async () => {
      try {
        const blob = await fetchMessageAttachmentBlob(messageId)
        if (cancelled) return
        const mime = blob.type || ''
        url = URL.createObjectURL(blob)
        setObjectUrl(url)
        setKind(classifyKind(mime, filename))
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [messageId, filename])

  const label = filename || 'Attachment'
  const surface = mine ? 'bg-white/95 text-foreground border border-white/20' : 'bg-muted/80 text-foreground border border-border'
  const controlsWrap = `rounded-lg overflow-hidden ${surface}`

  if (status === 'loading') {
    return (
      <div className={`flex items-center gap-2 py-2 px-3 text-sm ${mine ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Loading…</span>
      </div>
    )
  }

  if (status === 'error' || !objectUrl) {
    return (
      <button
        type="button"
        onClick={() => void downloadMessageAttachment(messageId, filename)}
        className={`inline-flex items-center gap-1.5 text-sm underline underline-offset-2 ${
          mine ? 'text-primary-foreground/95' : 'text-primary'
        }`}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    )
  }

  const actions = (
    <div className={`flex flex-wrap items-center gap-1 mt-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => window.open(objectUrl, '_blank', 'noopener,noreferrer')}
      >
        <ExternalLink className="w-3.5 h-3.5 mr-1" />
        Open
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => void downloadMessageAttachment(messageId, filename)}
      >
        <Download className="w-3.5 h-3.5 mr-1" />
        Save
      </Button>
    </div>
  )

  if (kind === 'image') {
    return (
      <div className="space-y-1 max-w-[min(100vw-3rem,280px)]">
        <img src={objectUrl} alt="" className="rounded-lg max-h-72 w-full object-contain bg-black/5" />
        <p className={`text-xs truncate ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</p>
        {actions}
      </div>
    )
  }

  if (kind === 'video') {
    return (
      <div className="space-y-1 max-w-[min(100vw-3rem,320px)]">
        <div className={controlsWrap}>
          <video src={objectUrl} controls className="max-h-72 w-full bg-black" preload="metadata" />
        </div>
        <p className={`text-xs truncate ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</p>
        {actions}
      </div>
    )
  }

  if (kind === 'audio') {
    return (
      <div className="space-y-1 max-w-xs">
        <div className={`${controlsWrap} px-2 py-2`}>
          <audio src={objectUrl} controls className="w-full h-9" preload="metadata" />
        </div>
        <p className={`text-xs truncate ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</p>
        {actions}
      </div>
    )
  }

  if (kind === 'pdf') {
    return (
      <div className="space-y-1 w-full max-w-[min(100vw-3rem,340px)]">
        <div className={`${controlsWrap} h-[min(55vh,380px)]`}>
          <iframe title={label} src={objectUrl} className="w-full h-full min-h-[240px] bg-white" />
        </div>
        <p className={`text-xs truncate ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</p>
        {actions}
      </div>
    )
  }

  return (
    <div className={`space-y-2 max-w-[min(100vw-3rem,280px)] py-2 px-3 rounded-lg ${surface}`}>
      <div className="flex items-start gap-2">
        <FileText className="w-8 h-8 shrink-0 opacity-80" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{label}</p>
          <p className="text-xs opacity-70">Preview not available — open or save the file.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => window.open(objectUrl, '_blank', 'noopener,noreferrer')}>
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          Open
        </Button>
        <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => void downloadMessageAttachment(messageId, filename)}>
          <Download className="w-3.5 h-3.5 mr-1" />
          Save
        </Button>
      </div>
    </div>
  )
}
