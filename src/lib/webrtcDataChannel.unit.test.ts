import { describe, expect, it, vi } from 'vitest'
import { handleDataMessage, setupDataChannel } from './webrtcDataChannel'
import { FileTransferManager } from './fileTransfer'
import type { Peer, Message, Channel, ReactionEvent } from './types'
import type { WebRTCCallbacks, SyncPayload, HistoryRequest, HistoryResponse } from './webrtcTypes'

function makePeer(id: string): Peer {
  return {
    id,
    username: `User-${id}`,
    connected: true,
  }
}

describe('handleDataMessage', () => {
  let peer: Peer
  let peers: Map<string, Peer>
  let cb: WebRTCCallbacks
  let ftm: FileTransferManager

  beforeEach(() => {
    peer = makePeer('p1')
    peers = new Map([['p1', peer]])
    cb = {}
    ftm = new FileTransferManager()
  })

  it('handles user-info message', () => {
    cb.onPeerUserInfo = vi.fn()
    handleDataMessage({ type: 'user-info', username: 'Bob' }, peer, peers, cb, ftm)
    expect(cb.onPeerUserInfo).toHaveBeenCalledWith('p1', 'Bob')
    expect(peer.username).toBe('Bob')
  })

  it('ignores user-info without username', () => {
    cb.onPeerUserInfo = vi.fn()
    handleDataMessage({ type: 'user-info' }, peer, peers, cb, ftm)
    expect(cb.onPeerUserInfo).not.toHaveBeenCalled()
  })

  it('handles message type', () => {
    cb.onMessageReceived = vi.fn()
    const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: 'hi', timestamp: 1, synced: true }
    handleDataMessage({ type: 'message', message: msg }, peer, peers, cb, ftm)
    expect(cb.onMessageReceived).toHaveBeenCalledWith(msg)
  })

  it('handles file-metadata', () => {
    const initSpy = vi.spyOn(ftm, 'initializeTransfer')
    const meta = { name: 'f.txt', size: 10, type: 'text/plain', chunks: 1, transferId: 'tf-1' }
    handleDataMessage({ type: 'file-metadata', metadata: meta }, peer, peers, cb, ftm)
    expect(initSpy).toHaveBeenCalledWith(meta)
  })

  it('handles sync-request', () => {
    cb.onSyncRequested = vi.fn()
    handleDataMessage({ type: 'sync-request' }, peer, peers, cb, ftm)
    expect(cb.onSyncRequested).toHaveBeenCalledWith('p1')
  })

  it('handles sync-response', () => {
    cb.onSyncReceived = vi.fn()
    const payload: SyncPayload = { room: null, channels: [], messages: [] }
    handleDataMessage({ type: 'sync-response', payload }, peer, peers, cb, ftm)
    expect(cb.onSyncReceived).toHaveBeenCalledWith(payload)
  })

  it('handles sync-hello', () => {
    cb.onSyncHello = vi.fn()
    handleDataMessage({
      type: 'sync-hello',
      lastMessageId: 'lm1',
      knownMessageIds: ['m1'],
      knownChannelIds: ['c1'],
      roomCreatedAt: 100,
    }, peer, peers, cb, ftm)
    expect(cb.onSyncHello).toHaveBeenCalledWith('p1', {
      lastMessageId: 'lm1',
      knownMessageIds: ['m1'],
      knownChannelIds: ['c1'],
      roomCreatedAt: 100,
    })
  })

  it('handles sync-hello with missing fields', () => {
    cb.onSyncHello = vi.fn()
    handleDataMessage({ type: 'sync-hello' }, peer, peers, cb, ftm)
    expect(cb.onSyncHello).toHaveBeenCalledWith('p1', {
      lastMessageId: null,
      knownMessageIds: [],
      knownChannelIds: [],
      roomCreatedAt: 0,
    })
  })

  it('handles history-request', () => {
    cb.onHistoryRequested = vi.fn()
    const request: HistoryRequest = { requestId: 'r1', channelId: 'c1', beforeMessageId: null, limit: 50 }
    handleDataMessage({ type: 'history-request', request }, peer, peers, cb, ftm)
    expect(cb.onHistoryRequested).toHaveBeenCalledWith('p1', request)
  })

  it('handles history-response', () => {
    cb.onHistoryReceived = vi.fn()
    const response: HistoryResponse = { requestId: 'r1', channelId: 'c1', messages: [], hasMore: false }
    handleDataMessage({ type: 'history-response', response }, peer, peers, cb, ftm)
    expect(cb.onHistoryReceived).toHaveBeenCalledWith('p1', response)
  })

  it('handles room-key-request', () => {
    cb.onRoomKeyRequested = vi.fn()
    handleDataMessage({ type: 'room-key-request', requesterUsername: 'Alice' }, peer, peers, cb, ftm)
    expect(cb.onRoomKeyRequested).toHaveBeenCalledWith('p1', 'Alice')
  })

  it('handles room-key-request with no username (falls back)', () => {
    cb.onRoomKeyRequested = vi.fn()
    peer.username = 'Bob'
    handleDataMessage({ type: 'room-key-request' }, peer, peers, cb, ftm)
    expect(cb.onRoomKeyRequested).toHaveBeenCalledWith('p1', 'Bob')
  })

  it('handles room-key-share', () => {
    cb.onRoomKeyShared = vi.fn()
    handleDataMessage({ type: 'room-key-share', roomKey: 'key123', sharedByUsername: 'Alice' }, peer, peers, cb, ftm)
    expect(cb.onRoomKeyShared).toHaveBeenCalledWith('p1', 'key123', 'Alice')
  })

  it('handles room-key-share without sharedByUsername', () => {
    cb.onRoomKeyShared = vi.fn()
    peer.username = 'Carol'
    handleDataMessage({ type: 'room-key-share', roomKey: 'key123' }, peer, peers, cb, ftm)
    expect(cb.onRoomKeyShared).toHaveBeenCalledWith('p1', 'key123', 'Carol')
  })

  it('ignores room-key-share without roomKey', () => {
    cb.onRoomKeyShared = vi.fn()
    handleDataMessage({ type: 'room-key-share' }, peer, peers, cb, ftm)
    expect(cb.onRoomKeyShared).not.toHaveBeenCalled()
  })

  it('handles presence-event join', () => {
    cb.onPresenceEvent = vi.fn()
    handleDataMessage({ type: 'presence-event', event: { action: 'join', username: 'Alice' } }, peer, peers, cb, ftm)
    expect(cb.onPresenceEvent).toHaveBeenCalledWith('p1', { action: 'join', username: 'Alice' })
  })

  it('handles presence-event leave', () => {
    cb.onPresenceEvent = vi.fn()
    handleDataMessage({ type: 'presence-event', event: { action: 'leave', username: 'Bob' } }, peer, peers, cb, ftm)
    expect(cb.onPresenceEvent).toHaveBeenCalledWith('p1', { action: 'leave', username: 'Bob' })
  })

  it('ignores invalid presence-event', () => {
    cb.onPresenceEvent = vi.fn()
    handleDataMessage({ type: 'presence-event', event: { action: 'invalid', username: 'A' } }, peer, peers, cb, ftm)
    expect(cb.onPresenceEvent).not.toHaveBeenCalled()
  })

  it('ignores presence-event with no event object', () => {
    cb.onPresenceEvent = vi.fn()
    handleDataMessage({ type: 'presence-event' }, peer, peers, cb, ftm)
    expect(cb.onPresenceEvent).not.toHaveBeenCalled()
  })

  it('handles channel-created', () => {
    cb.onChannelReceived = vi.fn()
    const ch: Channel = { id: 'ch1', name: 'general', type: 'text', createdAt: 1 }
    handleDataMessage({ type: 'channel-created', channel: ch }, peer, peers, cb, ftm)
    expect(cb.onChannelReceived).toHaveBeenCalledWith(ch)
  })

  it('handles voice-state', () => {
    cb.onVoiceStateChanged = vi.fn()
    handleDataMessage({ type: 'voice-state', voiceChannelId: 'vc1' }, peer, peers, cb, ftm)
    expect(cb.onVoiceStateChanged).toHaveBeenCalledWith('p1', 'vc1')
    expect(peer.voiceChannelId).toBe('vc1')
  })

  it('handles voice-state with null', () => {
    cb.onVoiceStateChanged = vi.fn()
    handleDataMessage({ type: 'voice-state', voiceChannelId: null }, peer, peers, cb, ftm)
    expect(cb.onVoiceStateChanged).toHaveBeenCalledWith('p1', null)
  })

  it('handles speaking-state', () => {
    cb.onPeerSpeaking = vi.fn()
    handleDataMessage({ type: 'speaking-state', speaking: true }, peer, peers, cb, ftm)
    expect(cb.onPeerSpeaking).toHaveBeenCalledWith('p1', true)
    expect(peer.isSpeaking).toBe(true)
  })

  it('ignores speaking-state without boolean', () => {
    cb.onPeerSpeaking = vi.fn()
    handleDataMessage({ type: 'speaking-state', speaking: 'yes' }, peer, peers, cb, ftm)
    expect(cb.onPeerSpeaking).not.toHaveBeenCalled()
  })

  it('handles screen-share-state with channel', () => {
    cb.onScreenShareStateChanged = vi.fn()
    handleDataMessage({ type: 'screen-share-state', voiceChannelId: 'vc1' }, peer, peers, cb, ftm)
    expect(cb.onScreenShareStateChanged).toHaveBeenCalledWith('p1', 'vc1')
    expect(peer.isScreenSharing).toBe(true)
    expect(peer.screenShareChannelId).toBe('vc1')
  })

  it('handles screen-share-state with null', () => {
    cb.onScreenShareStateChanged = vi.fn()
    handleDataMessage({ type: 'screen-share-state', voiceChannelId: null }, peer, peers, cb, ftm)
    expect(peer.isScreenSharing).toBe(false)
  })

  it('handles camera-state on', () => {
    cb.onCameraStateChanged = vi.fn()
    handleDataMessage({ type: 'camera-state', cameraOn: true }, peer, peers, cb, ftm)
    expect(cb.onCameraStateChanged).toHaveBeenCalledWith('p1', true)
    expect(peer.isCameraOn).toBe(true)
  })

  it('ignores camera-state without boolean', () => {
    cb.onCameraStateChanged = vi.fn()
    handleDataMessage({ type: 'camera-state', cameraOn: 'yes' }, peer, peers, cb, ftm)
    expect(cb.onCameraStateChanged).not.toHaveBeenCalled()
  })

  it('handles screen-watch', () => {
    cb.onScreenWatchRequested = vi.fn()
    handleDataMessage({ type: 'screen-watch', watch: true }, peer, peers, cb, ftm)
    expect(cb.onScreenWatchRequested).toHaveBeenCalledWith('p1', true)
  })

  it('ignores screen-watch without boolean', () => {
    cb.onScreenWatchRequested = vi.fn()
    handleDataMessage({ type: 'screen-watch', watch: 'yes' }, peer, peers, cb, ftm)
    expect(cb.onScreenWatchRequested).not.toHaveBeenCalled()
  })

  it('handles reaction', () => {
    cb.onReactionReceived = vi.fn()
    const reaction: ReactionEvent = { messageId: 'm1', emoji: '🎉', userId: 'u1', username: 'A', action: 'add' }
    handleDataMessage({ type: 'reaction', reaction }, peer, peers, cb, ftm)
    expect(cb.onReactionReceived).toHaveBeenCalledWith('p1', reaction)
  })

  it('handles unknown type gracefully', () => {
    // Should not throw
    handleDataMessage({ type: 'unknown-future-type' }, peer, peers, cb, ftm)
  })

  it('handles empty type', () => {
    handleDataMessage({}, peer, peers, cb, ftm)
  })
})

