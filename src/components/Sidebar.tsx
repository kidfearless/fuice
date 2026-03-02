import React, { Component } from 'react'
import { P2PContextType } from '@/lib/P2PContextTypes'
import { P2PContext } from '@/lib/P2PContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightFromBracket, faArrowsRotate, faShareNodes, faSignal, faMicrophone, faMicrophoneSlash, faVolumeHigh, faVolumeXmark, faPhoneSlash } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/helpers'
import { clearCacheAndUpdate } from '@/lib/sw-register'
import { SettingsDialog } from '@/components/SettingsDialog'
import { ServerStatus } from '@/components/ServerStatus'
import { TextChannelList } from '@/components/TextChannelList'
import { VoiceChannelList } from '@/components/VoiceChannelList'
import { PeerList } from '@/components/PeerList'
import { getRoomKey, buildShareUrl } from '@/lib/crypto'
import { cn } from '@/lib/utils'

export class Sidebar extends Component<{ onNavigate?: () => void }> {
  static contextType = P2PContext
  private get onNavigate() { return this.componentProps.onNavigate }

  handleSelectChannel = (channelId: string) => {
    const context = this.context as P2PContextType
    const selectChannel = context.selectChannel
    const onNavigate = this.onNavigate
    selectChannel(channelId)
    onNavigate?.()
  }

  handleCopyRoomCode = async () => {
    const context = this.context as P2PContextType
    const currentRoom = context.currentRoom
    if (currentRoom) {
      const key = await getRoomKey(currentRoom.id)
      const shareUrl = key
        ? buildShareUrl(currentRoom.id, key)
        : `${window.location.origin}${window.location.pathname}?join=${currentRoom.id}`
      copyToClipboard(shareUrl)
      toast.success('Share link copied to clipboard!')
    }
  }

  render() {
    const context = this.context as P2PContextType
    const currentRoom = context.currentRoom
    const currentUser = context.currentUser
    const channels = context.channels
    const currentChannel = context.currentChannel
    const activeVoiceChannel = context.activeVoiceChannel
    const peers = context.peers
    const speakingUsers = context.speakingUsers
    const leaveRoom = context.leaveRoom
    const isMuted = context.isMuted
    const isDeafened = context.isDeafened
    const toggleMute = context.toggleMute
    const toggleDeafen = context.toggleDeafen
    const leaveVoiceChannel = context.leaveVoiceChannel

    const textChannels = channels.filter(c => c.type === 'text')
    const voiceChannels = channels.filter(c => c.type === 'voice')

    // Get the name of the active voice channel
    const activeVoiceChannelName = activeVoiceChannel
      ? channels.find(c => c.id === activeVoiceChannel)?.name || 'Voice Channel'
      : null

    return (
      <TooltipProvider delayDuration={200}>
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
                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={this.handleCopyRoomCode}>
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
              onSelect={this.handleSelectChannel}
            />
            <VoiceChannelList
              channels={voiceChannels}
              activeVoiceChannel={activeVoiceChannel}
              currentUser={currentUser}
              peers={peers}
              speakingUsers={speakingUsers}
              onSelect={this.handleSelectChannel}
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
                  <div className="text-[12px] font-bold text-[#23a55a] leading-tight">Voice Connected</div>
                  <div className="text-[12px] text-muted-foreground truncate leading-tight">
                    {activeVoiceChannelName}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => leaveVoiceChannel()}
                >
                  <FontAwesomeIcon icon={faPhoneSlash} className="text-[16px]" />
                </Button>
              </div>

              <div className="flex items-center justify-between gap-1 mt-2">
                <div className="flex items-center gap-1 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={isMuted ? 'Unmute' : 'Mute'}
                    className={cn(
                      "h-8 flex-1 text-muted-foreground hover:bg-white/10",
                      isMuted && "text-destructive"
                    )}
                    onClick={() => toggleMute()}
                  >
                    <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} className="text-[16px]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 flex-1 text-muted-foreground hover:bg-white/10",
                      isDeafened && "text-destructive"
                    )}
                    onClick={() => toggleDeafen()}
                  >
                    <FontAwesomeIcon icon={isDeafened ? faVolumeXmark : faVolumeHigh} className="text-[16px]" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-sidebar-user p-2 border-t border-black/20">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 px-2">
              <div className="text-sm font-semibold truncate leading-tight">{currentUser?.username}</div>
              <div className="text-[11px] text-muted-foreground truncate leading-tight">Online</div>
            </div>
            <div className="flex items-center gap-0.5">
              <SettingsDialog />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => clearCacheAndUpdate()}>
                    <FontAwesomeIcon icon={faArrowsRotate} className="text-[15px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Update App</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => leaveRoom(true, true)}>
                    <FontAwesomeIcon icon={faRightFromBracket} className="text-[15px]" />
                    <span className="sr-only">Leave Room</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Leave Room</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      </TooltipProvider>
    )
  }
}
