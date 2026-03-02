import React, { Component, createRef, ChangeEvent, KeyboardEvent } from 'react'
import { P2PContext } from '@/lib/P2PContext'
import type { P2PContextType } from '@/lib/P2PContextTypes'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faPaperclip } from '@fortawesome/free-solid-svg-icons'
import { toast } from 'sonner'
import { parseGifCommand, searchGif } from '@/lib/gif'

interface WithP2PProps {
  p2p: P2PContextType
}

interface SlashCommand {
  command: '/gif' | '/giphy' | '/tenor'
  description: string
  args: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/gif',
    args: '[search] (optional)',
    description: 'Search GIFs across providers (or send trending if empty).',
  },
  {
    command: '/giphy',
    args: '[search] (optional)',
    description: 'Search only Giphy (or send trending if empty).',
  },
  {
    command: '/tenor',
    args: '[search] (optional)',
    description: 'Search only Tenor (or send featured if empty).',
  },
]

interface MessageInputState {
  message: string
  isSending: boolean
  selectedCommandIndex: number
}

class MessageInputBase extends Component<WithP2PProps, MessageInputState> {
  state: MessageInputState = {
    message: '',
    isSending: false,
    selectedCommandIndex: 0,
  }

  private fileInputRef = createRef<HTMLInputElement>()
  private messageInputRef = createRef<HTMLTextAreaElement>()
  private get p2p() { return this.componentProps.p2p }
  private get message() { return this.state.message }
  private set message(message: string) { this.setState({ message }) }
  private get isSending() { return this.state.isSending }
  private set isSending(isSending: boolean) { this.setState({ isSending }) }
  private get selectedCommandIndex() { return this.state.selectedCommandIndex }
  private set selectedCommandIndex(selectedCommandIndex: number) { this.setState({ selectedCommandIndex }) }

  private getSlashQuery = () => {
    const message = this.message
    const trimmedStart = message.trimStart()
    if (!trimmedStart.startsWith('/')) return null
    const body = trimmedStart.slice(1)
    if (body.includes(' ')) return null
    return body.toLowerCase()
  }

  private getVisibleCommands = () => {
    const slashQuery = this.getSlashQuery()
    if (slashQuery === null) return []
    if (!slashQuery) return SLASH_COMMANDS
    return SLASH_COMMANDS.filter((item) => item.command.slice(1).startsWith(slashQuery))
  }

  private applyCommand = (item: SlashCommand) => {
    this.message = `${item.command} `
    this.selectedCommandIndex = 0
  }

  private moveSelection = (direction: 1 | -1) => {
    const visibleCommands = this.getVisibleCommands()
    if (!visibleCommands.length) return
    const next = this.selectedCommandIndex + direction
    if (next < 0) this.selectedCommandIndex = visibleCommands.length - 1
    else if (next >= visibleCommands.length) this.selectedCommandIndex = 0
    else this.selectedCommandIndex = next
  }

  private handleSend = async () => {
    const message = this.message
    const isSending = this.isSending
    const sendMessage = this.p2p.sendMessage
    const sendGifMessage = this.p2p.sendGifMessage
    const currentChannel = this.p2p.currentChannel
    if (!message.trim() || currentChannel?.type !== 'text' || isSending) return
    
    const gifCmd = parseGifCommand(message)
    if (gifCmd) {
      this.isSending = true
      try {
        const result = await searchGif(gifCmd.query, gifCmd.source)
        if (result) {
          await sendGifMessage(result.url, gifCmd.query)
          this.message = ''
        } else {
          toast.error('No GIF found', { description: `Try a different search term` })
        }
      } catch {
        toast.error('Failed to search for GIF')
      } finally {
        this.isSending = false
      }
      return
    }
    
    await sendMessage(message.trim())
    this.message = ''
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const visibleCommands = this.getVisibleCommands()
    const isCommandMenuOpen = visibleCommands.length > 0

    if (isCommandMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.moveSelection(1)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.moveSelection(-1)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = visibleCommands[this.selectedCommandIndex] ?? visibleCommands[0]
        if (selected) this.applyCommand(selected)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.handleSend()
    }
  }

