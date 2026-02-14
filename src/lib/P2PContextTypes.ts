import { User, Room, Channel, Message, Peer, FileMetadata } from '@/lib/types'

export interface P2PContextType {
  currentUser: User | null
  currentRoom: Room | null
  channels: Channel[]
  currentChannel: Channel | null
  messages: Message[]
  peers: Peer[]
  activeVoiceChannel: string | null
  isMuted: boolean
  isDeafened: boolean
  isScreenSharing: boolean
  isCameraOn: boolean
  localScreenShareStream: MediaStream | null
  localCameraStream: MediaStream | null
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  remoteScreenStreams: Map<string, MediaStream>
  remoteCameraStreams: Map<string, MediaStream>
  watchedScreenShares: Set<string>
  isSignalingConnected: boolean
  hasRoomKey: boolean
  fileTransfers: Map<string, { progress: number; metadata: FileMetadata }>
  speakingUsers: Set<string>
  setUsername: (username: string) => void
  createRoom: (roomName: string, username?: string, announceJoin?: boolean) => Promise<string>
  joinRoom: (roomCode: string, encryptionKey?: string, username?: string, announceJoin?: boolean) => Promise<void>
  leaveRoom: (autoSwitchToOtherRoom?: boolean, announceLeave?: boolean) => Promise<void>
  createChannel: (name: string, type: 'text' | 'voice') => Promise<void>
  selectChannel: (channelId: string) => void
  sendMessage: (content: string) => Promise<void>
  sendGifMessage: (gifUrl: string, searchQuery: string) => Promise<void>
  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  authorizePeerAccess: (messageId: string, peerId: string) => Promise<void>
  loadOlderMessages: () => Promise<number>
  sendFile: (file: File) => Promise<void>
  registerPushForCurrentRoom: (subscription?: PushSubscriptionJSON) => Promise<void>
  joinVoiceChannel: (channelId: string) => Promise<void>
  leaveVoiceChannel: () => void
  toggleMute: () => void
  toggleDeafen: () => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  startCamera: () => Promise<void>
  stopCamera: () => void
  watchScreenShare: (peerId: string) => void
  stopWatchingScreenShare: (peerId: string) => void
}
