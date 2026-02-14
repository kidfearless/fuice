import type { Peer, Message, FileMetadata, Channel, Room, ReactionEvent } from './types'

export interface SyncPayload {
  room: Room | null
  channels: Channel[]
  messages: Message[]
}

export interface SyncHello {
  lastMessageId: string | null
  knownMessageIds: string[]
  knownChannelIds: string[]
  roomCreatedAt: number
}

export interface HistoryRequest {
  requestId: string
  channelId: string
  beforeMessageId: string | null
  limit: number
}

export interface HistoryResponse {
  requestId: string
  channelId: string
  messages: Message[]
  hasMore: boolean
}

export interface WebRTCCallbacks {
  onMessageReceived?: (message: Message) => void
  onPeerConnected?: (peer: Peer) => void
  onPeerDisconnected?: (peerId: string) => void
  onRemoteAudioStream?: (peerId: string, stream: MediaStream) => void
  onRemoteScreenStream?: (peerId: string, stream: MediaStream) => void
  onSignalingConnected?: () => void
  onSignalingDisconnected?: () => void
  onFileTransferProgress?: (transferId: string, progress: number) => void
  onFileReceived?: (transferId: string, blob: Blob, metadata: FileMetadata) => void
  onSyncRequested?: (peerId: string) => void
  onSyncReceived?: (payload: SyncPayload) => void
  onChannelReceived?: (channel: Channel) => void
  onVoiceStateChanged?: (peerId: string, voiceChannelId: string | null) => void
  onPeerSpeaking?: (peerId: string, speaking: boolean) => void
  onPeerUserInfo?: (peerId: string, username: string) => void
  onDataChannelReady?: (peerId: string) => void
  onSyncHello?: (peerId: string, hello: SyncHello) => void
  onHistoryRequested?: (peerId: string, request: HistoryRequest) => void
  onHistoryReceived?: (peerId: string, response: HistoryResponse) => void
  onRoomKeyRequested?: (peerId: string, requesterUsername: string) => void
  onRoomKeyShared?: (peerId: string, roomKey: string, sharedByUsername: string) => void
  onPresenceEvent?: (peerId: string, event: { action: 'join' | 'leave'; username: string }) => void
  onScreenShareStateChanged?: (peerId: string, voiceChannelId: string | null) => void
  onScreenWatchRequested?: (peerId: string, watch: boolean) => void
  onCameraStateChanged?: (peerId: string, cameraOn: boolean) => void
  onRemoteCameraStream?: (peerId: string, stream: MediaStream) => void
  onReactionReceived?: (peerId: string, reaction: ReactionEvent) => void
  onPushRenew?: () => void
  onSyncPoll?: (pollId: string, lastMessageId: string | null, roomId: string) => void
}
