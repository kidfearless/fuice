import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSync } from './useSync'
import type { Channel, Message, Room } from '@/lib/types'

vi.mock('@/lib/db', () => ({
  getMessagesByChannel: vi.fn().mockResolvedValue([]),
  saveChannel: vi.fn().mockResolvedValue(undefined),
  saveMessage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/notifications', () => ({
  notifyIncomingMessage: vi.fn(),
}))

vi.mock('@/lib/crypto', () => ({
  encryptText: vi.fn(async (text: string) => `enc:${text}`),
  decryptText: vi.fn(async (text: string) => text.startsWith('enc:') ? text.slice(4) : null),
}))

import { getMessagesByChannel, saveMessage } from '@/lib/db'
import { notifyIncomingMessage } from '@/lib/notifications'

function makeSyncOptions(overrides: Record<string, unknown> = {}) {
  return {
    currentRoomRef: { current: { id: 'room-1', name: 'Test Room', createdAt: 1000 } as Room },
    channelsRef: { current: [{ id: 'ch-1', name: 'general', type: 'text', createdAt: 1 }] as Channel[] },
    currentChannelRef: { current: { id: 'ch-1', name: 'general', type: 'text', createdAt: 1 } as Channel },
    currentUserIdRef: { current: 'u1' },
    roomKeyRef: { current: null as string | null },
    setCurrentRoom: vi.fn(),
    setChannels: vi.fn(),
    setCurrentChannel: vi.fn(),
    setMessages: vi.fn(),
    ...overrides,
  }
}

function makeManager() {
  return {
    sendSyncResponse: vi.fn(),
    sendSyncHello: vi.fn(),
    sendHistoryResponse: vi.fn(),
    requestHistory: vi.fn().mockReturnValue(true),
  }
}

function makeMessage(id: string, channelId = 'ch-1'): Message {
  return {
    id,
    channelId,
    userId: 'u1',
    username: 'Alice',
    content: `msg-${id}`,
    timestamp: Date.now(),
    synced: true,
  }
}

