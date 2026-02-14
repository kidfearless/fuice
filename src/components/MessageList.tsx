import { useEffect, useRef, useState, UIEvent } from 'react'
import { useP2P } from '@/lib/P2PContext'
import { getFileUrl } from '@/lib/db'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileMessage } from '@/components/FileMessage'
import { Button } from '@/components/ui/button'
import { MessageReactions, AddReactionButton } from '@/components/MessageReactions'
import { formatTime } from '@/lib/helpers'

export function MessageList() {
  const { messages, currentChannel, loadOlderMessages, authorizePeerAccess } = useP2P()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [openReactionMenuForMessageId, setOpenReactionMenuForMessageId] = useState<string | null>(null)
  const [fileUrlMap, setFileUrlMap] = useState<Map<string, string>>(new Map())
  const fileUrlMapRef = useRef<Map<string, string>>(new Map())
  const isLoadingOlderRef = useRef(false)
  const hasMoreOlderRef = useRef(true)
  const suppressAutoScrollRef = useRef(false)

  useEffect(() => {
    fileUrlMapRef.current = fileUrlMap
  }, [fileUrlMap])

  useEffect(() => {
    if (suppressAutoScrollRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    hasMoreOlderRef.current = true
    isLoadingOlderRef.current = false
  }, [currentChannel?.id])

  const handleScrollCapture = (event: UIEvent<HTMLDivElement>) => {
    if (currentChannel?.type !== 'text') return
    const target = event.target as HTMLElement
    if (target.dataset.slot !== 'scroll-area-viewport') return
    if (target.scrollTop > 80) return
    if (isLoadingOlderRef.current || !hasMoreOlderRef.current) return

    isLoadingOlderRef.current = true
    suppressAutoScrollRef.current = true
    const prevScrollHeight = target.scrollHeight

    void loadOlderMessages()
      .then((loadedCount) => {
        if (loadedCount === 0) {
          hasMoreOlderRef.current = false
        }
      })
      .catch((error) => {
        console.error('Failed to load older messages:', error)
      })
      .finally(() => {
        requestAnimationFrame(() => {
          const delta = target.scrollHeight - prevScrollHeight
          if (delta > 0) target.scrollTop += delta
          isLoadingOlderRef.current = false
          suppressAutoScrollRef.current = false
        })
      })
  }

  // Load stored file URLs
  useEffect(() => {
    let disposed = false
    const loadStoredFiles = async () => {
      const newMap = new Map(fileUrlMap)
      for (const message of messages) {
        if (message.storedFileId && !message.fileUrl && !newMap.has(message.storedFileId)) {
          try {
            const url = await getFileUrl(message.storedFileId)
            if (url) {
              newMap.set(message.storedFileId, url)
            }
          } catch (error) {
            console.error('Failed to load stored file:', error)
          }
        }
      }
      if (!disposed && newMap.size > fileUrlMap.size) setFileUrlMap(newMap)
    }
    
    loadStoredFiles()

    return () => {
      disposed = true
    }
  }, [messages, fileUrlMap])

  useEffect(() => {
    return () => {
      fileUrlMapRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

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
    <ScrollArea className="h-full min-h-0" onScrollCapture={handleScrollCapture}>
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
                      setOpenReactionMenuForMessageId((previousId) => {
                        if (open) return message.id
                        return previousId === message.id ? null : previousId
                      })
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
                            <p className="text-[15px] leading-[1.375rem] break-words text-foreground/95">
                              {message.content}
                            </p>
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
                        <p className="text-[15px] leading-[1.375rem] break-words text-foreground/95">
                          {message.content}
                        </p>
                      )}
                      <MessageReactions messageId={message.id} reactions={message.reactions} />
                    </div>
                  </div>
                ) : (
                  <div className="ml-[52px]">
                    {hasFile ? (
                      <div className="space-y-2">
                        {message.content && (
                          <p className="text-[15px] leading-[1.375rem] break-words text-foreground/95">
                            {message.content}
                          </p>
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
                      <p className="text-[15px] leading-[1.375rem] break-words text-foreground/95">
                        {message.content}
                      </p>
                    )}
                    <MessageReactions messageId={message.id} reactions={message.reactions} compact />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
