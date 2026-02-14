import { Peer, Message, Channel, ReactionEvent } from './types'
import { SyncPayload, SyncHello, HistoryRequest, HistoryResponse } from './webrtc'

/**
 * Broadcast helpers for WebRTC peer mesh.
 * All methods send JSON-serialized messages to open data channels.
 */

export function broadcastMessage(peers: Map<string, Peer>, message: Message) {
  const data = JSON.stringify({ type: 'message', message })
  sendToAll(peers, data)
}

export function broadcastChannel(peers: Map<string, Peer>, channel: Channel) {
  const data = JSON.stringify({ type: 'channel-created', channel })
  sendToAll(peers, data)
}

export function broadcastVoiceState(peers: Map<string, Peer>, voiceChannelId: string | null) {
  const data = JSON.stringify({ type: 'voice-state', voiceChannelId })
  sendToAll(peers, data)
}

export function broadcastSpeakingState(peers: Map<string, Peer>, speaking: boolean) {
  const data = JSON.stringify({ type: 'speaking-state', speaking })
  sendToAll(peers, data)
}

export function broadcastScreenShareState(peers: Map<string, Peer>, voiceChannelId: string | null) {
  const data = JSON.stringify({ type: 'screen-share-state', voiceChannelId })
  sendToAll(peers, data)
}

export function broadcastCameraState(peers: Map<string, Peer>, cameraOn: boolean) {
  const data = JSON.stringify({ type: 'camera-state', cameraOn })
  sendToAll(peers, data)
}

export function sendScreenWatchRequest(peers: Map<string, Peer>, peerId: string, watch: boolean): boolean {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    peer.dataChannel.send(JSON.stringify({ type: 'screen-watch', watch }))
    return true
  }
  return false
}

export function sendSyncHello(peers: Map<string, Peer>, peerId: string, hello: SyncHello) {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    console.log('[sync] Sending sync-hello to', peerId, '| DC state:', peer.dataChannel.readyState)
    peer.dataChannel.send(JSON.stringify({
      type: 'sync-hello',
      lastMessageId: hello.lastMessageId,
      knownMessageIds: hello.knownMessageIds,
      knownChannelIds: hello.knownChannelIds,
      roomCreatedAt: hello.roomCreatedAt,
    }))
  } else {
    console.warn('[sync] Cannot send sync-hello to', peerId, '- no open data channel')
  }
}

export function sendSyncResponse(peers: Map<string, Peer>, peerId: string, payload: SyncPayload) {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    const json = JSON.stringify({ type: 'sync-response', payload })
    console.log('[sync] Sending sync-response to', peerId, '| size:', json.length, 'bytes |', payload.messages?.length ?? 0, 'msgs |', payload.channels?.length ?? 0, 'channels')
    peer.dataChannel.send(json)
  } else {
    console.warn('[sync] Cannot send sync-response to', peerId, '- no open data channel')
  }
}

export function sendHistoryRequest(peers: Map<string, Peer>, peerId: string, request: HistoryRequest): boolean {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    peer.dataChannel.send(JSON.stringify({ type: 'history-request', request }))
    return true
  }
  return false
}

export function sendHistoryResponse(peers: Map<string, Peer>, peerId: string, response: HistoryResponse): boolean {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    peer.dataChannel.send(JSON.stringify({ type: 'history-response', response }))
    return true
  }
  return false
}

export function sendRoomKeyRequest(peers: Map<string, Peer>, peerId: string, requesterUsername: string): boolean {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    peer.dataChannel.send(JSON.stringify({ type: 'room-key-request', requesterUsername }))
    return true
  }
  return false
}

export function sendRoomKeyShare(peers: Map<string, Peer>, peerId: string, roomKey: string, sharedByUsername: string): boolean {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    peer.dataChannel.send(JSON.stringify({ type: 'room-key-share', roomKey, sharedByUsername }))
    return true
  }
  return false
}

export function broadcastPresenceEvent(
  peers: Map<string, Peer>,
  event: { action: 'join' | 'leave'; username: string }
) {
  const data = JSON.stringify({ type: 'presence-event', event })
  return sendToAll(peers, data)
}

export function rebroadcast(peers: Map<string, Peer>, data: unknown, fromPeerId: string) {
  const raw = JSON.stringify(data)
  peers.forEach((peer) => {
    if (peer.id !== fromPeerId && peer.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(raw)
    }
  })
}

export function broadcastReaction(peers: Map<string, Peer>, reaction: ReactionEvent) {
  const data = JSON.stringify({ type: 'reaction', reaction })
  sendToAll(peers, data)
}

function sendToAll(peers: Map<string, Peer>, data: string): boolean {
  let sent = false
  peers.forEach((peer) => {
    if (peer.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(data)
      sent = true
    }
  })
  return sent
}

function sendToPeer(peers: Map<string, Peer>, peerId: string, data: string): boolean {
  const peer = peers.get(peerId)
  if (peer?.dataChannel?.readyState === 'open') {
    peer.dataChannel.send(data)
    return true
  }
  return false
}

/** Re-send the local user's current voice, screen-share and camera state to a single peer. */
export function sendVoiceStateToPeer(
  peers: Map<string, Peer>,
  peerId: string,
  voiceChannelId: string | null,
  isScreenSharing: boolean,
  screenShareChannelId: string | null,
  isCameraOn: boolean,
) {
  sendToPeer(peers, peerId, JSON.stringify({ type: 'voice-state', voiceChannelId }))
  if (isScreenSharing && screenShareChannelId) {
    sendToPeer(peers, peerId, JSON.stringify({ type: 'screen-share-state', voiceChannelId: screenShareChannelId }))
  }
  if (isCameraOn) {
    sendToPeer(peers, peerId, JSON.stringify({ type: 'camera-state', cameraOn: true }))
  }
}
