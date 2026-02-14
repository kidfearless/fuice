import { Channel, Peer, User } from '@/lib/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faDesktop, faVideo } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface VoiceChannelListProps {
  channels: Channel[]
  activeVoiceChannel: string | null
  currentUser: User | null
  peers: Peer[]
  speakingUsers: Set<string>
  onSelect: (channelId: string) => void
}

export function VoiceChannelList({
  channels,
  activeVoiceChannel,
  currentUser,
  peers,
  speakingUsers,
  onSelect,
}: VoiceChannelListProps) {
  return (
    <div>
      <div className="px-2 mb-1">
        <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide">
          Voice Channels
        </span>
      </div>
      <div className="space-y-0.5">
        {channels.map(channel => {
          const usersInChannel = peers.filter(p => p.voiceChannelId === channel.id)
          const isCurrentUserInChannel = activeVoiceChannel === channel.id

          return (
            <div key={channel.id}>
              <button
                onClick={() => onSelect(channel.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[15px] font-medium transition-colors group",
                  isCurrentUserInChannel
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-[14px] shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>

              {(isCurrentUserInChannel || usersInChannel.length > 0) && (
                <div className="ml-2 mt-0.5 space-y-px">
                  {isCurrentUserInChannel && currentUser && (
                    <VoiceUser
                      name={currentUser.username}
                      isSpeaking={speakingUsers.has(currentUser.id)}
                      isSelf
                    />
                  )}
                  {usersInChannel.map(peer => (
                    <VoiceUser
                      key={peer.id}
                      name={peer.username}
                      isSpeaking={peer.isSpeaking ?? false}
                      isScreenSharing={peer.isScreenSharing}
                      isCameraOn={peer.isCameraOn}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VoiceUser({ name, isSpeaking, isSelf, isScreenSharing, isCameraOn }: {
  name: string
  isSpeaking: boolean
  isSelf?: boolean
  isScreenSharing?: boolean
  isCameraOn?: boolean
}) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-sidebar-accent/40 transition-colors">
      <div className="relative shrink-0">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white transition-shadow",
            isSpeaking && "ring-[2px] ring-[#23a55a]"
          )}
          style={{ backgroundColor: `hsl(${hue}, 50%, 45%)` }}
        >
          {initials}
        </div>
      </div>
      <span className="text-[13px] text-muted-foreground truncate flex-1">
        {name}
        {isSelf && <span className="text-[10px] ml-0.5 opacity-60">(you)</span>}
      </span>
      {/* Status icons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {isScreenSharing && (
          <FontAwesomeIcon icon={faDesktop} className="text-[10px] text-[#5865f2]" />
        )}
        {isCameraOn && (
          <FontAwesomeIcon icon={faVideo} className="text-[10px] text-[#5865f2]" />
        )}
      </div>
    </div>
  )
}
