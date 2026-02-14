import { useMemo, useRef, useState } from 'react'
import { useP2P } from '@/lib/P2PContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faPaperclip } from '@fortawesome/free-solid-svg-icons'
import { toast } from 'sonner'
import { parseGifCommand, searchGif } from '@/lib/gif'

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

export function MessageInput() {
  const { sendMessage, sendGifMessage, sendFile, currentChannel } = useP2P()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const slashQuery = useMemo(() => {
    const trimmedStart = message.trimStart()
    if (!trimmedStart.startsWith('/')) return null
    const body = trimmedStart.slice(1)
    if (body.includes(' ')) return null
    return body.toLowerCase()
  }, [message])

  const visibleCommands = useMemo(() => {
    if (slashQuery === null) return []
    if (!slashQuery) return SLASH_COMMANDS
    return SLASH_COMMANDS.filter((item) => item.command.slice(1).startsWith(slashQuery))
  }, [slashQuery])

  const isCommandMenuOpen = visibleCommands.length > 0

  const applyCommand = (item: SlashCommand) => {
    setMessage(`${item.command} `)
    setSelectedCommandIndex(0)
  }

  const moveSelection = (direction: 1 | -1) => {
    if (!visibleCommands.length) return
    setSelectedCommandIndex((previous) => {
      const next = previous + direction
      if (next < 0) return visibleCommands.length - 1
      if (next >= visibleCommands.length) return 0
      return next
    })
  }

  const handleSend = async () => {
    if (!message.trim() || currentChannel?.type !== 'text' || isSending) return
    
    const gifCmd = parseGifCommand(message)
    if (gifCmd) {
      setIsSending(true)
      try {
        const result = await searchGif(gifCmd.query, gifCmd.source)
        if (result) {
          await sendGifMessage(result.url, gifCmd.query)
          setMessage('')
        } else {
          toast.error('No GIF found', { description: `Try a different search term` })
        }
      } catch {
        toast.error('Failed to search for GIF')
      } finally {
        setIsSending(false)
      }
      return
    }
    
    await sendMessage(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isCommandMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveSelection(1)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveSelection(-1)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = visibleCommands[selectedCommandIndex] ?? visibleCommands[0]
        if (selected) applyCommand(selected)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!currentChannel || currentChannel.type !== 'text') {
    return null
  }

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
                    onClick={() => applyCommand(item)}
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
      <div className="flex items-center gap-1.5 rounded-lg bg-input px-2 sm:px-3 h-11">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          id="file-input"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          <FontAwesomeIcon icon={faPaperclip} className="text-[18px]" />
        </Button>
        <Input
          placeholder={`Message #${currentChannel.name}`}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            setSelectedCommandIndex(0)
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 h-10 border-0 bg-transparent shadow-none px-1.5 text-[15px] focus-visible:ring-0 focus-visible:border-0"
          id="message-input"
        />
        <Button 
          onClick={handleSend} 
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
