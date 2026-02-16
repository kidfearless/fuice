import { useMemo } from 'react'
import { renderDiscordMarkdown } from '@/lib/discordMarkdown'
import { cn } from '@/lib/utils'

interface MessageContentProps {
  content: string
  className?: string
}

export function MessageContent({ content, className }: MessageContentProps) {
  const html = useMemo(() => renderDiscordMarkdown(content), [content])

  return (
    <div
      className={cn('discord-markdown', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
