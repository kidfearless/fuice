import { Peer, SignalingMessage, Channel, Message } from './types'
import { SignalingClient } from './signaling'
import { FileTransferManager } from './fileTransfer'
import * as broadcast from './webrtcBroadcast'
import { STUN_SERVERS, createNegotiationState, drainPendingCandidates, handleIncomingCandidate, handleIncomingAnswer, type NegotiationState } from './webrtcConnection'
import { sendFileToPeers, addStreamToPeers, removeStreamFromPeers } from './webrtcMedia'
import { setupDataChannel as wireDataChannel } from './webrtcDataChannel'
export type { SyncPayload, SyncHello, HistoryRequest, HistoryResponse, WebRTCCallbacks } from './webrtcTypes'
import type { SyncPayload, SyncHello, WebRTCCallbacks, HistoryRequest, HistoryResponse } from './webrtcTypes'

export class WebRTCManager {
  private peers: Map<string, Peer> = new Map()
  private localUserId: string
  private localUsername: string
  private roomId: string
  private signalingClient: SignalingClient
  private fileTransferManager: FileTransferManager
  private cb: WebRTCCallbacks = {}
  private nego: NegotiationState = createNegotiationState()
  private localScreenShareStream: MediaStream | null = null
  private localCameraStream: MediaStream | null = null
  private screenShareSubscribers: Set<string> = new Set()
  private screenShareSenders: Map<string, RTCRtpSender> = new Map()
  private cameraSenders: Map<string, RTCRtpSender> = new Map()

  constructor(userId: string, username: string, roomId: string) {
    this.localUserId = userId
    this.localUsername = username
    this.roomId = roomId
    this.signalingClient = new SignalingClient(roomId, userId, username)
    this.fileTransferManager = new FileTransferManager()
    this.setupFileTransferCallbacks()
    this.setupSignaling()
  }

  setCallbacks(callbacks: WebRTCCallbacks) {
    this.cb = callbacks
  }

  private setupFileTransferCallbacks() {
    this.fileTransferManager.setCallbacks({
      onTransferProgress: (id, progress) => this.cb.onFileTransferProgress?.(id, progress),
      onTransferComplete: (id, blob, meta) => this.cb.onFileReceived?.(id, blob, meta),
    })
  }

  private setupSignaling() {
    this.signalingClient.onMessage(async (msg: SignalingMessage) => {
      switch (msg.type) {
        case 'offer': await this.handleRemoteOffer(msg.from, msg.data as RTCSessionDescriptionInit); break
        case 'answer': await this.handleAnswer(msg.from, msg.data as RTCSessionDescriptionInit); break
        case 'connection-candidate': await this.handleConnectionCandidate(msg.from, msg.data as RTCIceCandidateInit); break
      }
    })

    this.signalingClient.onPeerList(async (peers) => {
      for (const peer of peers) {
        if (peer.id !== this.localUserId && !this.peers.has(peer.id)) {
          await this.createPeerConnection(peer.id, true)
        }
      }
    })

    this.signalingClient.onPeerJoined(async (peer) => {
      if (peer.id === this.localUserId) return
      this.cleanupPeer(peer.id)
      await this.createPeerConnection(peer.id, false)
    })

    this.signalingClient.onPeerLeft((peerId) => this.cleanupPeer(peerId))
    this.signalingClient.onConnected(() => this.cb.onSignalingConnected?.())
    this.signalingClient.onDisconnected(() => this.cb.onSignalingDisconnected?.())
    this.signalingClient.onPushRenew(() => this.cb.onPushRenew?.())
    this.signalingClient.onSyncPoll((pollId, lastMessageId, roomId) => this.cb.onSyncPoll?.(pollId, lastMessageId, roomId))
    this.signalingClient.connect()
  }

  private cleanupPeer(peerId: string) {
    const existing = this.peers.get(peerId)
    const screenSender = this.screenShareSenders.get(peerId)
    if (screenSender) {
      try { existing?.connection?.removeTrack(screenSender) } catch (e) { console.debug('Failed to remove screen sender:', e) }
      this.screenShareSenders.delete(peerId)
    }
    this.screenShareSubscribers.delete(peerId)
    if (existing) {
      existing.dataChannel?.close()
      existing.connection?.close()
      this.peers.delete(peerId)
      this.cb.onPeerDisconnected?.(peerId)
    }
  }

