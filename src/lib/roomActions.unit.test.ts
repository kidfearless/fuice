import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the db module
vi.mock('./db', () => ({
  saveRoom: vi.fn().mockResolvedValue(undefined),
  getRoom: vi.fn().mockResolvedValue(undefined),
  saveChannel: vi.fn().mockResolvedValue(undefined),
  getMessagesByChannel: vi.fn().mockResolvedValue([]),
  getRoomHistory: vi.fn().mockResolvedValue(undefined),
  getAllRoomHistory: vi.fn().mockResolvedValue([]),
  saveRoomHistory: vi.fn().mockResolvedValue(undefined),
}))

// Mock crypto module
vi.mock('./crypto', () => ({
  generateRoomKey: vi.fn().mockResolvedValue('mock-room-key-base64'),
  saveRoomKey: vi.fn().mockResolvedValue(undefined),
}))

import { upsertRoomHistory, createNewRoom, loadRoomForJoin } from './roomActions'
import { saveRoom, getRoom, saveChannel, getMessagesByChannel, getRoomHistory, getAllRoomHistory, saveRoomHistory } from './db'
import { generateRoomKey, saveRoomKey } from './crypto'

describe('roomActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('upsertRoomHistory', () => {
    it('creates new history entry when none exists', async () => {
      vi.mocked(getRoomHistory).mockResolvedValue(undefined)
      vi.mocked(getAllRoomHistory).mockResolvedValue([])

      await upsertRoomHistory('room1', 'Test Room')

      expect(saveRoomHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'room1',
          roomName: 'Test Room',
          order: 1,
        }),
      )
    })

    it('updates existing history entry preserving order', async () => {
      vi.mocked(getRoomHistory).mockResolvedValue({
        roomId: 'room1',
        roomName: 'Old Name',
        lastAccessed: 100,
        createdAt: 50,
        order: 3,
      })

      await upsertRoomHistory('room1', 'Test Room', 'ch1')

      expect(saveRoomHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'room1',
          roomName: 'Test Room',
          order: 3,
          lastChannelId: 'ch1',
          createdAt: 50,
        }),
      )
    })

    it('calculates order from existing history', async () => {
      vi.mocked(getRoomHistory).mockResolvedValue(undefined)
      vi.mocked(getAllRoomHistory).mockResolvedValue([
        { roomId: 'r1', roomName: 'A', lastAccessed: 1, createdAt: 1, order: 5 },
        { roomId: 'r2', roomName: 'B', lastAccessed: 2, createdAt: 2, order: 3 },
      ])

      await upsertRoomHistory('room2', 'New Room')

      expect(saveRoomHistory).toHaveBeenCalledWith(
        expect.objectContaining({ order: 6 }), // max(5, 3) + 1
      )
    })
  })

  describe('createNewRoom', () => {
    it('creates a room with default channels and encryption key', async () => {
      const result = await createNewRoom('My Room')

      expect(result.room).toBeDefined()
      expect(result.room.name).toBe('My Room')
      expect(result.channels).toHaveLength(2)
      expect(result.channels[0].type).toBe('text')
      expect(result.channels[0].name).toBe('general')
      expect(result.channels[1].type).toBe('voice')
      expect(result.channels[1].name).toBe('Voice Chat')
      expect(result.defaultChannel.type).toBe('text')
      expect(result.roomKey).toBe('mock-room-key-base64')

      expect(saveRoom).toHaveBeenCalled()
      expect(saveChannel).toHaveBeenCalledTimes(2)
      expect(generateRoomKey).toHaveBeenCalled()
      expect(saveRoomKey).toHaveBeenCalled()
      expect(saveRoomHistory).toHaveBeenCalled()
    })
  })

  describe('loadRoomForJoin', () => {
    it('creates a new room when none exists', async () => {
      vi.mocked(getRoom).mockResolvedValue(undefined)

      const result = await loadRoomForJoin('ABC123')

      expect(result.room.id).toBe('ABC123')
      expect(result.room.name).toBe('Room ABC123')
      expect(saveRoom).toHaveBeenCalled()
    })

    it('loads existing room with channels', async () => {
      const existingRoom = {
        id: 'ABC123',
        name: 'Existing Room',
        channels: [
          { id: 'ch1', name: 'general', type: 'text' as const, createdAt: 1 },
          { id: 'ch2', name: 'voice', type: 'voice' as const, createdAt: 2 },
        ],
        createdAt: 100,
      }
      vi.mocked(getRoom).mockResolvedValue(existingRoom)
      vi.mocked(getRoomHistory).mockResolvedValue(undefined)

      const result = await loadRoomForJoin('ABC123')

      expect(result.room.name).toBe('Existing Room')
      expect(result.channels).toHaveLength(2)
      expect(result.channelToSelect).toEqual(existingRoom.channels[0])
    })

    it('restores last channel from history', async () => {
      const channels = [
        { id: 'ch1', name: 'general', type: 'text' as const, createdAt: 1 },
        { id: 'ch2', name: 'random', type: 'text' as const, createdAt: 2 },
      ]
      vi.mocked(getRoom).mockResolvedValue({
        id: 'ABC123',
        name: 'Room',
        channels,
        createdAt: 100,
      })
      vi.mocked(getRoomHistory).mockResolvedValue({
        roomId: 'ABC123',
        roomName: 'Room',
        lastAccessed: 200,
        createdAt: 100,
        order: 1,
        lastChannelId: 'ch2',
      })

      const result = await loadRoomForJoin('ABC123')
      expect(result.channelToSelect!.id).toBe('ch2')
    })

    it('loads messages for text channel', async () => {
      const channels = [
        { id: 'ch1', name: 'general', type: 'text' as const, createdAt: 1 },
      ]
      vi.mocked(getRoom).mockResolvedValue({
        id: 'ABC123',
        name: 'Room',
        channels,
        createdAt: 100,
      })
      vi.mocked(getMessagesByChannel).mockResolvedValue([
        { id: 'm1', channelId: 'ch1', userId: 'u1', username: 'A', content: 'hi', timestamp: 1, synced: true },
      ])

      const result = await loadRoomForJoin('ABC123')
      expect(result.messages).toHaveLength(1)
    })

    it('returns empty messages for voice channel', async () => {
      const channels = [
        { id: 'ch1', name: 'voice', type: 'voice' as const, createdAt: 1 },
      ]
      vi.mocked(getRoom).mockResolvedValue({
        id: 'ABC123',
        name: 'Room',
        channels,
        createdAt: 100,
      })

      const result = await loadRoomForJoin('ABC123')
      expect(result.messages).toHaveLength(0)
    })

    it('handles room with no channels', async () => {
      vi.mocked(getRoom).mockResolvedValue({
        id: 'ABC123',
        name: 'Empty Room',
        channels: [],
        createdAt: 100,
      })

      const result = await loadRoomForJoin('ABC123')
      expect(result.channels).toHaveLength(0)
      expect(result.channelToSelect).toBeNull()
      expect(result.messages).toHaveLength(0)
    })
  })
})
