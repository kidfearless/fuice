import { SignalingMessage } from './types'

type SignalingCallback = (message: SignalingMessage) => void

export class SignalingClient {
  private ws: WebSocket | null = null
  private roomId: string
  private userId: string
  private username: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = Infinity
  private baseReconnectDelay = 1000
  private maxReconnectDelay = 30000
  private messageQueue: unknown[] = []
  private onMessageCallback?: SignalingCallback
  private onConnectedCallback?: () => void
  private onDisconnectedCallback?: () => void
  private onPeerListCallback?: (peers: Array<{ id: string; username: string }>) => void
  private onPeerJoinedCallback?: (peer: { id: string; username: string }) => void
  private onPeerLeftCallback?: (peerId: string) => void
  private onPushRenewCallback?: () => void
  private onSyncPollCallback?: (pollId: string, lastMessageId: string | null, roomId: string) => void

  constructor(roomId: string, userId: string, username: string) {
    this.roomId = roomId
    this.userId = userId
    this.username = username
  }

  connect(signalingServerUrl?: string) {
    const wsUrl = signalingServerUrl || this.getSignalingServerUrl()
    
    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('Connected to signaling server')
        this.reconnectAttempts = 0
        
        this.send({
          type: 'join',
          roomId: this.roomId,
          userId: this.userId,
          username: this.username,
        })

        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()
          this.send(msg)
        }

        this.onConnectedCallback?.()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'peer-list') {
            this.onPeerListCallback?.(data.peers)
          } else if (data.type === 'peer-joined') {
            this.onPeerJoinedCallback?.({ id: data.userId, username: data.username })
          } else if (data.type === 'peer-left') {
            this.onPeerLeftCallback?.(data.userId)
          } else if (data.type === 'push-renew') {
            this.onPushRenewCallback?.()
          } else if (data.type === 'sync-poll') {
            this.onSyncPollCallback?.(data.pollId, data.lastMessageId ?? null, data.roomId)
          } else if (data.type === 'error') {
            console.error('Signaling error:', data.message)
          } else {
            this.onMessageCallback?.(data as SignalingMessage)
          }
        } catch (error) {
          console.error('Error parsing signaling message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      this.ws.onclose = () => {
        console.log('Disconnected from signaling server')
        this.onDisconnectedCallback?.()
        this.attemptReconnect(wsUrl)
      }
    } catch (error) {
      console.error('Failed to connect to signaling server:', error)
      this.attemptReconnect(wsUrl)
    }
  }

  private getSignalingServerUrl(): string {
    const envUrl = import.meta.env.VITE_SIGNALING_URL as string | undefined
    if (envUrl && !this.isPlaceholderSignalingUrl(envUrl)) {
      return envUrl
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = import.meta.env.VITE_SIGNALING_PORT || '3001'
    
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${protocol}//${host}:${port}`
    }
    
    return `${protocol}//${host}:${port}`
  }

  private isPlaceholderSignalingUrl(url: string): boolean {
    const normalized = url.toLowerCase()
    return normalized.includes('your-app-signaling') || normalized.includes('example.com')
  }

  private attemptReconnect(wsUrl: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      // Exponential backoff with jitter, capped at maxReconnectDelay
      const expDelay = Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      )
      const jitter = Math.random() * 0.3 * expDelay
      const delay = Math.round(expDelay + jitter)
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
      
      setTimeout(() => {
        this.connect(wsUrl)
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  send(message: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  sendOffer(to: string, offer: RTCSessionDescriptionInit) {
    this.send({
      type: 'offer',
      from: this.userId,
      to,
      roomId: this.roomId,
      data: offer,
    })
  }

  sendAnswer(to: string, answer: RTCSessionDescriptionInit) {
    this.send({
      type: 'answer',
      from: this.userId,
      to,
      roomId: this.roomId,
      data: answer,
    })
  }

  sendConnectionCandidate(to: string, candidate: RTCIceCandidateInit) {
    this.send({
      type: 'connection-candidate',
      from: this.userId,
      to,
      roomId: this.roomId,
      data: candidate,
    })
  }

  /** Register our push subscription with the signaling server for this room.
   *  No visitor identity is sent — the server keys by the subscription endpoint. */
  sendPushSubscription(subscription: PushSubscriptionJSON) {
    this.send({
      type: 'push-subscribe',
      roomId: this.roomId,
      subscription,
    })
  }

  /** Ask the signaling server to relay a push notification to offline peers.
   *  The server treats `payload` as an opaque string — it never parses it.
   *  `senderEndpoint` lets the server skip our own subscription. */
  sendPushNotify(payload: string, senderEndpoint?: string) {
    this.send({
      type: 'push-notify',
      roomId: this.roomId,
      senderEndpoint,
      payload,
    })
  }

  /** Respond to a sync-poll relayed from the server on behalf of an offline
   *  client’s background service worker.  Messages are forwarded opaquely. */
  sendSyncPollResponse(pollId: string, messages: unknown[]) {
    this.send({
      type: 'sync-poll-response',
      pollId,
      messages,
    })
  }

  onMessage(callback: SignalingCallback) {
    this.onMessageCallback = callback
  }

  onConnected(callback: () => void) {
    this.onConnectedCallback = callback
  }

  onDisconnected(callback: () => void) {
    this.onDisconnectedCallback = callback
  }

  onPeerList(callback: (peers: Array<{ id: string; username: string }>) => void) {
    this.onPeerListCallback = callback
  }

  onPeerJoined(callback: (peer: { id: string; username: string }) => void) {
    this.onPeerJoinedCallback = callback
  }

  onPeerLeft(callback: (peerId: string) => void) {
    this.onPeerLeftCallback = callback
  }

  onPushRenew(callback: () => void) {
    this.onPushRenewCallback = callback
  }

  onSyncPoll(callback: (pollId: string, lastMessageId: string | null, roomId: string) => void) {
    this.onSyncPollCallback = callback
  }

  disconnect() {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts
      try { this.ws.close() } catch { /* ignore close errors */ }
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
