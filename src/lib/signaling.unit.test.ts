import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { SignalingClient } from './signaling'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static lastInstance: MockWebSocket | null = null

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    MockWebSocket.lastInstance = this
    // Auto-open on next tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  simulateError() {
    this.onerror?.(new Event('error'))
  }
}

describe('SignalingClient', () => {
  let origWebSocket: typeof WebSocket
  let lastWS: MockWebSocket

  beforeEach(() => {
    origWebSocket = globalThis.WebSocket
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url)
        lastWS = MockWebSocket.lastInstance as MockWebSocket
      }
    } as unknown as typeof WebSocket
    // Make OPEN accessible
    ;(globalThis.WebSocket as unknown as { OPEN: number }).OPEN = MockWebSocket.OPEN
    vi.useFakeTimers()
  })

  afterEach(() => {
    globalThis.WebSocket = origWebSocket
    vi.useRealTimers()
  })

  it('creates a client with room and user info', () => {
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    expect(client).toBeDefined()
    client.disconnect()
  })

  it('connects and sends join message', async () => {
    const onConnected = vi.fn()
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.onConnected(onConnected)
    client.connect('ws://localhost:3001')

    await vi.advanceTimersByTimeAsync(10)

    expect(onConnected).toHaveBeenCalled()
    const joinMsg = JSON.parse(lastWS.sent[0])
    expect(joinMsg.type).toBe('join')
    expect(joinMsg.roomId).toBe('room-1')
    expect(joinMsg.userId).toBe('user-1')
    expect(joinMsg.username).toBe('Alice')

    client.disconnect()
  })

  it('queues messages when not connected and drains on open', async () => {
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    // Send before connecting
    client.send({ type: 'test', data: 'queued1' })
    client.send({ type: 'test', data: 'queued2' })
    client.connect('ws://localhost:3001')

    // Before open, the queue should be drained after open
    expect(lastWS.sent.length).toBe(0) // not yet open

    // Open the connection
    await vi.advanceTimersByTimeAsync(10)

    // join + 2 queued messages should be sent
    expect(lastWS.sent.length).toBe(3)
    const sent1 = JSON.parse(lastWS.sent[1])
    expect(sent1.type).toBe('test')
    expect(sent1.data).toBe('queued1')
    const sent2 = JSON.parse(lastWS.sent[2])
    expect(sent2.data).toBe('queued2')

    client.disconnect()
  })

  it('sends offer, answer, and candidate messages', async () => {
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    client.sendOffer('peer-2', { type: 'offer', sdp: 'offer-sdp' })
    client.sendAnswer('peer-2', { type: 'answer', sdp: 'answer-sdp' })
    client.sendConnectionCandidate('peer-2', { candidate: 'cand', sdpMid: '0', sdpMLineIndex: 0 })

    // join + 3 messages
    expect(lastWS.sent.length).toBe(4)

    const offer = JSON.parse(lastWS.sent[1])
    expect(offer.type).toBe('offer')
    expect(offer.to).toBe('peer-2')

    const answer = JSON.parse(lastWS.sent[2])
    expect(answer.type).toBe('answer')

    const cand = JSON.parse(lastWS.sent[3])
    expect(cand.type).toBe('connection-candidate')

    client.disconnect()
  })

  it('sends push subscription and push notify', async () => {
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    client.sendPushSubscription({ endpoint: 'https://example.com' })
    client.sendPushNotify('payload', 'endpoint')

    const pushSub = JSON.parse(lastWS.sent[1])
    expect(pushSub.type).toBe('push-subscribe')

    const pushNotify = JSON.parse(lastWS.sent[2])
    expect(pushNotify.type).toBe('push-notify')
    expect(pushNotify.payload).toBe('payload')

    client.disconnect()
  })

  it('dispatches peer-list callback', async () => {
    const onPeerList = vi.fn()
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.onPeerList(onPeerList)
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    lastWS.simulateMessage({ type: 'peer-list', peers: [{ id: 'p1', username: 'Bob' }] })
    expect(onPeerList).toHaveBeenCalledWith([{ id: 'p1', username: 'Bob' }])
    client.disconnect()
  })

  it('dispatches peer-joined callback', async () => {
    const onPeerJoined = vi.fn()
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.onPeerJoined(onPeerJoined)
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    lastWS.simulateMessage({ type: 'peer-joined', userId: 'p2', username: 'Carol' })
    expect(onPeerJoined).toHaveBeenCalledWith({ id: 'p2', username: 'Carol' })
    client.disconnect()
  })

  it('dispatches peer-left callback', async () => {
    const onPeerLeft = vi.fn()
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.onPeerLeft(onPeerLeft)
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    lastWS.simulateMessage({ type: 'peer-left', userId: 'p3' })
    expect(onPeerLeft).toHaveBeenCalledWith('p3')
    client.disconnect()
  })

  it('dispatches signaling messages to onMessage', async () => {
    const onMessage = vi.fn()
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.onMessage(onMessage)
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    lastWS.simulateMessage({ type: 'offer', from: 'p1', roomId: 'room-1', data: {} })
    expect(onMessage).toHaveBeenCalled()
    client.disconnect()
  })

  it('handles error type messages', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    lastWS.simulateMessage({ type: 'error', message: 'something wrong' })
    expect(consoleSpy).toHaveBeenCalledWith('Signaling error:', 'something wrong')
    consoleSpy.mockRestore()
    client.disconnect()
  })

  it('handles malformed messages gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    // Send invalid JSON
    lastWS.onmessage?.(new MessageEvent('message', { data: 'not-json' }))
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
    client.disconnect()
  })

  it('isConnected returns correct state', async () => {
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    expect(client.isConnected()).toBe(false)

    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)
    expect(client.isConnected()).toBe(true)

    client.disconnect()
    expect(client.isConnected()).toBe(false)
  })

  it('dispatches onDisconnected callback', async () => {
    const onDisconnected = vi.fn()
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.onDisconnected(onDisconnected)
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    client.disconnect()
    expect(onDisconnected).toHaveBeenCalled()
  })

  it('attempts reconnect on disconnect', async () => {
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    // Simulate unexpected close (not a manual disconnect)
    const client2 = new SignalingClient('room-2', 'user-2', 'Bob')
    client2.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)

    // Trigger close on client2's ws
    lastWS.close()

    // Should attempt reconnect after delay
    await vi.advanceTimersByTimeAsync(2000)

    client.disconnect()
    client2.disconnect()
  })

  it('handles WebSocket constructor error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    globalThis.WebSocket = class {
      constructor() {
        throw new Error('ws failed')
      }
    } as unknown as typeof WebSocket
    ;(globalThis.WebSocket as unknown as { OPEN: number }).OPEN = 1

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
    client.disconnect()
  })

  it('connects without explicit URL (uses getSignalingServerUrl)', async () => {
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect() // Should use internal getSignalingServerUrl
    await vi.advanceTimersByTimeAsync(10)
    expect(lastWS).toBeDefined()
    expect(lastWS.url).toContain('ws')
    client.disconnect()
  })

  it('constructs URL from protocol/host/port when VITE_SIGNALING_URL is unset', async () => {
    const origUrl = import.meta.env.VITE_SIGNALING_URL
    const origPort = import.meta.env.VITE_SIGNALING_PORT
    delete import.meta.env.VITE_SIGNALING_URL
    delete import.meta.env.VITE_SIGNALING_PORT

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect()
    await vi.advanceTimersByTimeAsync(10)

    // jsdom window.location.hostname is 'localhost'
    expect(lastWS.url).toContain('localhost')
    expect(lastWS.url).toContain('3001')

    import.meta.env.VITE_SIGNALING_URL = origUrl
    import.meta.env.VITE_SIGNALING_PORT = origPort
    client.disconnect()
  })

  it('constructs URL for non-localhost hostname', async () => {
    const origUrl = import.meta.env.VITE_SIGNALING_URL
    const origPort = import.meta.env.VITE_SIGNALING_PORT
    delete import.meta.env.VITE_SIGNALING_URL
    delete import.meta.env.VITE_SIGNALING_PORT

    // Replace window.location entirely so hostname can be overridden
    const origLocation = window.location
    // @ts-expect-error - deleting location for mock
    delete (window as unknown).location
    window.location = { ...origLocation, hostname: 'example.com', protocol: 'https:' } as unknown

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect()
    await vi.advanceTimersByTimeAsync(10)

    expect(lastWS.url).toContain('example.com')
    expect(lastWS.url).toContain('3001')
    expect(lastWS.url).toContain('wss:')

    // Restore
    window.location = origLocation
    import.meta.env.VITE_SIGNALING_URL = origUrl
    import.meta.env.VITE_SIGNALING_PORT = origPort
    client.disconnect()
  })

  it('handles WebSocket onerror event', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    await vi.advanceTimersByTimeAsync(10)
    lastWS.simulateError()
    expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Event))
    consoleSpy.mockRestore()
    client.disconnect()
  })
})