describe('useSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handleSyncRequested sends sync response', async () => {
    const msgs = [makeMessage('m1')]
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce(msgs)

    const opts = makeSyncOptions()
    const manager = makeManager()
    const { result } = renderHook(() => useSync(opts))

    await act(async () => {
      await result.current.handleSyncRequested(manager as unknown, 'peer-1')
    })

    expect(manager.sendSyncResponse).toHaveBeenCalledWith('peer-1', expect.objectContaining({
      channels: opts.channelsRef.current,
      messages: msgs,
    }))
  })

  it('handleSyncRequested encrypts messages when key is set', async () => {
    const msgs = [makeMessage('m1')]
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce(msgs)

    const opts = makeSyncOptions({ roomKeyRef: { current: 'secret-key' } })
    const manager = makeManager()
    const { result } = renderHook(() => useSync(opts))

    await act(async () => {
      await result.current.handleSyncRequested(manager as unknown, 'peer-1')
    })

    const call = manager.sendSyncResponse.mock.calls[0][1]
    expect(call.messages[0].content).toBe('enc:msg-m1')
  })

  it('handleDataChannelReady sends sync hello', async () => {
    const msgs = [makeMessage('m1'), makeMessage('m2')]
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce(msgs)

    const opts = makeSyncOptions()
    const manager = makeManager()
    const { result } = renderHook(() => useSync(opts))

    await act(async () => {
      await result.current.handleDataChannelReady(manager as unknown, 'peer-1')
    })

    expect(manager.sendSyncHello).toHaveBeenCalledWith('peer-1', expect.objectContaining({
      lastMessageId: 'm2',
      knownMessageIds: ['m1', 'm2'],
      knownChannelIds: ['ch-1'],
    }))
  })

  it('handleSyncHello sends diff of missing messages', async () => {
    const msgs = [makeMessage('m1'), makeMessage('m2'), makeMessage('m3')]
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce(msgs)

    const opts = makeSyncOptions()
    const manager = makeManager()
    const { result } = renderHook(() => useSync(opts))

    const peerHello = {
      lastMessageId: 'm1',
      knownMessageIds: ['m1'],
      knownChannelIds: ['ch-1'],
      roomCreatedAt: 1000,
    }

    await act(async () => {
      await result.current.handleSyncHello(manager as unknown, 'peer-1', peerHello)
    })

    const call = manager.sendSyncResponse.mock.calls[0][1]
    expect(call.messages.length).toBe(2) // m2, m3
  })

  it('handleSyncReceived merges channels and messages', async () => {
    const opts = makeSyncOptions()
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { result } = renderHook(() => useSync(opts))

    const payload = {
      room: { id: 'room-1', name: 'New Name', channels: [] },
      channels: [{ id: 'ch-2', name: 'random', type: 'text' as const, createdAt: 2 }],
      messages: [makeMessage('m-remote', 'ch-1')],
    }

    await act(async () => {
      await result.current.handleSyncReceived(payload)
    })

    expect(opts.setCurrentRoom).toHaveBeenCalled()
    expect(opts.setChannels).toHaveBeenCalled()
    expect(saveMessage).toHaveBeenCalled()
  })

  it('handleSyncReceived decrypts messages when key is set', async () => {
    const opts = makeSyncOptions({ roomKeyRef: { current: 'key' } })
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { result } = renderHook(() => useSync(opts))

    const payload = {
      room: null,
      channels: [],
      messages: [{ ...makeMessage('m1'), content: 'enc:hello' }],
    }

    await act(async () => {
      await result.current.handleSyncReceived(payload)
    })

    expect(saveMessage).toHaveBeenCalledWith(expect.objectContaining({ content: 'hello' }))
  })

  it('handleRemoteMessage saves and notifies', async () => {
    const opts = makeSyncOptions()
    const { result } = renderHook(() => useSync(opts))

    const msg = makeMessage('m-remote')
    await act(async () => {
      await result.current.handleRemoteMessage(msg)
    })

    expect(saveMessage).toHaveBeenCalledWith(msg)
    expect(notifyIncomingMessage).toHaveBeenCalled()
  })

  it('handleRemoteMessage decrypts when key is set', async () => {
    const opts = makeSyncOptions({ roomKeyRef: { current: 'key' } })
    const { result } = renderHook(() => useSync(opts))

    const msg = { ...makeMessage('m-enc'), content: 'enc:secret' }
    await act(async () => {
      await result.current.handleRemoteMessage(msg)
    })

    expect(saveMessage).toHaveBeenCalledWith(expect.objectContaining({ content: 'secret' }))
  })

  it('handleRemoteMessage deduplicates', async () => {
    const opts = makeSyncOptions()
    const { result } = renderHook(() => useSync(opts))

    await act(async () => {
      await result.current.handleRemoteMessage(makeMessage('m1'))
    })

    // The updater should return the same array (not add duplicate)
    const updater = (opts.setMessages as ReturnType<typeof vi.fn>).mock.calls[0][0]
    if (typeof updater === 'function') {
      const existing = [makeMessage('m1')]
      expect(updater(existing)).toBe(existing)
    }
  })

  it('handleHistoryRequested sends paginated response', async () => {
    const msgs = Array.from({ length: 5 }, (_, i) => makeMessage(`m${i}`))
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce(msgs)

    const opts = makeSyncOptions()
    const manager = makeManager()
    const { result } = renderHook(() => useSync(opts))

    await act(async () => {
      await result.current.handleHistoryRequested(manager as unknown, 'peer-1', {
        requestId: 'req-1',
        channelId: 'ch-1',
        beforeMessageId: null,
        limit: 3,
      })
    })

    expect(manager.sendHistoryResponse).toHaveBeenCalledWith('peer-1', expect.objectContaining({
      requestId: 'req-1',
      messages: expect.any(Array),
      hasMore: true,
    }))
  })

  it('handleHistoryReceived merges messages and resolves pending request', async () => {
    const opts = makeSyncOptions()
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { result } = renderHook(() => useSync(opts))

    const response = {
      requestId: 'any-id',
      channelId: 'ch-1',
      messages: [makeMessage('m-old')],
      hasMore: false,
    }

    await act(async () => {
      await result.current.handleHistoryReceived(response)
    })

    expect(saveMessage).toHaveBeenCalled()
  })

  it('requestOlderMessages resolves 0 when requestHistory returns false', async () => {
    const opts = makeSyncOptions()
    const manager = makeManager()
    manager.requestHistory.mockReturnValue(false)
    const { result } = renderHook(() => useSync(opts))

    let count = -1
    await act(async () => {
      count = await result.current.requestOlderMessages(manager as unknown, 'ch-1', null)
    })

    expect(count).toBe(0)
  })

  it('requestOlderMessages calls requestHistory', async () => {
    const opts = makeSyncOptions()
    const manager = makeManager()
    manager.requestHistory.mockReturnValue(true)
    const { result } = renderHook(() => useSync(opts))

    // Don't await since we don't have a response handler completing it
    // Just verify it calls requestHistory
    act(() => {
      result.current.requestOlderMessages(manager as unknown, 'ch-1', 'm5')
    })

    expect(manager.requestHistory).toHaveBeenCalledWith(expect.objectContaining({
      channelId: 'ch-1',
      beforeMessageId: 'm5',
    }))
  })

  it('handleHistoryRequested encrypts when key is set', async () => {
    const msgs = [makeMessage('m1')]
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce(msgs)

    const opts = makeSyncOptions({ roomKeyRef: { current: 'key' } })
    const manager = makeManager()
    const { result } = renderHook(() => useSync(opts))

    await act(async () => {
      await result.current.handleHistoryRequested(manager as unknown, 'peer-1', {
        requestId: 'req-1',
        channelId: 'ch-1',
        beforeMessageId: null,
        limit: 100,
      })
    })

    const response = manager.sendHistoryResponse.mock.calls[0][1]
    expect(response.messages[0].content).toBe('enc:msg-m1')
  })

  it('handleSyncReceived does not override named room', async () => {
    const opts = makeSyncOptions()
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { result } = renderHook(() => useSync(opts))

    await act(async () => {
      await result.current.handleSyncReceived({
        room: { id: 'room-1', name: 'Incoming Name', channels: [] },
        channels: [],
        messages: [],
      })
    })

    // setCurrentRoom is called with an updater function
    expect(opts.setCurrentRoom).toHaveBeenCalled()
    // Verify the updater preserves named rooms
    const updater = (opts.setCurrentRoom as ReturnType<typeof vi.fn>).mock.calls[0][0]
    if (typeof updater === 'function') {
      const existing = { id: 'room-1', name: 'My Room', channels: [] }
      expect(updater(existing)).toBe(existing)
    }
  })

  it('handleRemoteMessage skips message for different channel', async () => {
    const opts = makeSyncOptions()
    const { result } = renderHook(() => useSync(opts))

    const msg = makeMessage('m-other', 'ch-other')
    await act(async () => {
      await result.current.handleRemoteMessage(msg)
    })

    // setMessages is called with an updater
    expect(opts.setMessages).toHaveBeenCalled()
    const updater = (opts.setMessages as ReturnType<typeof vi.fn>).mock.calls[0][0]
    if (typeof updater === 'function') {
      const prev: Message[] = []
      expect(updater(prev)).toBe(prev) // unchanged
    }
  })
})
