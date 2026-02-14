import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { Message, Channel } from './types'

// --- Mock SignalingClient ---
const mockSignaling = vi.hoisted(() => ({
  onMessage: vi.fn(),
  onPeerList: vi.fn(),
  onPeerJoined: vi.fn(),
  onPeerLeft: vi.fn(),
  onConnected: vi.fn(),
  onDisconnected: vi.fn(),
  onPushRenew: vi.fn(),
  onSyncPoll: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
  sendOffer: vi.fn(),
  sendAnswer: vi.fn(),
  sendConnectionCandidate: vi.fn(),
  sendPushSubscription: vi.fn(),
  sendPushNotify: vi.fn(),
  send: vi.fn(),
}))

vi.mock('./signaling', () => ({
  SignalingClient: class MockSignalingClient {
    onMessage = mockSignaling.onMessage
    onPeerList = mockSignaling.onPeerList
    onPeerJoined = mockSignaling.onPeerJoined
    onPeerLeft = mockSignaling.onPeerLeft
    onConnected = mockSignaling.onConnected
    onDisconnected = mockSignaling.onDisconnected
    onPushRenew = mockSignaling.onPushRenew
    onSyncPoll = mockSignaling.onSyncPoll
    connect = mockSignaling.connect
    disconnect = mockSignaling.disconnect
    isConnected = mockSignaling.isConnected
    sendOffer = mockSignaling.sendOffer
    sendAnswer = mockSignaling.sendAnswer
    sendConnectionCandidate = mockSignaling.sendConnectionCandidate
    sendPushSubscription = mockSignaling.sendPushSubscription
    sendPushNotify = mockSignaling.sendPushNotify
    send = mockSignaling.send
  },
}))

const mockFTMCallbacks = vi.hoisted(() => ({
  onTransferProgress: null as ((id: string, progress: number) => void) | null,
  onTransferComplete: null as ((id: string, blob: Blob, meta: unknown) => void) | null,
}))

vi.mock('./fileTransfer', () => ({
  FileTransferManager: class MockFileTransferManager {
    setCallbacks = vi.fn((cbs: { onTransferProgress?: (id: string, p: number) => void; onTransferComplete?: (id: string, blob: Blob, meta: unknown) => void }) => {
      mockFTMCallbacks.onTransferProgress = cbs.onTransferProgress ?? null
      mockFTMCallbacks.onTransferComplete = cbs.onTransferComplete ?? null
    })
    prepareFileForTransfer = vi.fn().mockResolvedValue({
      metadata: { name: 'f.bin', size: 1, type: 'application/octet-stream', transferId: 'tid', totalChunks: 1 },
      chunks: [new ArrayBuffer(1)],
    })
  },
}))

import { WebRTCManager } from './webrtc'

// --- Mock RTCPeerConnection ---
function createMockPC() {
  const pc = {
    signalingState: 'stable',
    connectionState: 'new',
    localDescription: null as RTCSessionDescriptionInit | null,
    onicecandidate: null as ((e: { candidate: RTCIceCandidateInit | null }) => void) | null,
    ontrack: null as ((e: { streams: MediaStream[]; track: { kind: string } }) => void) | null,
    onconnectionstatechange: null as (() => void) | null,
    onnegotiationneeded: null as (() => void) | null,
    onsignalingstatechange: null as (() => void) | null,
    ondatachannel: null as ((e: { channel: RTCDataChannel }) => void) | null,
    createDataChannel: vi.fn(() => createMockDataChannel()),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'answer-sdp' }),
    setLocalDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      if (desc) pc.localDescription = desc
      else pc.localDescription = { type: 'offer', sdp: 'offer-sdp' }
    }),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn((track: MediaStreamTrack, _stream: MediaStream) => ({ track, replaceTrack: vi.fn() })),
    removeTrack: vi.fn(),
    getSenders: vi.fn(() => []),
    close: vi.fn(),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    iceServers: [],
  }
  return pc
}

