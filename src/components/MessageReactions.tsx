import React, { Component, type ChangeEvent } from 'react'
import { P2PContext } from '@/lib/P2PContext'
import type { P2PContextType } from '@/lib/P2PContextTypes'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const COMMON_EMOJIS = [
  { emoji: '👍', name: 'thumbs up' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😂', name: 'joy' },
  { emoji: '😮', name: 'surprised' },
  { emoji: '😢', name: 'sad' },
  { emoji: '🔥', name: 'fire' },
  { emoji: '👏', name: 'clap' },
  { emoji: '🚀', name: 'rocket' },
]

type ReactionUsers = Record<string, { userId: string; username: string }[]>

interface MessageReactionsProps {
  messageId: string
  reactions?: ReactionUsers
  compact?: boolean
  p2p: P2PContextType
}

interface AddReactionButtonProps {
  messageId: string
  onOpenChange?: (open: boolean) => void
  p2p: P2PContextType
}

interface AddReactionButtonState {
  isOpen: boolean
  query: string
}

class MessageReactionsBase extends Component<MessageReactionsProps> {
  private get p2p() { return this.componentProps.p2p }
  private get messageId() { return this.componentProps.messageId }
  private get reactions() { return this.componentProps.reactions }
  private get compact() { return this.componentProps.compact }

  private handleReactionClick = (emoji: string) => {
    void this.p2p.toggleReaction(this.messageId, emoji)
  }

  render() {
    const reactions = this.reactions
    const compact = this.compact
    const p2p = this.p2p
    const currentUserId = p2p.currentUser?.id
    const reactionEntries = Object.entries(reactions ?? {}).filter(([, users]) => users.length > 0)

    if (reactionEntries.length === 0) {
      return null
    }

    return (
      <div className={cn('flex flex-wrap items-center gap-1 mt-1', compact && 'mt-0.5')}>
        {reactionEntries.map(([emoji, users]) => {
          const hasReacted = !!currentUserId && users.some((user) => user.userId === currentUserId)
          return (
            <Button
              key={emoji}
              variant="secondary"
              size="sm"
              className={cn(
                'h-6 px-1.5 py-0 text-xs gap-1 rounded-full',
                hasReacted && 'bg-primary/20 hover:bg-primary/30 border-primary/30 border'
              )}
              onClick={() => this.handleReactionClick(emoji)}
            >
              <span>{emoji}</span>
              <span className={cn('font-medium', hasReacted ? 'text-primary' : 'text-muted-foreground')}>
                {users.length}
              </span>
            </Button>
          )
        })}
      </div>
    )
  }
}

class AddReactionButtonBase extends Component<AddReactionButtonProps, AddReactionButtonState> {
  state: AddReactionButtonState = {
    isOpen: false,
    query: '',
  }

  private get p2p() { return this.componentProps.p2p }
  private get messageId() { return this.componentProps.messageId }
  private get onOpenChange() { return this.componentProps.onOpenChange }
  private get isOpen() { return this.state.isOpen }
  private set isOpen(isOpen: boolean) { this.setState({ isOpen }) }
  private get query() { return this.state.query }
  private set query(query: string) { this.setState({ query }) }

  private setOpen = (isOpen: boolean) => {
    this.isOpen = isOpen
    this.onOpenChange?.(isOpen)
  }

  private handleEmojiClick = (emoji: string) => {
    void this.p2p.toggleReaction(this.messageId, emoji)
    this.setOpen(false)
    this.query = ''
  }

  private handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.query = event.target.value
  }

  render() {
    const isOpen = this.isOpen
    const query = this.query
    const normalized = query.trim().toLowerCase()
    const filtered = normalized.length === 0
      ? COMMON_EMOJIS
      : COMMON_EMOJIS.filter((item) => item.name.includes(normalized) || item.emoji.includes(normalized))

    return (
      <Popover open={isOpen} onOpenChange={this.setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-md"
            aria-label="Add reaction"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-2" side="top" align="end">
          <Input
            value={query}
            onChange={this.handleQueryChange}
            placeholder="Search emojis"
            aria-label="Search emojis"
          />
          <div className="text-xs font-medium text-muted-foreground">Quick Picks</div>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-8 gap-1">
              {filtered.map((item) => (
                <Button
                  key={item.emoji}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-base"
                  onClick={() => this.handleEmojiClick(item.emoji)}
                >
                  {item.emoji}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No matching emojis</div>
          )}
        </PopoverContent>
      </Popover>
    )
  }
}

export class MessageReactions extends Component<Omit<MessageReactionsProps, 'p2p'>> {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <MessageReactionsBase {...this.componentProps} p2p={this.context as P2PContextType} />
  }
}

export class AddReactionButton extends Component<Omit<AddReactionButtonProps, 'p2p'>> {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <AddReactionButtonBase {...this.componentProps} p2p={this.context as P2PContextType} />
  }
}
