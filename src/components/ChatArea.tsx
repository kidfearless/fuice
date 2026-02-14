import { useP2P } from '@/lib/P2PContext'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { VoiceChannel } from './VoiceChannel'
import { HelpPanel } from './HelpPanel'
import { ConnectionInfo } from './ConnectionInfo'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHashtag, faVolumeHigh, faBars } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'

interface ChatAreaProps {
  onMenuToggle?: () => void
  isMobile?: boolean
}

export function ChatArea({ onMenuToggle, isMobile }: ChatAreaProps) {
  const { currentChannel, currentRoom, activeVoiceChannel } = useP2P()

  const mobileHeader = isMobile ? (
    <div className="flex h-12 items-center gap-2 border-b border-black/20 bg-background px-3">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={onMenuToggle}>
        <FontAwesomeIcon icon={faBars} className="text-[20px]" />
      </Button>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {currentChannel ? (
          <>
            {currentChannel.type === 'text' ? (
              <FontAwesomeIcon icon={faHashtag} className="text-muted-foreground text-[16px] shrink-0" />
            ) : (
              <FontAwesomeIcon icon={faVolumeHigh} className="text-muted-foreground text-[16px] shrink-0" />
            )}
            <span className="font-display font-semibold text-[15px] truncate">{currentChannel.name}</span>
          </>
        ) : (
          <span className="font-display font-semibold text-[15px] truncate">{currentRoom?.name ?? 'P2P Chat'}</span>
        )}
      </div>
    </div>
  ) : null

  if (!currentChannel) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {mobileHeader}
        <ConnectionInfo />
        <HelpPanel />
      </div>
    )
  }

  // Voice channel: show full-bleed voice view (no header when connected, Discord-style)
  if (currentChannel.type === 'voice') {
    const isInVoice = activeVoiceChannel === currentChannel.id
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#313338]">
        {isMobile ? mobileHeader : !isInVoice ? (
          <div className="flex h-12 items-center border-b border-black/20 bg-[#313338] px-4">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faVolumeHigh} className="text-muted-foreground text-[17px]" />
              <h2 className="font-display font-semibold text-[16px]">{currentChannel.name}</h2>
            </div>
          </div>
        ) : null}
        <VoiceChannel />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
      {isMobile ? mobileHeader : (
        <div className="flex h-12 items-center border-b border-black/20 bg-background px-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faHashtag} className="text-muted-foreground text-[17px]" />
            <h2 className="font-display font-semibold text-[16px]">{currentChannel.name}</h2>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <MessageList />
      </div>
      <MessageInput />
    </div>
  )
}
