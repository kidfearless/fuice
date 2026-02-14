import { useP2P } from '@/lib/P2PContext'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faCopy, faWifi, faWifi as faWifiSlash } from '@fortawesome/free-solid-svg-icons'
import { copyToClipboard } from '@/lib/helpers'
import { toast } from 'sonner'
import { getRoomKey, buildShareUrl } from '@/lib/crypto'

export function ConnectionInfo() {
  const { currentRoom, peers, isSignalingConnected } = useP2P()

  if (!currentRoom) return null

  const connectedPeers = peers.filter(p => p.connected).length

  const handleCopyCode = async () => {
    const key = await getRoomKey(currentRoom.id)
    if (key) {
      copyToClipboard(buildShareUrl(currentRoom.id, key))
      toast.success('Encrypted invite link copied!')
    } else {
      copyToClipboard(currentRoom.id)
      toast.success('Room code copied!')
    }
  }

  return (
    <Alert className="m-3 sm:m-4 mb-0">
      <FontAwesomeIcon icon={faCircleInfo} className="text-accent text-[18px]" />
      <AlertTitle className="font-display flex items-center justify-between">
        <span>Room: {currentRoom.name}</span>
        <Badge 
          variant={isSignalingConnected ? "default" : "destructive"}
          className="flex items-center gap-1"
        >
          {isSignalingConnected ? (
            <>
              <FontAwesomeIcon icon={faWifi} className="text-[12px]" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faWifiSlash} className="text-[12px] opacity-50" />
              <span>Offline</span>
            </>
          )}
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">
          Connected peers: <strong>{connectedPeers}</strong>
        </p>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {currentRoom.id}
          </code>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyCode}
            className="h-6 px-2"
          >
            <FontAwesomeIcon icon={faCopy} className="text-[14px]" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isSignalingConnected 
            ? 'Share this code for others to join. All communication is peer-to-peer.'
            : 'Signaling server offline. Reconnecting...'
          }
        </p>
      </AlertDescription>
    </Alert>
  )
}
