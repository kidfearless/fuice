import { Channel } from '@/lib/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHashtag } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface TextChannelListProps {
  channels: Channel[]
  currentChannelId: string | undefined
  onSelect: (channelId: string) => void
}

export function TextChannelList({ channels, currentChannelId, onSelect }: TextChannelListProps) {
  return (
    <div>
      <div className="px-2 mb-1">
        <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide">
          Text Channels
        </span>
      </div>
      <div className="space-y-0.5">
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => onSelect(channel.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[15px] font-medium transition-colors",
              currentChannelId === channel.id
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <FontAwesomeIcon icon={faHashtag} className="text-[15px]" />
            <span className="truncate">{channel.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
