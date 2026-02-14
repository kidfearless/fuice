import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChannels } from './useChannels'

vi.mock('@/lib/db', () => ({
  getMessagesByChannel: vi.fn().mockResolvedValue([]),
  saveChannel: vi.fn().mockResolvedValue(undefined),
  getRoomHistory: vi.fn().mockResolvedValue(null),
  getAllRoomHistory: vi.fn().mockResolvedValue([]),
  saveRoomHistory: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/helpers', () => ({
  generateChannelId: vi.fn(() => 'ch-test-1'),
}))

import { getMessagesByChannel, saveChannel, getRoomHistory, getAllRoomHistory, saveRoomHistory } from '@/lib/db'
import { generateChannelId } from '@/lib/helpers'

describe('useChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(generateChannelId as ReturnType<typeof vi.fn>).mockReturnValue('ch-test-1')
  })

  it('starts with empty state', () => {
    const { result } = renderHook(() => useChannels())
    expect(result.current.channels).toEqual([])
    expect(result.current.currentChannel).toBeNull()
    expect(result.current.messages).toEqual([])
  })

  it('createChannel adds a new channel', async () => {
    const mockManager = { broadcastChannel: vi.fn() }
    const { result } = renderHook(() => useChannels())

    await act(async () => {
      await result.current.createChannel('general', 'text', 'room-1', mockManager as unknown)
    })

    expect(saveChannel).toHaveBeenCalledWith(expect.objectContaining({ id: 'ch-test-1', name: 'general', type: 'text' }))
    expect(result.current.channels).toHaveLength(1)
    expect(result.current.channels[0].name).toBe('general')
    expect(mockManager.broadcastChannel).toHaveBeenCalled()
  })

  it('createChannel does nothing without roomId', async () => {
    const { result } = renderHook(() => useChannels())
    await act(async () => {
      await result.current.createChannel('test', 'text', null, null)
    })
    expect(result.current.channels).toHaveLength(0)
  })

  it('selectChannel sets currentChannel and loads messages', async () => {
    const msgs = [{ id: 'm1', channelId: 'ch-1', content: 'hello', userId: 'u1', username: 'Alice', timestamp: 1 }]
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce(msgs)

    const { result } = renderHook(() => useChannels())
    // Add a channel first
    act(() => {
      result.current.setChannels([{ id: 'ch-1', name: 'general', type: 'text', createdAt: 1 }])
    })

    await act(async () => {
      await result.current.selectChannel('ch-1', 'room-1', 'My Room')
    })

    expect(result.current.currentChannel?.id).toBe('ch-1')
    expect(result.current.messages).toEqual(msgs)
    expect(saveRoomHistory).toHaveBeenCalled()
  })

  it('selectChannel does nothing for unknown channel', async () => {
    const { result } = renderHook(() => useChannels())
    await act(async () => {
      await result.current.selectChannel('nonexistent')
    })
    expect(result.current.currentChannel).toBeNull()
  })

  it('selectChannel updates existing room history order', async () => {
    const existingHistory = { roomId: 'r1', roomName: 'R', lastAccessed: 1, createdAt: 100, order: 5 }
    ;(getRoomHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existingHistory)

    const { result } = renderHook(() => useChannels())
    act(() => {
      result.current.setChannels([{ id: 'ch-1', name: 'general', type: 'text', createdAt: 1 }])
    })

    await act(async () => {
      await result.current.selectChannel('ch-1', 'r1', 'R')
    })

    expect(saveRoomHistory).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'r1', order: 5, createdAt: 100 })
    )
  })

  it('selectChannel assigns new order for new room history', async () => {
    ;(getRoomHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    ;(getAllRoomHistory as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { order: 3 }, { order: 7 },
    ])

    const { result } = renderHook(() => useChannels())
    act(() => {
      result.current.setChannels([{ id: 'ch-1', name: 'general', type: 'text', createdAt: 1 }])
    })

    await act(async () => {
      await result.current.selectChannel('ch-1', 'r1', 'R')
    })

    expect(saveRoomHistory).toHaveBeenCalledWith(
      expect.objectContaining({ order: 8 })
    )
  })

  it('handleChannelReceived adds new channel', async () => {
    const { result } = renderHook(() => useChannels())
    const channel = { id: 'ch-2', name: 'random', type: 'text' as const, createdAt: 1 }

    await act(async () => {
      await result.current.handleChannelReceived(channel)
    })

    expect(result.current.channels).toHaveLength(1)
    expect(saveChannel).toHaveBeenCalledWith(channel)
  })

  it('handleChannelReceived does not duplicate channels', async () => {
    const { result } = renderHook(() => useChannels())
    const channel = { id: 'ch-2', name: 'random', type: 'text' as const, createdAt: 1 }

    await act(async () => {
      await result.current.handleChannelReceived(channel)
    })
    await act(async () => {
      await result.current.handleChannelReceived(channel)
    })

    expect(result.current.channels).toHaveLength(1)
  })

  it('handleChannelReceived auto-selects first text channel when none selected', async () => {
    ;(getMessagesByChannel as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
    const { result } = renderHook(() => useChannels())
    const channel = { id: 'ch-new', name: 'general', type: 'text' as const, createdAt: 1 }

    await act(async () => {
      await result.current.handleChannelReceived(channel)
    })

    // The channel should be auto-selected
    expect(result.current.currentChannel?.id).toBe('ch-new')
  })
})
