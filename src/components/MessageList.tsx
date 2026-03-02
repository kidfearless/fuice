import React, { Component, createRef, UIEvent } from 'react'
import { P2PContext } from '@/lib/P2PContext'
import type { P2PContextType } from '@/lib/P2PContextTypes'
import { getFileUrl } from '@/lib/db'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileMessage } from '@/components/FileMessage'
import { Button } from '@/components/ui/button'
import { MessageReactions, AddReactionButton } from '@/components/MessageReactions'
import { MessageContent } from '@/components/MessageContent'
import { formatTime } from '@/lib/helpers'

interface WithP2PProps {
  p2p: P2PContextType
}

interface MessageListState {
  openReactionMenuForMessageId: string | null
  fileUrlMap: Map<string, string>
}

class MessageListBase extends Component<WithP2PProps, MessageListState> {
  private bottomRef = createRef<HTMLDivElement>()
  private fileUrlMapRef = new Map<string, string>()
  private isLoadingOlderRef = false
  private hasMoreOlderRef = true
  private suppressAutoScrollRef = false
  private disposed = false
  private get p2p() { return this.componentProps.p2p }
  private get fileUrlMap() { return this.state.fileUrlMap }
  private set fileUrlMap(fileUrlMap: Map<string, string>) { this.setState({ fileUrlMap }) }
  private get openReactionMenuForMessageId() { return this.state.openReactionMenuForMessageId }
  private set openReactionMenuForMessageId(openReactionMenuForMessageId: string | null) { this.setState({ openReactionMenuForMessageId }) }

  state: MessageListState = {
    openReactionMenuForMessageId: null,
    fileUrlMap: new Map()
  }

  componentDidMount() {
    this.loadStoredFiles()
    if (!this.suppressAutoScrollRef) {
      this.bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  componentDidUpdate(prevProps: WithP2PProps, prevState: MessageListState) {
    if (prevState.fileUrlMap !== this.fileUrlMap) {
      this.fileUrlMapRef = this.fileUrlMap
    }

    if (prevProps.p2p.messages !== this.p2p.messages) {
      if (!this.suppressAutoScrollRef) {
        this.bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
      this.loadStoredFiles()
    }

    if (prevProps.p2p.currentChannel?.id !== this.p2p.currentChannel?.id) {
      this.hasMoreOlderRef = true
      this.isLoadingOlderRef = false
    }
  }

  componentWillUnmount() {
    this.disposed = true
    this.fileUrlMapRef.forEach((url) => URL.revokeObjectURL(url))
  }

  private loadStoredFiles = async () => {
    const messages = this.p2p.messages
    const fileUrlMap = this.fileUrlMap
    const newMap = new Map(fileUrlMap)
    let changed = false

    for (const message of messages) {
      if (message.storedFileId && !message.fileUrl && !newMap.has(message.storedFileId)) {
        try {
          const url = await getFileUrl(message.storedFileId)
          if (url) {
            newMap.set(message.storedFileId, url)
            changed = true
          }
        } catch (error) {
          console.error('Failed to load stored file:', error)
        }
      }
    }

    if (!this.disposed && changed) {
      this.fileUrlMap = newMap
    }
  }

  private handleScrollCapture = (event: UIEvent<HTMLDivElement>) => {
    const currentChannel = this.p2p.currentChannel
    const loadOlderMessages = this.p2p.loadOlderMessages
    if (currentChannel?.type !== 'text') return
    const target = event.target as HTMLElement
    if (target.dataset.slot !== 'scroll-area-viewport') return
    if (target.scrollTop > 80) return
    if (this.isLoadingOlderRef || !this.hasMoreOlderRef) return

    this.isLoadingOlderRef = true
    this.suppressAutoScrollRef = true
    const prevScrollHeight = target.scrollHeight

    void loadOlderMessages()
      .then((loadedCount) => {
        if (loadedCount === 0) {
          this.hasMoreOlderRef = false
        }
      })
      .catch((error) => {
        console.error('Failed to load older messages:', error)
      })
      .finally(() => {
        requestAnimationFrame(() => {
          const delta = target.scrollHeight - prevScrollHeight
          if (delta > 0) target.scrollTop += delta
          this.isLoadingOlderRef = false
          this.suppressAutoScrollRef = false
        })
      })
  }

  render() {
    const messages = this.p2p.messages
    const authorizePeerAccess = this.p2p.authorizePeerAccess
    const openReactionMenuForMessageId = this.openReactionMenuForMessageId
    const fileUrlMap = this.fileUrlMap

    if (messages.length === 0) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center space-y-2 max-w-sm">
            <p className="text-foreground font-medium">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to say something!
            </p>
          </div>
        </div>
      )
    }

    const orderedMessages = [...messages].sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
      return a.id.localeCompare(b.id)
    })

