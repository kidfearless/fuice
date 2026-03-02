import React, { Component } from 'react'
import { getAllRoomHistory, deleteRoomHistory, updateRoomOrder } from '@/lib/db'
import { RoomHistory } from '@/lib/types'
import { P2PContext } from '@/lib/P2PContext'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface RoomHistorySidebarProps {
  onAddRoom?: () => void
  p2p: ReturnType<typeof useP2P>
}

interface RoomHistorySidebarState {
  roomHistory: RoomHistory[]
  draggedRoom: string | null
  dragOverRoom: string | null
}

class RoomHistorySidebarClass extends Component<RoomHistorySidebarProps, RoomHistorySidebarState> {
  constructor(props: RoomHistorySidebarProps) {
    super(props)
    this.state = {
      roomHistory: [],
      draggedRoom: null,
      dragOverRoom: null,
    }
  }

  private get p2p() { return this.componentProps.p2p }
  private get onAddRoom() { return this.componentProps.onAddRoom }
  private get roomHistory() { return this.state.roomHistory }
  private set roomHistory(roomHistory: RoomHistory[]) { this.setState({ roomHistory }) }
  private get draggedRoom() { return this.state.draggedRoom }
  private set draggedRoom(draggedRoom: string | null) { this.setState({ draggedRoom }) }
  private get dragOverRoom() { return this.state.dragOverRoom }
  private set dragOverRoom(dragOverRoom: string | null) { this.setState({ dragOverRoom }) }

  componentDidMount() {
    this.loadRoomHistory()
  }

  componentDidUpdate(prevProps: RoomHistorySidebarProps) {
    if (prevProps.p2p.currentRoom?.id !== this.p2p.currentRoom?.id) {
      this.loadRoomHistory()
    }
  }

  loadRoomHistory = async () => {
    const history = await getAllRoomHistory()
    this.roomHistory = history
  }

  handleJoinRoom = async (roomId: string) => {
    const currentRoom = this.p2p.currentRoom
    const joinRoom = this.p2p.joinRoom
    if (currentRoom?.id === roomId) return
    try {
      await joinRoom(roomId)
    } catch (error) {
      console.error('Failed to join room:', error)
    }
  }

  handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation()
    await deleteRoomHistory(roomId)
    await this.loadRoomHistory()
  }

  handleAddRoom = async () => {
    const onAddRoom = this.onAddRoom
    const p2p = this.p2p
    if (onAddRoom) {
      onAddRoom()
    } else {
      await p2p.leaveRoom(false)
    }
  }

  handleDragStart = (e: React.DragEvent, roomId: string) => {
    this.draggedRoom = roomId
    e.dataTransfer.effectAllowed = 'move'
  }

  handleDragOver = (e: React.DragEvent, roomId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    this.dragOverRoom = roomId
  }

  handleDragLeave = () => {
    this.dragOverRoom = null
  }

  handleDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault()
    const draggedRoom = this.draggedRoom
    const roomHistory = this.roomHistory
    this.dragOverRoom = null

    if (!draggedRoom || draggedRoom === targetRoomId) {
      this.draggedRoom = null
      return
    }

    const draggedIndex = roomHistory.findIndex(r => r.roomId === draggedRoom)
    const targetIndex = roomHistory.findIndex(r => r.roomId === targetRoomId)

    if (draggedIndex === -1 || targetIndex === -1) {
      this.draggedRoom = null
      return
    }

    const newOrder = [...roomHistory]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    const updatedRooms = newOrder.map((room, index) => ({
      ...room,
      order: index,
    }))

    this.roomHistory = updatedRooms
    this.draggedRoom = null
    await updateRoomOrder(updatedRooms)
  }

  getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  render() {
    const roomHistory = this.roomHistory
    const draggedRoom = this.draggedRoom
    const dragOverRoom = this.dragOverRoom
    const p2p = this.p2p
    const { currentRoom } = p2p

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
                      onDragStart={(e) => this.handleDragStart(e, room.roomId)}
                      onDragOver={(e) => this.handleDragOver(e, room.roomId)}
                      onDragLeave={this.handleDragLeave}
                      onDrop={(e) => this.handleDrop(e, room.roomId)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => this.handleJoinRoom(room.roomId)}
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
                          {this.getInitials(room.roomName)}
                        </span>
                      </Button>
                      {currentRoom?.id !== room.roomId && (
                        <button
                          onClick={(e) => this.handleDeleteRoom(e, room.roomId)}
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
                  onClick={this.handleAddRoom}
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
}

export class RoomHistorySidebar extends Component<{ onAddRoom?: () => void }> {
  static contextType = P2PContext
  private get onAddRoom() { return this.componentProps.onAddRoom }

  render() {
    if (!this.context) return null
    return <RoomHistorySidebarClass onAddRoom={this.onAddRoom} p2p={this.context as ReturnType<typeof useP2P>} />
  }
}