describe('setupDataChannel', () => {
  it('sets up data channel event handlers', () => {
    const peer = makePeer('p1')
    const sent: string[] = []
    const dc = {
      readyState: 'open' as RTCDataChannelState,
      binaryType: '' as BinaryType,
      onopen: null as ((ev: Event) => void) | null,
      onmessage: null as ((ev: MessageEvent) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      send: (data: string) => { sent.push(data) },
    } as unknown as RTCDataChannel

    const cb: WebRTCCallbacks = { onDataChannelReady: vi.fn() }
    const ftm = new FileTransferManager()

    setupDataChannel(peer, dc, 'Alice', 'u1', new Map([['p1', peer]]), cb, ftm)

    expect(peer.dataChannel).toBe(dc)
    expect(dc.binaryType).toBe('arraybuffer')
    expect(dc.onopen).not.toBeNull()
    expect(dc.onmessage).not.toBeNull()
    expect(dc.onerror).not.toBeNull()
  })

  it('sends user-info on open and schedules onDataChannelReady', async () => {
    vi.useFakeTimers()
    const peer = makePeer('p1')
    const sent: string[] = []
    const dc = {
      readyState: 'open' as RTCDataChannelState,
      binaryType: '' as BinaryType,
      onopen: null as ((ev: Event) => void) | null,
      onmessage: null as ((ev: MessageEvent) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      send: (data: string) => { sent.push(data) },
    } as unknown as RTCDataChannel

    const cb: WebRTCCallbacks = { onDataChannelReady: vi.fn() }
    const ftm = new FileTransferManager()

    setupDataChannel(peer, dc, 'Alice', 'u1', new Map([['p1', peer]]), cb, ftm)
    dc.onopen!(new Event('open'))

    // Should have sent user-info
    expect(sent.length).toBe(1)
    const userInfo = JSON.parse(sent[0])
    expect(userInfo.type).toBe('user-info')
    expect(userInfo.username).toBe('Alice')

    // After 300ms, onDataChannelReady should be called
    await vi.advanceTimersByTimeAsync(300)
    expect(cb.onDataChannelReady).toHaveBeenCalledWith('p1')
    vi.useRealTimers()
  })

  it('handles binary ArrayBuffer messages (file chunks)', () => {
    const peer = makePeer('p1')
    const dc = {
      readyState: 'open' as RTCDataChannelState,
      binaryType: '' as BinaryType,
      onopen: null as ((ev: Event) => void) | null,
      onmessage: null as ((ev: MessageEvent) => void) | null,
      onerror: null as ((ev: Event) => void) | null,
      send: vi.fn(),
    } as unknown as RTCDataChannel

    const ftm = new FileTransferManager()
    const receiveSpy = vi.spyOn(ftm, 'receiveChunk')
    ftm.initializeTransfer({ name: 'f.txt', size: 10, type: 'text/plain', chunks: 1, transferId: 'tf-1' })

    setupDataChannel(peer, dc, 'Alice', 'u1', new Map([['p1', peer]]), {}, ftm)

    // First send file-chunk-meta
    dc.onmessage!(new MessageEvent('message', {
      data: JSON.stringify({ type: 'file-chunk-meta', transferId: 'tf-1', chunkIndex: 0 }),
    }))

    // Then send the binary data
    dc.onmessage!(new MessageEvent('message', {
      data: new ArrayBuffer(10),
    }))

    expect(receiveSpy).toHaveBeenCalledWith('tf-1', 0, expect.any(ArrayBuffer))
  })

  it('handles JSON parse errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const peer = makePeer('p1')
    const dc = {
      readyState: 'open',
      binaryType: '',
      onopen: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
    } as unknown as RTCDataChannel

    setupDataChannel(peer, dc, 'Alice', 'u1', new Map(), {}, new FileTransferManager())
    dc.onmessage!(new MessageEvent('message', { data: 'bad-json' }))
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('ignores binary data with no pending chunk meta', () => {
    const peer = makePeer('p1')
    const dc = {
      readyState: 'open',
      binaryType: '',
      onopen: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
    } as unknown as RTCDataChannel

    const ftm = new FileTransferManager()
    const receiveSpy = vi.spyOn(ftm, 'receiveChunk')

    setupDataChannel(peer, dc, 'Alice', 'u1', new Map(), {}, ftm)
    dc.onmessage!(new MessageEvent('message', { data: new ArrayBuffer(10) }))
    expect(receiveSpy).not.toHaveBeenCalled()
  })

  it('logs data channel errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const peer = makePeer('p1')
    const dc = {
      readyState: 'open',
      binaryType: '',
      onopen: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
    } as unknown as RTCDataChannel

    setupDataChannel(peer, dc, 'Alice', 'u1', new Map(), {}, new FileTransferManager())
    dc.onerror!(new Event('error'))
    expect(consoleSpy).toHaveBeenCalledWith('Data channel error:', expect.any(Event))
    consoleSpy.mockRestore()
  })

  it('handles file-chunk-meta with invalid fields', () => {
    const peer = makePeer('p1')
    const dc = {
      readyState: 'open',
      binaryType: '',
      onopen: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
    } as unknown as RTCDataChannel

    const ftm = new FileTransferManager()
    setupDataChannel(peer, dc, 'Alice', 'u1', new Map(), {}, ftm)

    // Send file-chunk-meta with missing fields
    dc.onmessage!(new MessageEvent('message', {
      data: JSON.stringify({ type: 'file-chunk-meta' }),
    }))

    // Then send binary - should not crash since no pending chunk meta was stored
    const receiveSpy = vi.spyOn(ftm, 'receiveChunk')
    dc.onmessage!(new MessageEvent('message', { data: new ArrayBuffer(5) }))
    expect(receiveSpy).not.toHaveBeenCalled()
  })

  it('routes regular JSON objects through handleDataMessage', () => {
    const peer = makePeer('p1')
    const dc = {
      readyState: 'open',
      binaryType: '',
      onopen: null,
      onmessage: null as ((ev: MessageEvent) => void) | null,
      onerror: null,
      send: vi.fn(),
    } as unknown as RTCDataChannel

    const cb: WebRTCCallbacks = { onMessageReceived: vi.fn() }
    setupDataChannel(peer, dc, 'Alice', 'u1', new Map([['p1', peer]]), cb, new FileTransferManager())

    // Send a regular message (not file-chunk-meta) through onmessage
    const msg = { id: '1', text: 'hello', sender: 'Bob', timestamp: 1234, roomId: 'r1', channelId: 'c1' }
    dc.onmessage!(new MessageEvent('message', {
      data: JSON.stringify({ type: 'message', message: msg }),
    }))

    expect(cb.onMessageReceived).toHaveBeenCalledWith(msg)
  })

  it('does not fire onDataChannelReady if channel closes before timeout', async () => {
    vi.useFakeTimers()
    const peer = makePeer('p1')
    const dc = {
      readyState: 'open' as string,
      binaryType: '',
      onopen: null as (() => void) | null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
    } as unknown as RTCDataChannel

    const cb: WebRTCCallbacks = { onDataChannelReady: vi.fn() }
    setupDataChannel(peer, dc, 'Alice', 'u1', new Map(), cb, new FileTransferManager())
    dc.onopen!(new Event('open'))

    // Close the channel before timeout fires
    ;(dc as unknown as { readyState: string }).readyState = 'closed'
    await vi.advanceTimersByTimeAsync(300)
    expect(cb.onDataChannelReady).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