  private async handleRemoteOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    try {
      const answer = await this.handleOffer(peerId, offer)
      if (!this.nego.ignoreOffer.get(peerId)) this.signalingClient.sendAnswer(peerId, answer)
    } catch (e) { console.error('Failed to handle remote offer:', e) }
  }

  async createPeerConnection(peerId: string, isInitiator: boolean): Promise<Peer> {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    const peer: Peer = { id: peerId, username: '', connected: false, connection: pc }

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signalingClient.sendConnectionCandidate(peerId, e.candidate)
    }

    pc.ontrack = (e) => {
      const [stream] = e.streams
      if (!stream) return
      if (e.track.kind === 'video') {
        // Differentiate camera vs screen share:
        // If peer has camera on and we don't have their camera stream yet, it's camera
        // Otherwise it's screen share
        if (peer.isCameraOn && !peer.cameraStream) {
          peer.cameraStream = stream
          this.cb.onRemoteCameraStream?.(peerId, stream)
        } else {
          peer.videoStream = stream
          this.cb.onRemoteScreenStream?.(peerId, stream)
        }
        return
      }
      peer.audioStream = stream
      this.cb.onRemoteAudioStream?.(peerId, stream)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { peer.connected = true; this.cb.onPeerConnected?.(peer) }
      else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        peer.connected = false; this.cb.onPeerDisconnected?.(peerId)
      }
    }

    pc.onnegotiationneeded = async () => {
      if (pc.signalingState !== 'stable' || this.nego.makingOffer.get(peerId)) return
      this.nego.makingOffer.set(peerId, true)
      try {
        await pc.setLocalDescription()
        this.signalingClient.sendOffer(peerId, pc.localDescription!)
      } catch (err) {
        console.error('Renegotiation failed:', err)
      } finally {
        this.nego.makingOffer.set(peerId, false)
      }
    }

    pc.onsignalingstatechange = () => {
      if (pc.signalingState === 'stable') {
        this.nego.isNegotiating.set(peerId, false)
        this.nego.makingOffer.set(peerId, false)
      }
    }

    pc.ondatachannel = (e) => {
      console.log('Received remote data channel from peer:', peerId)
      this.setupDataChannel(peer, e.channel)
    }

    if (isInitiator) {
      const dc = pc.createDataChannel('chat')
      this.setupDataChannel(peer, dc)
    }

    this.peers.set(peerId, peer)
    if (this.localScreenShareStream && this.screenShareSubscribers.has(peerId)) {
      this.attachScreenTrackToPeer(peerId)
    }
    return peer
  }

  private attachScreenTrackToPeer(peerId: string) {
    const peer = this.peers.get(peerId)
    if (!peer?.connection || !this.localScreenShareStream) return

    const [videoTrack] = this.localScreenShareStream.getVideoTracks()
    if (!videoTrack) return

    const existing = this.screenShareSenders.get(peerId)
    if (existing) {
      void existing.replaceTrack(videoTrack)
      return
    }

    try {
      const sender = peer.connection.addTrack(videoTrack, this.localScreenShareStream)
      this.screenShareSenders.set(peerId, sender)
    } catch (error) {
      console.error('Failed to attach screen track to peer:', peerId, error)
    }
  }

  private detachScreenTrackFromPeer(peerId: string) {
    const peer = this.peers.get(peerId)
    const sender = this.screenShareSenders.get(peerId)
    if (!peer?.connection || !sender) return
    try {
      peer.connection.removeTrack(sender)
    } catch (error) {
      console.debug('Failed to detach screen track:', error)
    }
    this.screenShareSenders.delete(peerId)
  }

  private setupDataChannel(peer: Peer, dataChannel: RTCDataChannel) {
    wireDataChannel(peer, dataChannel, this.localUsername, this.localUserId, this.peers, this.cb, this.fileTransferManager)
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    let peer = this.peers.get(peerId)
    if (peer?.connection) {
      const state = peer.connection.connectionState
      if (['failed', 'closed', 'disconnected'].includes(state)) {
        this.cleanupPeer(peerId)
        peer = undefined
      } else {
        const collision = offer.type === 'offer' && (this.nego.makingOffer.get(peerId) || peer.connection.signalingState !== 'stable')
        this.nego.ignoreOffer.set(peerId, !this.isPolite(peerId) && collision)
        if (this.nego.ignoreOffer.get(peerId)) return { type: 'answer', sdp: '' }
        await peer.connection.setRemoteDescription(offer)
        await drainPendingCandidates(this.peers, this.nego, peerId)
        const answer = await peer.connection.createAnswer()
        await peer.connection.setLocalDescription(answer)
        return answer
      }
    }
    peer = await this.createPeerConnection(peerId, false)
    await peer.connection!.setRemoteDescription(offer)
    await drainPendingCandidates(this.peers, this.nego, peerId)
    const answer = await peer.connection!.createAnswer()
    await peer.connection!.setLocalDescription(answer)
    return answer
  }

  private isPolite(peerId: string): boolean { return this.localUserId < peerId }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    await handleIncomingAnswer(this.peers, this.nego, peerId, answer)
  }

  async handleConnectionCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    await handleIncomingCandidate(this.peers, this.nego, peerId, candidate)
  }

  sendMessage(message: Message) { broadcast.broadcastMessage(this.peers, message) }
  sendReaction(reaction: import('./types').ReactionEvent) { broadcast.broadcastReaction(this.peers, reaction) }
  sendSyncHello(peerId: string, hello: SyncHello) { broadcast.sendSyncHello(this.peers, peerId, hello) }
  sendSyncResponse(peerId: string, payload: SyncPayload) { broadcast.sendSyncResponse(this.peers, peerId, payload) }
  sendHistoryResponse(peerId: string, response: HistoryResponse): boolean {
    return broadcast.sendHistoryResponse(this.peers, peerId, response)
  }
  requestRoomKey(peerId: string): boolean {
    return broadcast.sendRoomKeyRequest(this.peers, peerId, this.localUsername)
  }
  shareRoomKey(peerId: string, roomKey: string): boolean {
    return broadcast.sendRoomKeyShare(this.peers, peerId, roomKey, this.localUsername)
  }
  broadcastPresenceEvent(action: 'join' | 'leave', username: string): boolean {
    const trimmed = username.trim()
    if (!trimmed) return false
    return broadcast.broadcastPresenceEvent(this.peers, { action, username: trimmed })
  }
  requestHistory(request: HistoryRequest): boolean {
    for (const peer of this.peers.values()) {
      if (peer.dataChannel?.readyState === 'open') {
        return broadcast.sendHistoryRequest(this.peers, peer.id, request)
      }
    }
    return false
  }
  broadcastChannel(channel: Channel) { broadcast.broadcastChannel(this.peers, channel) }
  broadcastVoiceState(voiceChannelId: string | null) { broadcast.broadcastVoiceState(this.peers, voiceChannelId) }
  broadcastSpeakingState(speaking: boolean) { broadcast.broadcastSpeakingState(this.peers, speaking) }
  broadcastScreenShareState(voiceChannelId: string | null) { broadcast.broadcastScreenShareState(this.peers, voiceChannelId) }
  broadcastCameraState(cameraOn: boolean) { broadcast.broadcastCameraState(this.peers, cameraOn) }
  sendVoiceStateToPeer(peerId: string, voiceChannelId: string | null, isScreenSharing: boolean, screenShareChannelId: string | null, isCameraOn: boolean) {
    broadcast.sendVoiceStateToPeer(this.peers, peerId, voiceChannelId, isScreenSharing, screenShareChannelId, isCameraOn)
  }
  sendScreenWatchRequest(peerId: string, watch: boolean): boolean {
    return broadcast.sendScreenWatchRequest(this.peers, peerId, watch)
  }
  setScreenShareSubscription(peerId: string, watch: boolean) {
    if (watch) {
      this.screenShareSubscribers.add(peerId)
      this.attachScreenTrackToPeer(peerId)
      return
    }
    this.screenShareSubscribers.delete(peerId)
    this.detachScreenTrackFromPeer(peerId)
  }
  setLocalScreenShareStream(stream: MediaStream | null) {
    this.localScreenShareStream = stream
    if (!stream) {
      Array.from(this.screenShareSenders.keys()).forEach(peerId => this.detachScreenTrackFromPeer(peerId))
      return
    }
    this.screenShareSubscribers.forEach(peerId => this.attachScreenTrackToPeer(peerId))
  }
  rebroadcast(data: unknown, fromPeerId: string) { broadcast.rebroadcast(this.peers, data, fromPeerId) }

  /** Register a push subscription with the signaling server. */
  registerPushSubscription(subscription: PushSubscriptionJSON) {
    this.signalingClient.sendPushSubscription(subscription)
  }

  /** Ask the signaling server to relay a push notification to offline peers.
   *  The payload is opaque to the server. */
  pushToOfflinePeers(payload: string, senderEndpoint?: string) {
    this.signalingClient.sendPushNotify(payload, senderEndpoint)
  }

  /** Respond to a sync-poll relayed by the signaling server from an offline
   *  client's service worker. */
  respondToSyncPoll(pollId: string, messages: unknown[]) {
    this.signalingClient.sendSyncPollResponse(pollId, messages)
  }

  async sendFile(file: File, message: Message) { return sendFileToPeers(this.peers, this.fileTransferManager, file, message) }
  async addAudioStream(stream: MediaStream) { addStreamToPeers(this.peers, stream) }
  async removeAudioStream(stream: MediaStream) { removeStreamFromPeers(this.peers, stream) }
  addCameraStream(stream: MediaStream) {
    this.localCameraStream = stream
    const [videoTrack] = stream.getVideoTracks()
    if (!videoTrack) return
    this.peers.forEach((peer, peerId) => {
      if (!peer.connection) return
      try {
        const sender = peer.connection.addTrack(videoTrack, stream)
        this.cameraSenders.set(peerId, sender)
      } catch (error) {
        console.error('Failed to add camera track to peer:', peerId, error)
      }
    })
  }
  removeCameraStream() {
    this.peers.forEach((peer, peerId) => {
      const sender = this.cameraSenders.get(peerId)
      if (sender && peer.connection) {
        try { peer.connection.removeTrack(sender) } catch (e) { console.debug('Failed to remove camera sender:', e) }
      }
      this.cameraSenders.delete(peerId)
    })
    this.localCameraStream = null
  }
  getPeers(): Peer[] { return Array.from(this.peers.values()) }
  disconnect() {
    this.setLocalScreenShareStream(null)
    this.screenShareSubscribers.clear()
    this.peers.forEach(p => { p.dataChannel?.close(); p.connection?.close() })
    this.peers.clear()
    this.signalingClient.disconnect()
  }
  isSignalingConnected(): boolean { return this.signalingClient.isConnected() }
}