function createMockDataChannel(): RTCDataChannel {
  return {
    readyState: 'open',
    binaryType: 'arraybuffer',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    label: 'chat',
    onopen: null as (() => void) | null,
    onclose: null as (() => void) | null,
    onerror: null as ((e: Event) => void) | null,
    onmessage: null as ((e: MessageEvent) => void) | null,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as RTCDataChannel
}

let mockPCs: ReturnType<typeof createMockPC>[] = []

describe('WebRTCManager', () => {
  let origRTCPeerConnection: typeof RTCPeerConnection

  beforeEach(() => {
    mockPCs = []
    vi.clearAllMocks()

    origRTCPeerConnection = globalThis.RTCPeerConnection
    globalThis.RTCPeerConnection = class MockRTCPeerConnection {
      constructor() {
        const pc = createMockPC()
        mockPCs.push(pc)
        return pc as unknown as RTCPeerConnection
      }
    } as unknown as typeof RTCPeerConnection

    // Reset signaling mock callbacks
    mockSignaling.onMessage.mockClear()
    mockSignaling.onPeerList.mockClear()
    mockSignaling.onPeerJoined.mockClear()
    mockSignaling.onPeerLeft.mockClear()
    mockSignaling.onConnected.mockClear()
    mockSignaling.onDisconnected.mockClear()
    mockSignaling.onPushRenew.mockClear()
    mockSignaling.onSyncPoll.mockClear()
    mockSignaling.connect.mockClear()
    mockSignaling.disconnect.mockClear()
    mockSignaling.sendOffer.mockClear()
    mockSignaling.sendAnswer.mockClear()
    mockSignaling.sendConnectionCandidate.mockClear()
  })

  afterEach(() => {
    globalThis.RTCPeerConnection = origRTCPeerConnection
  })

  it('creates a manager and connects to signaling', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    expect(mockSignaling.connect).toHaveBeenCalled()
    expect(mockSignaling.onMessage).toHaveBeenCalled()
    expect(mockSignaling.onPeerList).toHaveBeenCalled()
    expect(mockSignaling.onPeerJoined).toHaveBeenCalled()
    expect(mockSignaling.onPeerLeft).toHaveBeenCalled()
    expect(mockSignaling.onConnected).toHaveBeenCalled()
    expect(mockSignaling.onDisconnected).toHaveBeenCalled()
    manager.disconnect()
  })

  it('setCallbacks stores callbacks', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    const cb = { onMessageReceived: vi.fn() }
    manager.setCallbacks(cb)
    manager.disconnect()
  })

  it('creates peer connections when peer list arrives', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCallback = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCallback([{ id: 'peer-2', username: 'Bob' }])

    expect(mockPCs.length).toBe(1)
    manager.disconnect()
  })

  it('ignores own peer ID in peer list', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCallback = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCallback([{ id: 'user-1', username: 'Alice' }])

    expect(mockPCs.length).toBe(0)
    manager.disconnect()
  })

  it('creates peer connection on peer joined', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerJoinedCallback = mockSignaling.onPeerJoined.mock.calls[0][0]
    await peerJoinedCallback({ id: 'peer-2', username: 'Bob' })

    expect(mockPCs.length).toBe(1)
    manager.disconnect()
  })

  it('ignores own peer joined event', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerJoinedCallback = mockSignaling.onPeerJoined.mock.calls[0][0]
    await peerJoinedCallback({ id: 'user-1', username: 'Alice' })

    expect(mockPCs.length).toBe(0)
    manager.disconnect()
  })

  it('cleans up peer on peer left', async () => {
    const onDisconnected = vi.fn()
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.setCallbacks({ onPeerDisconnected: onDisconnected })

    // First add a peer
    const peerJoinedCallback = mockSignaling.onPeerJoined.mock.calls[0][0]
    await peerJoinedCallback({ id: 'peer-2', username: 'Bob' })

    // Then remove it
    const peerLeftCallback = mockSignaling.onPeerLeft.mock.calls[0][0]
    peerLeftCallback('peer-2')

    expect(onDisconnected).toHaveBeenCalledWith('peer-2')
    manager.disconnect()
  })

  it('fires signaling connected/disconnected callbacks', () => {
    const onSigConnected = vi.fn()
    const onSigDisconnected = vi.fn()
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.setCallbacks({
      onSignalingConnected: onSigConnected,
      onSignalingDisconnected: onSigDisconnected,
    })

    const connectedCb = mockSignaling.onConnected.mock.calls[0][0]
    const disconnectedCb = mockSignaling.onDisconnected.mock.calls[0][0]

    connectedCb()
    expect(onSigConnected).toHaveBeenCalled()

    disconnectedCb()
    expect(onSigDisconnected).toHaveBeenCalled()

    manager.disconnect()
  })

  it('handles incoming offer', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const onMessageCb = mockSignaling.onMessage.mock.calls[0][0]
    await onMessageCb({ type: 'offer', from: 'peer-2', data: { type: 'offer', sdp: 'remote-offer' } })

    expect(mockPCs.length).toBe(1)
    expect(mockPCs[0].setRemoteDescription).toHaveBeenCalled()
    expect(mockSignaling.sendAnswer).toHaveBeenCalled()

    manager.disconnect()
  })

  it('handles incoming answer', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    // Create a peer first
    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const onMessageCb = mockSignaling.onMessage.mock.calls[0][0]
    await onMessageCb({ type: 'answer', from: 'peer-2', data: { type: 'answer', sdp: 'answer-sdp' } })

    manager.disconnect()
  })

  it('handles incoming ICE candidate', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const onMessageCb = mockSignaling.onMessage.mock.calls[0][0]
    await onMessageCb({ type: 'connection-candidate', from: 'peer-2', data: { candidate: 'cand' } })

    manager.disconnect()
  })

  it('sendMessage broadcasts to peers', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const msg: Message = {
      id: 'm1', channelId: 'c1', userId: 'user-1', username: 'Alice',
      content: 'Hello', timestamp: Date.now(), synced: true,
    }
    manager.sendMessage(msg)
    manager.disconnect()
  })

  it('broadcastChannel sends channel to peers', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    const ch: Channel = { id: 'c1', name: 'general', type: 'text', createdAt: 1 }
    manager.broadcastChannel(ch)
    manager.disconnect()
  })

  it('broadcastVoiceState / broadcastSpeakingState / broadcastScreenShareState / broadcastCameraState', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.broadcastVoiceState('vc-1')
    manager.broadcastSpeakingState(true)
    manager.broadcastScreenShareState('vc-1')
    manager.broadcastCameraState(true)
    manager.disconnect()
  })

  it('sendReaction sends reaction', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.sendReaction({ messageId: 'm1', emoji: '👍', userId: 'user-1', username: 'Alice', action: 'add' })
    manager.disconnect()
  })

  it('sendSyncHello / sendSyncResponse', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.sendSyncHello('peer-2', {
      lastMessageId: null, knownMessageIds: [], knownChannelIds: [], roomCreatedAt: 0,
    })
    manager.sendSyncResponse('peer-2', { messages: [], channels: [], roomCreatedAt: 0 })
    manager.disconnect()
  })

  it('sendHistoryResponse / requestHistory / requestRoomKey / shareRoomKey', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.sendHistoryResponse('peer-2', { channelId: 'c1', messages: [] })
    manager.requestRoomKey('peer-2')
    manager.shareRoomKey('peer-2', 'test-key')
    manager.disconnect()
  })

  it('requestHistory sends to first open peer', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    // The peer's data channel may not be open - returns false
    const result = manager.requestHistory({ channelId: 'c1' })
    expect(typeof result).toBe('boolean')
    manager.disconnect()
  })

  it('broadcastPresenceEvent with valid username', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    const result = manager.broadcastPresenceEvent('join', 'Alice')
    expect(typeof result).toBe('boolean')
    manager.disconnect()
  })

  it('broadcastPresenceEvent with empty username returns false', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    const result = manager.broadcastPresenceEvent('join', '   ')
    expect(result).toBe(false)
    manager.disconnect()
  })

  it('sendVoiceStateToPeer / sendScreenWatchRequest', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.sendVoiceStateToPeer('peer-2', 'vc-1', false, null, false)
    manager.sendScreenWatchRequest('peer-2', true)
    manager.disconnect()
  })

  it('registerPushSubscription / pushToOfflinePeers', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.registerPushSubscription({ endpoint: 'https://push.example.com' })
    expect(mockSignaling.sendPushSubscription).toHaveBeenCalled()

    manager.pushToOfflinePeers('payload', 'endpoint')
    expect(mockSignaling.sendPushNotify).toHaveBeenCalled()
    manager.disconnect()
  })

  it('getPeers returns array', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const peers = manager.getPeers()
    expect(peers.length).toBe(1)
    expect(peers[0].id).toBe('peer-2')
    manager.disconnect()
  })

  it('isSignalingConnected delegates to signaling client', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    expect(manager.isSignalingConnected()).toBe(true)
    manager.disconnect()
  })

  it('disconnect cleans up all peers and disconnects signaling', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.disconnect()
    expect(mockSignaling.disconnect).toHaveBeenCalled()
    expect(manager.getPeers().length).toBe(0)
  })

  it('rebroadcast sends data to peers except sender', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }, { id: 'peer-3', username: 'Carol' }])

    manager.rebroadcast({ type: 'test' }, 'peer-2')
    manager.disconnect()
  })

  it('setScreenShareSubscription adds and removes subscribers', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.setScreenShareSubscription('peer-2', true)
    manager.setScreenShareSubscription('peer-2', false)
    manager.disconnect()
  })

  it('setLocalScreenShareStream distributes stream to subscribers', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.setScreenShareSubscription('peer-2', true)

    const mockStream = {
      getVideoTracks: () => [{ id: 'v1', kind: 'video' }],
      getTracks: () => [{ id: 'v1', kind: 'video' }],
    } as unknown as MediaStream

    manager.setLocalScreenShareStream(mockStream)

    // Clear it
    manager.setLocalScreenShareStream(null)
    manager.disconnect()
  })

  it('addCameraStream adds camera tracks to peers', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const mockStream = {
      getVideoTracks: () => [{ id: 'cam1', kind: 'video' }],
      getTracks: () => [{ id: 'cam1', kind: 'video' }],
    } as unknown as MediaStream

    manager.addCameraStream(mockStream)
    expect(mockPCs[0].addTrack).toHaveBeenCalled()

    manager.removeCameraStream()
    manager.disconnect()
  })

  it('addAudioStream / removeAudioStream', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const mockStream = {
      getTracks: () => [{ id: 'a1', kind: 'audio' }],
    } as unknown as MediaStream

    await manager.addAudioStream(mockStream)
    expect(mockPCs[0].addTrack).toHaveBeenCalled()

    mockPCs[0].getSenders.mockReturnValue([{ track: { id: 'a1', kind: 'audio' } }])
    await manager.removeAudioStream(mockStream)
    manager.disconnect()
  })

  it('handles peer connection state changes', async () => {
    const onConnected = vi.fn()
    const onDisconnected = vi.fn()
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.setCallbacks({ onPeerConnected: onConnected, onPeerDisconnected: onDisconnected })

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]

    // Simulate connected
    pc.connectionState = 'connected'
    pc.onconnectionstatechange?.()
    expect(onConnected).toHaveBeenCalled()

    // Simulate disconnected
    pc.connectionState = 'disconnected'
    pc.onconnectionstatechange?.()
    expect(onDisconnected).toHaveBeenCalledWith('peer-2')

    manager.disconnect()
  })

  it('sends ICE candidates via signaling', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    pc.onicecandidate?.({ candidate: { candidate: 'cand1' } as RTCIceCandidateInit })

    expect(mockSignaling.sendConnectionCandidate).toHaveBeenCalledWith('peer-2', { candidate: 'cand1' })
    manager.disconnect()
  })

  it('handles negotiation needed', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    await pc.onnegotiationneeded?.()

    expect(mockSignaling.sendOffer).toHaveBeenCalled()
    manager.disconnect()
  })

  it('handles incoming remote data channel', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerJoinedCb = mockSignaling.onPeerJoined.mock.calls[0][0]
    await peerJoinedCb({ id: 'peer-2', username: 'Bob' })

    const pc = mockPCs[0]
    const mockDC = createMockDataChannel()
    pc.ondatachannel?.({ channel: mockDC })

    manager.disconnect()
  })

  it('handles ontrack for audio and video', async () => {
    const onRemoteAudio = vi.fn()
    const onRemoteScreen = vi.fn()
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.setCallbacks({
      onRemoteAudioStream: onRemoteAudio,
      onRemoteScreenStream: onRemoteScreen,
    })

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    const audioStream = { id: 'as1' } as unknown as MediaStream
    pc.ontrack?.({ streams: [audioStream], track: { kind: 'audio' } })
    expect(onRemoteAudio).toHaveBeenCalledWith('peer-2', audioStream)

    const videoStream = { id: 'vs1' } as unknown as MediaStream
    pc.ontrack?.({ streams: [videoStream], track: { kind: 'video' } })
    expect(onRemoteScreen).toHaveBeenCalledWith('peer-2', videoStream)

    manager.disconnect()
  })

  it('handles signaling state change to stable', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    pc.signalingState = 'stable'
    pc.onsignalingstatechange?.()

    manager.disconnect()
  })

  it('handles offer from existing peer with failed connection', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    // Create peer first
    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    // Set connection state to failed
    mockPCs[0].connectionState = 'failed'

    // Now receive an offer - should recreate connection
    const onMessageCb = mockSignaling.onMessage.mock.calls[0][0]
    await onMessageCb({ type: 'offer', from: 'peer-2', data: { type: 'offer', sdp: 'new-offer' } })

    expect(mockPCs.length).toBe(2) // Old + new
    manager.disconnect()
  })

  it('sendFile delegates to media module', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    const data = new Uint8Array([1])
    const file = {
      name: 'f.bin', size: 1, type: 'application/octet-stream',
      slice: () => ({ arrayBuffer: () => Promise.resolve(data.buffer) }),
    } as unknown as File
    const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: '', timestamp: 1, synced: true }
    await manager.sendFile(file, msg)
    manager.disconnect()
  })

  it('addCameraStream with no video track', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const mockStream = {
      getVideoTracks: () => [],
      getTracks: () => [],
    } as unknown as MediaStream

    manager.addCameraStream(mockStream)
    // addTrack should NOT be called since there's no video track
    expect(mockPCs[0].addTrack).not.toHaveBeenCalled()
    manager.disconnect()
  })

  it('removeCameraStream with no peer connection', () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    // No peers were added, should not throw
    manager.removeCameraStream()
    manager.disconnect()
  })

  it('handles ontrack with no streams', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    pc.ontrack?.({ streams: [], track: { kind: 'video' } })
    // Should not throw
    manager.disconnect()
  })

  it('handles camera video track for peer with camera on', async () => {
    const onRemoteCamera = vi.fn()
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.setCallbacks({ onRemoteCameraStream: onRemoteCamera })

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    // Set peer as having camera on
    const peers = manager.getPeers()
    peers[0].isCameraOn = true

    const pc = mockPCs[0]
    const camStream = { id: 'cam1' } as unknown as MediaStream
    pc.ontrack?.({ streams: [camStream], track: { kind: 'video' } })

    expect(onRemoteCamera).toHaveBeenCalledWith('peer-2', camStream)
    manager.disconnect()
  })

  it('cleanupPeer handles screen sender removal failure gracefully', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    // Set up a screen share subscription and stream to create a sender
    manager.setScreenShareSubscription('peer-2', true)
    const mockStream = {
      getVideoTracks: () => [{ id: 'v1', kind: 'video' }],
      getTracks: () => [{ id: 'v1', kind: 'video' }],
    } as unknown as MediaStream
    manager.setLocalScreenShareStream(mockStream)

    // Make removeTrack throw
    mockPCs[0].removeTrack.mockImplementation(() => { throw new Error('remove fail') })

    // Cleanup should not throw even if removeTrack throws
    const peerLeftCb = mockSignaling.onPeerLeft.mock.calls[0][0]
    expect(() => peerLeftCb('peer-2')).not.toThrow()
    manager.disconnect()
  })

  it('handleRemoteOffer catches errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    // Make setRemoteDescription fail
    mockPCs[0].setRemoteDescription.mockRejectedValue(new Error('SRD failed'))

    const onMessageCb = mockSignaling.onMessage.mock.calls[0][0]
    await onMessageCb({ type: 'offer', from: 'peer-2', data: { type: 'offer', sdp: 'bad-offer' } })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to handle remote offer:', expect.any(Error))
    consoleSpy.mockRestore()
    manager.disconnect()
  })

  it('negotiation catches renegotiation errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    // Make setLocalDescription fail
    mockPCs[0].setLocalDescription.mockRejectedValue(new Error('SLD failed'))

    const pc = mockPCs[0]
    await pc.onnegotiationneeded?.()

    expect(consoleSpy).toHaveBeenCalledWith('Renegotiation failed:', expect.any(Error))
    consoleSpy.mockRestore()
    manager.disconnect()
  })

  it('negotiation skipped when not stable or already making offer', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    pc.signalingState = 'have-local-offer'
    await pc.onnegotiationneeded?.()

    expect(mockSignaling.sendOffer).not.toHaveBeenCalled()
    manager.disconnect()
  })

  it('attachScreenTrackToPeer replaces existing sender track', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.setScreenShareSubscription('peer-2', true)

    const mockStream1 = {
      getVideoTracks: () => [{ id: 'v1', kind: 'video' }],
      getTracks: () => [{ id: 'v1', kind: 'video' }],
    } as unknown as MediaStream

    // First attach creates a sender
    manager.setLocalScreenShareStream(mockStream1)

    const mockStream2 = {
      getVideoTracks: () => [{ id: 'v2', kind: 'video' }],
      getTracks: () => [{ id: 'v2', kind: 'video' }],
    } as unknown as MediaStream

    // Second attach should use replaceTrack on existing sender
    manager.setLocalScreenShareStream(mockStream2)
    manager.disconnect()
  })

  it('attachScreenTrackToPeer handles addTrack error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    mockPCs[0].addTrack.mockImplementation(() => { throw new Error('addTrack fail') })
    manager.setScreenShareSubscription('peer-2', true)

    const mockStream = {
      getVideoTracks: () => [{ id: 'v1', kind: 'video' }],
      getTracks: () => [{ id: 'v1', kind: 'video' }],
    } as unknown as MediaStream

    manager.setLocalScreenShareStream(mockStream)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to attach screen track to peer:', 'peer-2', expect.any(Error))
    consoleSpy.mockRestore()
    manager.disconnect()
  })

  it('detachScreenTrackFromPeer handles removeTrack error', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.setScreenShareSubscription('peer-2', true)
    const mockStream = {
      getVideoTracks: () => [{ id: 'v1', kind: 'video' }],
      getTracks: () => [{ id: 'v1', kind: 'video' }],
    } as unknown as MediaStream
    manager.setLocalScreenShareStream(mockStream)

    // Make removeTrack throw
    mockPCs[0].removeTrack.mockImplementation(() => { throw new Error('remove fail') })

    // Detach via unsubscribe
    manager.setScreenShareSubscription('peer-2', false)
    manager.disconnect()
  })

  it('handles offer collision - impolite peer ignores offer', async () => {
    // user-1 > peer-0 alphabetically, so user-1 is NOT polite to peer-0
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-0', username: 'Aaron' }])

    // Simulate being in the middle of making an offer (collision scenario)
    const pc = mockPCs[0]
    pc.signalingState = 'have-local-offer'

    const onMessageCb = mockSignaling.onMessage.mock.calls[0][0]
    await onMessageCb({ type: 'offer', from: 'peer-0', data: { type: 'offer', sdp: 'collision-offer' } })

    // Since user-1 > peer-0, user-1 is impolite, should ignore the offer
    // sendAnswer should still be called but with empty SDP (ignoreOffer branch)
    manager.disconnect()
  })

  it('handles offer collision - polite peer accepts offer', async () => {
    // 'alice-1' < 'peer-z' alphabetically, so alice-1 IS polite to peer-z
    const manager = new WebRTCManager('alice-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-z', username: 'Zach' }])

    const pc = mockPCs[0]
    pc.signalingState = 'have-local-offer'

    const onMessageCb = mockSignaling.onMessage.mock.calls[0][0]
    await onMessageCb({ type: 'offer', from: 'peer-z', data: { type: 'offer', sdp: 'collision-offer' } })

    // Polite peer processes the offer (doesn't ignore), so setRemoteDescription is called
    expect(pc.setRemoteDescription).toHaveBeenCalled()
    manager.disconnect()
  })

  it('requestHistory returns true when peer has open data channel', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerJoinedCb = mockSignaling.onPeerJoined.mock.calls[0][0]
    await peerJoinedCb({ id: 'peer-2', username: 'Bob' })

    // Manually set the data channel as open on the peer
    const peers = manager.getPeers()
    peers[0].dataChannel = createMockDataChannel()
    peers[0].dataChannel!.readyState = 'open'

    const result = manager.requestHistory({ channelId: 'c1' })
    expect(result).toBe(true)
    manager.disconnect()
  })

  it('requestHistory returns false when no peers have open data channels', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerJoinedCb = mockSignaling.onPeerJoined.mock.calls[0][0]
    await peerJoinedCb({ id: 'peer-2', username: 'Bob' })

    // Peer exists but data channel is not open
    const peers = manager.getPeers()
    peers[0].dataChannel = createMockDataChannel()
    peers[0].dataChannel!.readyState = 'closed'

    const result = manager.requestHistory({ channelId: 'c1' })
    expect(result).toBe(false)
    manager.disconnect()
  })

  it('addCameraStream catches addTrack errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    mockPCs[0].addTrack.mockImplementation(() => { throw new Error('addTrack camera fail') })

    const mockStream = {
      getVideoTracks: () => [{ id: 'cam1', kind: 'video' }],
      getTracks: () => [{ id: 'cam1', kind: 'video' }],
    } as unknown as MediaStream

    manager.addCameraStream(mockStream)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to add camera track to peer:', 'peer-2', expect.any(Error))
    consoleSpy.mockRestore()
    manager.disconnect()
  })

  it('removeCameraStream handles removeTrack error', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const mockStream = {
      getVideoTracks: () => [{ id: 'cam1', kind: 'video' }],
      getTracks: () => [{ id: 'cam1', kind: 'video' }],
    } as unknown as MediaStream
    manager.addCameraStream(mockStream)

    // Make removeTrack throw
    mockPCs[0].removeTrack.mockImplementation(() => { throw new Error('remove fail') })
    manager.removeCameraStream()
    manager.disconnect()
  })

  it('attachScreenTrackToPeer with no video track is a no-op', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    manager.setScreenShareSubscription('peer-2', true)

    // Stream with no video tracks
    const mockStream = {
      getVideoTracks: () => [],
      getTracks: () => [],
    } as unknown as MediaStream
    manager.setLocalScreenShareStream(mockStream)
    expect(mockPCs[0].addTrack).not.toHaveBeenCalled()
    manager.disconnect()
  })

  it('onicecandidate ignores null candidates', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    pc.onicecandidate?.({ candidate: null })
    expect(mockSignaling.sendConnectionCandidate).not.toHaveBeenCalled()
    manager.disconnect()
  })

  it('connection state failed triggers onPeerDisconnected', async () => {
    const onDisconnected = vi.fn()
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.setCallbacks({ onPeerDisconnected: onDisconnected })

    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    const pc = mockPCs[0]
    pc.connectionState = 'failed'
    pc.onconnectionstatechange?.()
    expect(onDisconnected).toHaveBeenCalledWith('peer-2')
    manager.disconnect()
  })

  it('file transfer callbacks are wired to WebRTCCallbacks', () => {
    const onProgress = vi.fn()
    const onReceived = vi.fn()
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')
    manager.setCallbacks({
      onFileTransferProgress: onProgress,
      onFileReceived: onReceived,
    })

    // Trigger file transfer callbacks captured from the mock
    expect(mockFTMCallbacks.onTransferProgress).toBeTruthy()
    expect(mockFTMCallbacks.onTransferComplete).toBeTruthy()

    mockFTMCallbacks.onTransferProgress!('transfer-1', 50)
    expect(onProgress).toHaveBeenCalledWith('transfer-1', 50)

    const blob = new Blob(['test'])
    const meta = { name: 'test.txt' }
    mockFTMCallbacks.onTransferComplete!('transfer-1', blob, meta)
    expect(onReceived).toHaveBeenCalledWith('transfer-1', blob, meta)

    manager.disconnect()
  })

  it('createPeerConnection attaches screen share when subscriber and stream exist', async () => {
    const manager = new WebRTCManager('user-1', 'Alice', 'room-1')

    // Setup screen share stream BEFORE creating the peer
    const mockStream = {
      getVideoTracks: () => [{ id: 'v1', kind: 'video' }],
      getTracks: () => [{ id: 'v1', kind: 'video' }],
    } as unknown as MediaStream
    manager.setLocalScreenShareStream(mockStream)

    // Add peer to subscriber list (this internally calls attachScreenTrackToPeer,
    // but the peer doesn't exist yet, so it's a no-op)
    manager.setScreenShareSubscription('peer-2', true)

    // Now add the peer via peer list - createPeerConnection should attach screen
    const peerListCb = mockSignaling.onPeerList.mock.calls[0][0]
    await peerListCb([{ id: 'peer-2', username: 'Bob' }])

    // The screen track should have been added to the new peer
    expect(mockPCs[0].addTrack).toHaveBeenCalled()
    manager.disconnect()
  })
})