    return (
      <ScrollArea className="h-full min-h-0" onScrollCapture={this.handleScrollCapture}>
        <div className="py-4">
          {orderedMessages.map((message, index) => {
            const prevMessage = index > 0 ? orderedMessages[index - 1] : null
            const isSystemMessage = message.userId === 'system'
            const showHeader = !prevMessage || 
              prevMessage.userId !== message.userId ||
              message.timestamp - prevMessage.timestamp > 300000

            const hasFile = !!message.fileMetadata
            const hasGif = !!message.gifUrl
            const fileUrl = message.fileUrl || (message.storedFileId ? fileUrlMap.get(message.storedFileId) : undefined)
            const isAuthorizeAction = isSystemMessage && message.systemAction === 'authorize-room-key'
            const canAuthorize = isAuthorizeAction && !message.systemActionResolved && !!message.systemActionTargetPeerId
            const isResolvedAction = isAuthorizeAction && !!message.systemActionResolved

            if (isSystemMessage) {
              return (
                <div key={message.id} className="mt-1">
                  <div className="px-4 py-1.5 hover:bg-black/10 transition-colors">
                    <div className="flex items-start gap-2 text-foreground/90">
                      <span className="text-accent text-[15px] leading-6">↗</span>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[15px] leading-[1.375rem] break-words">
                          {message.content}
                          <span className="ml-1 text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                        </p>
                        {canAuthorize && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (!message.systemActionTargetPeerId) return
                              void authorizePeerAccess(message.id, message.systemActionTargetPeerId)
                            }}
                          >
                            Authorize {message.systemActionTargetUsername ?? 'User'}
                          </Button>
                        )}
                        {isResolvedAction && (
                          <p className="text-xs text-muted-foreground">
                            Authorized by {message.systemActionResolvedBy ?? 'a room member'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={message.id}
                className={`${showHeader ? 'mt-3' : 'mt-0'} group/msg relative`}
              >
                <div className="px-4 py-[2px] hover:bg-black/10 transition-colors">
                  {/* Hover action bar */}
                  <div
                    className={`absolute -top-3 right-4 z-10 bg-background border border-border rounded-md shadow-sm transition-opacity ${
                      openReactionMenuForMessageId === message.id
                        ? 'flex opacity-100 pointer-events-auto'
                        : 'flex opacity-0 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto'
                    }`}
                  >
                    <AddReactionButton
                      messageId={message.id}
                      onOpenChange={(open) => {
                        if (open) this.openReactionMenuForMessageId = message.id
                        else if (this.openReactionMenuForMessageId === message.id) this.openReactionMenuForMessageId = null
                      }}
                    />
                  </div>
                  {showHeader ? (
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 mt-0.5">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {message.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-display font-medium text-[15px]">
                            {message.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        {hasFile ? (
                          <div className="space-y-2">
                            {message.content && (
                              <MessageContent
                                content={message.content}
                                className="text-[15px] leading-[1.375rem] break-words text-foreground/95"
                              />
                            )}
                            <FileMessage 
                              metadata={message.fileMetadata!} 
                              fileUrl={fileUrl || message.fileUrl}
                            />
                          </div>
                        ) : hasGif ? (
                          <div className="space-y-1">
                            <img 
                              src={message.gifUrl} 
                              alt={message.content || 'GIF'} 
                              className="max-w-xs sm:max-w-sm rounded-lg"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <MessageContent
                            content={message.content}
                            className="text-[15px] leading-[1.375rem] break-words text-foreground/95"
                          />
                        )}
                        <MessageReactions messageId={message.id} reactions={message.reactions} />
                      </div>
                    </div>
                  ) : (
                    <div className="ml-[52px]">
                      {hasFile ? (
                        <div className="space-y-2">
                          {message.content && (
                            <MessageContent
                              content={message.content}
                              className="text-[15px] leading-[1.375rem] break-words text-foreground/95"
                            />
                          )}
                          <FileMessage 
                            metadata={message.fileMetadata!} 
                            fileUrl={fileUrl || message.fileUrl}
                          />
                        </div>
                      ) : hasGif ? (
                        <div className="space-y-1">
                          <img 
                            src={message.gifUrl} 
                            alt={message.content || 'GIF'} 
                            className="max-w-xs sm:max-w-sm rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <MessageContent
                          content={message.content}
                          className="text-[15px] leading-[1.375rem] break-words text-foreground/95"
                        />
                      )}
                      <MessageReactions messageId={message.id} reactions={message.reactions} compact />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={this.bottomRef} />
        </div>
      </ScrollArea>
    )
  }
}

export class MessageList extends Component {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <MessageListBase p2p={this.context as P2PContextType} />
  }
}
