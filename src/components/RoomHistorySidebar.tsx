import { useEffect, useState } from 'react'
import { getAllRoomHistory, deleteRoomHistory, updateRoomOrder } from '@/lib/db'
import { RoomHistory } from '@/lib/types'
import { useP2P } from '@/lib/P2PContext'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

export function RoomHistorySidebar({ onAddRoom }: { onAddRoom?: () => void }) {
  const [roomHistory, setRoomHistory] = useState<RoomHistory[]>([])
  const [draggedRoom, setDraggedRoom] = useState<string | null>(null)
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null)
  const { currentRoom, joinRoom, leaveRoom } = useP2P()

  useEffect(() => {
    loadRoomHistory()
  }, [currentRoom])

  const loadRoomHistory = async () => {
    const history = await getAllRoomHistory()
    setRoomHistory(history)
  }

  const handleJoinRoom = async (roomId: string) => {
    if (currentRoom?.id === roomId) return
    try {
      await joinRoom(roomId)
    } catch (error) {
      console.error('Failed to join room:', error)
    }
  }

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation()
    await deleteRoomHistory(roomId)
    await loadRoomHistory()
  }

  const handleAddRoom = async () => {
    if (onAddRoom) {
      onAddRoom()
    } else {
      await leaveRoom(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, roomId: string) => {
    setDraggedRoom(roomId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, roomId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverRoom(roomId)
  }

  const handleDragLeave = () => {
    setDragOverRoom(null)
  }

  const handleDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault()
    setDragOverRoom(null)

    if (!draggedRoom || draggedRoom === targetRoomId) {
      setDraggedRoom(null)
      return
    }

    const draggedIndex = roomHistory.findIndex(r => r.roomId === draggedRoom)
    const targetIndex = roomHistory.findIndex(r => r.roomId === targetRoomId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedRoom(null)
      return
    }

    // Create new array with reordered items
    const newOrder = [...roomHistory]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    // Update order values and persist
    const updatedRooms = newOrder.map((room, index) => ({
      ...room,
      order: index,
    }))

    setRoomHistory(updatedRooms)
    await updateRoomOrder(updatedRooms)
    setDraggedRoom(null)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="w-[72px] h-full bg-muted border-r border-black/20 flex flex-col items-center py-3 gap-2 shrink-0">
      <TooltipProvider delayDuration={200}>
        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col items-center gap-2 px-3">
            {roomHistory.map(room => (
              <Tooltip key={room.roomId}>
                <TooltipTrigger asChild>
                  <div
                    className="relative group"
                    draggable
                    onDragStart={(e) => handleDragStart(e, room.roomId)}
                    onDragOver={(e) => handleDragOver(e, room.roomId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, room.roomId)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleJoinRoom(room.roomId)}
                      className={cn(
                        "w-12 h-12 rounded-3xl transition-all duration-200 hover:rounded-2xl cursor-grab active:cursor-grabbing text-foreground",
                        draggedRoom === room.roomId && "opacity-50",
                        dragOverRoom === room.roomId && "ring-2 ring-accent ring-offset-2 ring-offset-muted",
                        currentRoom?.id === room.roomId
                          ? "bg-primary text-primary-foreground rounded-2xl"
                          : "bg-sidebar hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      <span className="font-display font-semibold text-sm pointer-events-none">
                        {getInitials(room.roomName)}
                      </span>
                    </Button>
                    {currentRoom?.id !== room.roomId && (
                      <button
                        onClick={(e) => handleDeleteRoom(e, room.roomId)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-auto"
                      >
                        <FontAwesomeIcon icon={faXmark} className="text-[12px]" />
                      </button>
                    )}
                    {currentRoom?.id === room.roomId && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-1 h-8 bg-accent rounded-r-full" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{room.roomName}</p>
                  <p className="text-xs text-muted-foreground">Room: {room.roomId}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-black/20 pt-2 w-full flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 rounded-3xl bg-sidebar text-success hover:bg-success hover:text-success-foreground transition-all duration-200 hover:rounded-2xl"
                onClick={handleAddRoom}
              >
                <FontAwesomeIcon icon={faPlus} className="text-[24px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add a Room</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}
