import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers } from '@fortawesome/free-solid-svg-icons'
import { getRoom } from '@/lib/db'
import { Room } from '@/lib/types'

interface JoinRoomDialogProps {
  roomCode: string
  onAccept: () => void
  onDecline: () => void
  isLoading?: boolean
}

export function JoinRoomDialog({ roomCode, onAccept, onDecline, isLoading = false }: JoinRoomDialogProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [peerCount, setPeerCount] = useState(0)
  const [isLoadingRoom, setIsLoadingRoom] = useState(true)

  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        const roomData = await getRoom(roomCode)
        if (roomData) {
          setRoom(roomData)
          // Note: Peer count would be 0 initially since they're not connected yet
          // We could estimate this from the database, but for now we show potential users
          setPeerCount(0)
        }
      } catch (error) {
        console.error('Failed to fetch room info:', error)
      } finally {
        setIsLoadingRoom(false)
      }
    }

    fetchRoomInfo()
  }, [roomCode])

  const roomName = room?.name || `Room ${roomCode}`
  const displayPeerCount = peerCount > 0 ? peerCount : 1 // Show at least the room creator

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="text-accent text-[32px]" />
            </div>
          </div>
          <CardTitle className="text-2xl">You've been invited!</CardTitle>
          <CardDescription className="mt-4">
            Do you want to join this room?
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-sidebar/50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
                Room Name
              </p>
              <p className="text-lg font-semibold">{isLoadingRoom ? 'Loading...' : roomName}</p>
            </div>
            <div className="border-t border-sidebar-border pt-3">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
                Members
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <p className="text-sm">
                  {isLoadingRoom ? 'Loading...' : `${displayPeerCount} ${displayPeerCount === 1 ? 'member' : 'members'} online`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              Room code: <span className="font-mono font-semibold text-foreground">{roomCode}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onDecline}
              disabled={isLoading || isLoadingRoom}
              className="flex-1"
            >
              Decline
            </Button>
            <Button
              onClick={onAccept}
              disabled={isLoading || isLoadingRoom}
              className="flex-1"
            >
              {isLoading ? 'Joining...' : 'Accept & Join'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can always leave the room later
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
