import React, { Component } from 'react'
import { P2PContext } from '@/lib/P2PContext'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faCopy, faWifi, faWifi as faWifiSlash } from '@fortawesome/free-solid-svg-icons'
import { copyToClipboard } from '@/lib/helpers'
import { toast } from 'sonner'
import { getRoomKey, buildShareUrl } from '@/lib/crypto'

interface ConnectionInfoProps {
  p2p: ReturnType<typeof useP2P>
}

class ConnectionInfoClass extends Component<ConnectionInfoProps> {
  private get p2p() { return this.componentProps.p2p }
  private get currentRoom() { return this.p2p.currentRoom }
  private get peers() { return this.p2p.peers }
  private get isSignalingConnected() { return this.p2p.isSignalingConnected }

  handleCopyCode = async () => {
    const currentRoom = this.currentRoom
    if (!currentRoom) return
    const key = await getRoomKey(currentRoom.id)
    if (key) {
      copyToClipboard(buildShareUrl(currentRoom.id, key))
      toast.success('Encrypted invite link copied!')
    } else {
      copyToClipboard(currentRoom.id)
      toast.success('Room code copied!')
    }
  }

  render() {
    const currentRoom = this.currentRoom
    const peers = this.peers
    const isSignalingConnected = this.isSignalingConnected

    if (!currentRoom) return null

    const connectedPeers = peers.filter(p => p.connected).length

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
              onClick={this.handleCopyCode}
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
}

export class ConnectionInfo extends Component {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <ConnectionInfoClass p2p={this.context as ReturnType<typeof useP2P>} />
  }
}
