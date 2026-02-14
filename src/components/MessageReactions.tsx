import { useMemo, useState } from 'react'
import { useP2P } from '@/lib/P2PContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀']
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '😢', '😭', '😤', '🤬', '😱', '😨', '😰', '😥', '🤗', '🤔', '🫡', '🤫', '🫢', '🤥', '😶', '🫠', '😐'] },
  { label: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🤙', '💪', '👋', '🫶', '❤️‍🔥'] },
  { label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💖', '💗', '💘', '💝'] },
  { label: 'Objects', emojis: ['🔥', '⭐', '🌟', '💯', '✅', '❌', '⚡', '💡', '🎯', '🏆', '🎉', '🎊', '🎁', '🚀', '👀', '💀', '☠️', '🤡', '💩', '👻'] },
]

const EMOJI_KEYWORDS: Record<string, string[]> = {
  '👍': ['thumbs', 'up', 'like', 'yes'],
  '❤️': ['heart', 'love'],
  '😂': ['laugh', 'lol', 'joy'],
  '😮': ['wow', 'surprised', 'shock'],
  '😢': ['sad', 'cry'],
  '🎉': ['party', 'celebrate'],
  '🔥': ['fire', 'lit', 'hot'],
  '👀': ['eyes', 'watch', 'look'],
  '🙏': ['pray', 'thanks'],
  '👏': ['clap', 'applause'],
  '💯': ['100', 'perfect'],
}

interface MessageReactionsProps {
  messageId: string
  reactions?: Record<string, { userId: string; username: string }[]>
  compact?: boolean
}

export function MessageReactions({ messageId, reactions, compact }: MessageReactionsProps) {
  const { toggleReaction, currentUser } = useP2P()

  if (!reactions || Object.keys(reactions).length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', compact ? 'mt-1' : 'mt-1.5')}>
      {Object.entries(reactions).map(([emoji, users]) => {
        const hasReacted = currentUser ? users.some(u => u.userId === currentUser.id) : false
        const names = users.map(u => u.username).join(', ')
        return (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void toggleReaction(messageId, emoji)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm leading-none transition-colors cursor-pointer select-none',
                  hasReacted
                    ? 'border-primary bg-primary/20 text-foreground'
                    : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="text-[16px] leading-none">{emoji}</span>
                <span className="text-sm font-semibold tabular-nums">{users.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-48">
              {names}
            </TooltipContent>
          </Tooltip>
        )
      })}
      <AddReactionButton messageId={messageId} />
    </div>
  )
}

interface AddReactionButtonProps {
  messageId: string
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function AddReactionButton({ messageId, className, onOpenChange }: AddReactionButtonProps) {
  const { toggleReaction } = useP2P()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EMOJI_CATEGORIES

    return EMOJI_CATEGORIES
      .map((category) => {
        const emojis = category.emojis.filter((emoji) => {
          if (emoji.includes(q)) return true
          const keywords = EMOJI_KEYWORDS[emoji] ?? []
          return keywords.some((keyword) => keyword.includes(q))
        })
        return { ...category, emojis }
      })
      .filter((category) => category.emojis.length > 0)
  }, [query])

  const handleSelect = (emoji: string) => {
    void toggleReaction(messageId, emoji)
    setQuery('')
    setOpen(false)
    onOpenChange?.(false)
  }

  const handlePopoverOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors cursor-pointer select-none',
            'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
            className
          )}
          aria-label="Add reaction"
        >
          <SmilePlusIcon />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[min(96vw,34rem)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 border-b border-border">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find the perfect reaction"
            className="h-10 text-base"
            aria-label="Search emojis"
          />
        </div>
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Quick Picks</p>
          <div className="grid grid-cols-8 gap-1">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="h-10 flex items-center justify-center rounded-md hover:bg-muted text-2xl cursor-pointer transition-colors"
            >
              {emoji}
            </button>
          ))}
          </div>
        </div>
        <div className="max-h-[22rem] overflow-y-auto px-3 py-3 space-y-3">
          {filteredCategories.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No matching emojis</p>
          )}
          {filteredCategories.map(cat => (
            <div key={cat.label}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{cat.label}</p>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                {cat.emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelect(emoji)}
                    className="h-10 flex items-center justify-center rounded-md hover:bg-muted text-2xl cursor-pointer transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SmilePlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
      <line x1="20" y1="2" x2="20" y2="8" />
      <line x1="17" y1="5" x2="23" y2="5" />
    </svg>
  )
}