  private updateTextareaHeight = () => {
    const textarea = document.getElementById('message-input') as HTMLTextAreaElement | null
    if (!textarea) return

    textarea.style.height = 'auto'

    const style = window.getComputedStyle(textarea)
    const lineHeight = Number.parseFloat(style.lineHeight) || 20
    const paddingTop = Number.parseFloat(style.paddingTop) || 0
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0
    const maxHeight = lineHeight * 20 + paddingTop + paddingBottom + borderTop + borderBottom

    const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }

  componentDidMount() {
    this.updateTextareaHeight()
  }

  componentDidUpdate(_prevProps: WithP2PProps, prevState: MessageInputState) {
    if (prevState.message !== this.message) {
      this.updateTextareaHeight()
    }
  }

  private handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const sendFile = this.p2p.sendFile
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Maximum file size is 100MB'
      })
      return
    }

    try {
      await sendFile(file)
      toast.success('File sent', {
        description: `${file.name} has been sent to peers`
      })
    } catch {
      toast.error('Failed to send file', {
        description: 'Please try again'
      })
    }

    if (this.fileInputRef.current) {
      this.fileInputRef.current.value = ''
    }
  }

  render() {
    const currentChannel = this.p2p.currentChannel
    const message = this.message
    const isSending = this.isSending
    const selectedCommandIndex = this.selectedCommandIndex

    if (!currentChannel || currentChannel.type !== 'text') {
      return null
    }

    const visibleCommands = this.getVisibleCommands()
    const isCommandMenuOpen = visibleCommands.length > 0

    return (
      <div className="shrink-0 px-2 pb-3 sm:px-4 sm:pb-6">
        <div className="relative">
          {isCommandMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-40 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground">Commands</p>
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                {visibleCommands.map((item, index) => {
                  const isSelected = index === selectedCommandIndex
                  return (
                    <button
                      key={item.command}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => this.applyCommand(item)}
                      className={`w-full text-left rounded-md px-2.5 py-2 transition-colors ${
                        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm ${isSelected ? 'text-accent-foreground' : 'text-primary'}`}>
                          {item.command}
                        </span>
                        <span className={`text-xs ${isSelected ? 'text-accent-foreground/90' : 'text-muted-foreground'}`}>
                          {item.args}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-xs ${isSelected ? 'text-accent-foreground/90' : 'text-muted-foreground'}`}>
                        {item.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        <div className="flex items-end gap-1.5 rounded-lg bg-input px-2 py-1.5 sm:px-3">
          <input
            ref={this.fileInputRef}
            type="file"
            className="hidden"
            onChange={this.handleFileSelect}
            id="file-input"
          />
          <Button
            onClick={() => this.fileInputRef.current?.click()}
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            <FontAwesomeIcon icon={faPaperclip} className="text-[18px]" />
          </Button>
          <Textarea
            ref={this.messageInputRef}
            placeholder={`Message #${currentChannel.name}`}
            value={message}
            onChange={(e) => {
              this.message = e.target.value
              this.selectedCommandIndex = 0
            }}
            onKeyDown={this.handleKeyDown}
            rows={1}
            className="flex-1 min-h-8 resize-none border-0 bg-transparent shadow-none px-1.5 py-1 text-[15px] leading-[1.35] focus-visible:ring-0 focus-visible:border-0"
            id="message-input"
          />
          <Button 
            onClick={this.handleSend} 
            disabled={!message.trim() || isSending}
            size="icon"
            variant="ghost"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="text-[17px]" />
          </Button>
        </div>
        </div>
      </div>
    )
  }
}

export class MessageInput extends Component {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <MessageInputBase p2p={this.context as P2PContextType} />
  }
}
