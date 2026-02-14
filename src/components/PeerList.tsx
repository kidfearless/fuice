import { Peer } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PeerListProps {
  peers: Peer[]
}

export function PeerList({ peers }: PeerListProps) {
  return (
    <div>
      <div className="px-2 mb-1">
        <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide">
          Connected Peers
        </span>
      </div>
      <div className="space-y-0.5">
        {peers.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">
            No peers connected yet
          </p>
        ) : (
          peers.map(peer => (
            <div
              key={peer.id}
              className="flex items-center gap-2 px-2 py-1.5 text-[14px] text-muted-foreground hover:text-foreground"
            >
              <div className={cn(
                "w-2 h-2 rounded-full",
                peer.connected ? "bg-success" : "bg-muted"
              )} />
              <span className="truncate">{peer.username || 'Anonymous'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
