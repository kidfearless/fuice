export interface FileMetadata {
  name: string
  size: number
  type: string
  chunks: number
  transferId: string
}

export interface FileTransfer {
  id: string
  metadata: FileMetadata
  chunks: Map<number, ArrayBuffer>
  receivedChunks: number
  progress: number
  complete: boolean
  blob?: Blob
}

export interface Message {
  id: string
  channelId: string
  userId: string
  username: string
  content: string
  timestamp: number
  synced: boolean
  systemAction?: 'authorize-room-key'
  systemActionTargetPeerId?: string
  systemActionTargetUsername?: string
  systemActionResolved?: boolean
  systemActionResolvedBy?: string
  fileMetadata?: FileMetadata
  fileUrl?: string
  storedFileId?: string
  gifUrl?: string
  /** emoji -> array of { userId, username } */
  reactions?: Record<string, { userId: string; username: string }[]>
}

export interface ReactionEvent {
  messageId: string
  emoji: string
  userId: string
  username: string
  action: 'add' | 'remove'
}

export interface Channel {
  id: string
  name: string
  type: 'text' | 'voice'
  createdAt: number
}

export interface User {
  id: string
  username: string
  color: string
}

export interface Peer {
  id: string
  username: string
  connected: boolean
  connection?: RTCPeerConnection
  dataChannel?: RTCDataChannel
  audioStream?: MediaStream
  videoStream?: MediaStream
  cameraStream?: MediaStream
  voiceChannelId?: string
  isSpeaking?: boolean
  isScreenSharing?: boolean
  screenShareChannelId?: string
  isCameraOn?: boolean
}

export interface Room {
  id: string
  name: string
  channels: Channel[]
  createdAt: number
}

export interface RoomHistory {
  roomId: string
  roomName: string
  lastAccessed: number
  createdAt: number
  order: number
  lastChannelId?: string
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'connection-candidate' | 'join' | 'user-info' | 'peer-joined' | 'peer-left'
  from: string
  to?: string
  data: unknown
  roomId: string
}

export interface AppState {
  currentUser: User | null
  currentRoom: Room | null
  channels: Channel[]
  messages: Message[]
  peers: Map<string, Peer>
  activeVoiceChannel: string | null
  activeScreenShare: string | null
  isMuted: boolean
  isDeafened: boolean
}
