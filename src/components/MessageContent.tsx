import React, { Component } from 'react'
import { cn } from '@/lib/utils'
import { renderDiscordMarkdown } from '@/lib/discordMarkdown'

interface MessageContentProps {
  content: string
  className?: string
}

export class MessageContent extends Component<MessageContentProps> {
  private get content() { return this.componentProps.content }
  private get className() { return this.componentProps.className }

  render() {
    const html = renderDiscordMarkdown(this.content)
    return (
      <div
        className={cn("discord-markdown whitespace-pre-wrap break-words text-sm leading-relaxed", this.className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
}
