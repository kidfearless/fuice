import { useP2P } from '@/lib/P2PContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightFromBracket, faArrowsRotate, faShareNodes, faSignal, faMicrophone, faMicrophoneSlash, faVolumeHigh, faVolumeXmark, faPhoneSlash } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/helpers'
import { clearCacheAndUpdate } from '@/lib/sw-register'
import { SettingsDialog } from '@/components/SettingsDialog'
import { ServerStatus } from '@/components/ServerStatus'
import { TextChannelList } from '@/components/TextChannelList'
import { VoiceChannelList } from '@/components/VoiceChannelList'
import { PeerList } from '@/components/PeerList'
import { getRoomKey, buildShareUrl } from '@/lib/crypto'

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const {
    currentRoom, currentUser, channels, currentChannel,
    selectChannel, activeVoiceChannel, peers, speakingUsers, leaveRoom,
    isMuted, isDeafened, toggleMute, toggleDeafen, leaveVoiceChannel,
  } = useP2P()

  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  const handleSelectChannel = (channelId: string) => {
    selectChannel(channelId)
    onNavigate?.()
  }

  const handleCopyRoomCode = async () => {
    if (currentRoom) {
      const key = await getRoomKey(currentRoom.id)
      const shareUrl = key
        ? buildShareUrl(currentRoom.id, key)
        : `${window.location.origin}${window.location.pathname}?join=${currentRoom.id}`
      copyToClipboard(shareUrl)
      toast.success('Share link copied to clipboard!')
    }
  }

  // Get the name of the active voice channel
  const activeVoiceChannelName = activeVoiceChannel
    ? channels.find(c => c.id === activeVoiceChannel)?.name || 'Voice Channel'
    : null

  return (
    <div className="w-60 h-full bg-sidebar border-r border-black/20 flex flex-col min-w-[240px]">
      <div className="h-12 px-4 border-b border-black/20 flex items-center justify-between">
        <h2 className="font-display font-semibold text-[15px] truncate">{currentRoom?.name}</h2>
        <ServerStatus />
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] border-sidebar-border bg-sidebar-accent/40">
            <div className="w-2 h-2 rounded-full bg-success mr-1.5 connection-pulse" />
            {peers.length} peer{peers.length !== 1 ? 's' : ''}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={handleCopyRoomCode}>
                <FontAwesomeIcon icon={faShareNodes} className="mr-1.5 text-[16px]" />
                {currentRoom?.id}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Copy shareable link</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 mt-1">
        <div className="py-3 space-y-4">
          <TextChannelList
            channels={textChannels}
            currentChannelId={currentChannel?.id}
            onSelect={handleSelectChannel}
          />
          <VoiceChannelList
            channels={voiceChannels}
            activeVoiceChannel={activeVoiceChannel}
            currentUser={currentUser}
            peers={peers}
            speakingUsers={speakingUsers}
            onSelect={handleSelectChannel}
          />
          <Separator />
          <PeerList peers={peers} />
        </div>
      </ScrollArea>

      {/* ── Discord-style Voice Connected Bar ─────────────────────── */}
      {activeVoiceChannel && (
        <div className="border-t border-black/20 bg-[#232428]">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faSignal} className="text-[14px] text-[#23a55a]" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#23a55a] leading-tight">Voice Connected</div>
                <div className="text-[11px] text-muted-foreground truncate">{activeVoiceChannelName}</div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={leaveVoiceChannel}
                    className="p-1.5 rounded hover:bg-[#3f4147] text-[#b5bac1] hover:text-[#ed4245] transition-colors"
                    title="Disconnect"
                  >
                    <FontAwesomeIcon icon={faPhoneSlash} className="text-[14px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Disconnect</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 pb-2">
            <button
              onClick={toggleMute}
              className={`flex-1 p-1.5 rounded flex items-center justify-center transition-colors ${
                isMuted
                  ? 'bg-[#ed4245]/20 text-[#ed4245] hover:bg-[#ed4245]/30'
                  : 'bg-[#3f4147] text-[#b5bac1] hover:bg-[#4e5058] hover:text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} className="text-[14px]" />
            </button>
            <button
              onClick={toggleDeafen}
              className={`flex-1 p-1.5 rounded flex items-center justify-center transition-colors ${
                isDeafened
                  ? 'bg-[#ed4245]/20 text-[#ed4245] hover:bg-[#ed4245]/30'
                  : 'bg-[#3f4147] text-[#b5bac1] hover:bg-[#4e5058] hover:text-white'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <FontAwesomeIcon icon={isDeafened ? faVolumeXmark : faVolumeHigh} className="text-[14px]" />
            </button>
          </div>
        </div>
      )}

      <div className="p-2 border-t border-black/20 space-y-1 bg-sidebar-accent/30">
        <SettingsDialog />
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          onClick={() => { toast.info('Clearing cache and updating...'); clearCacheAndUpdate() }}>
          <FontAwesomeIcon icon={faArrowsRotate} className="mr-2 text-[18px]" />
          Check for Updates
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-destructive/90 hover:text-destructive hover:bg-destructive/10"
          onClick={() => leaveRoom(true, true)}>
          <FontAwesomeIcon icon={faRightFromBracket} className="mr-2 text-[18px]" />
          Leave Room
        </Button>
      </div>
    </div>
  )
}
