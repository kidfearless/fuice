import { describe, expect, it, vi, beforeEach } from 'vitest'

// We need to mock idb before importing db.ts
vi.mock('idb', () => {
  const store = new Map<string, Map<string, unknown>>()

  const createStore = (name: string) => {
    if (!store.has(name)) store.set(name, new Map())
    return store.get(name)!
  }

  const mockDB = {
    put: vi.fn(async (storeName: string, value: Record<string, unknown>) => {
      const s = createStore(storeName)
      const key = (value as Record<string, string>).id ?? (value as Record<string, string>).roomId
      s.set(key, value)
    }),
    get: vi.fn(async (storeName: string, key: string) => {
      return createStore(storeName).get(key)
    }),
    getAll: vi.fn(async (storeName: string) => {
      return Array.from(createStore(storeName).values())
    }),
    getAllFromIndex: vi.fn(async (storeName: string, _indexName: string, key: string) => {
      return Array.from(createStore(storeName).values()).filter((v: unknown) => {
        const val = v as Record<string, unknown>
        return val.channelId === key || val.transferId === key
      })
    }),
    delete: vi.fn(async (storeName: string, key: string) => {
      createStore(storeName).delete(key)
    }),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(false),
    },
    createObjectStore: vi.fn((_name: string) => ({
      createIndex: vi.fn(),
    })),
    _store: store,
    _reset: () => store.clear(),
  }

  return {
    openDB: vi.fn(async (_name: string, _version: number, options?: { upgrade?: (db: unknown, oldVersion: number) => void }) => {
      // Call upgrade callback to exercise the upgrade path
      if (options?.upgrade) {
        options.upgrade(mockDB, 0)
      }
      return mockDB
    }),
    __mockDB: mockDB,
  }
})

import {
  getDB,
  saveMessage,
  getMessagesByChannel,
  getAllMessages,
  saveChannel,
  getAllChannels,
  saveRoom,
  getRoom,
  saveUser,
  getUser,
  saveRoomHistory,
  getAllRoomHistory,
  getRoomHistory,
  deleteRoomHistory,
  updateRoomOrder,
  saveFile,
  getFile,
  getFileByTransferId,
  deleteFile,
  getFileUrl,
} from './db'
import type { Message, Channel, Room, User, RoomHistory } from './types'
import type { StoredFile } from './db'

describe('db', () => {
  beforeEach(async () => {
    // Reset the mock store
    const { __mockDB } = await import('idb') as unknown as { __mockDB: { _reset: () => void } }
    __mockDB._reset()
  })

  it('getDB returns a database instance', async () => {
    const db = await getDB()
    expect(db).toBeDefined()
  })

  describe('messages', () => {
    it('saves and retrieves a message', async () => {
      const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: 'hi', timestamp: 1, synced: true }
      await saveMessage(msg)
      const all = await getAllMessages()
      expect(all.length).toBeGreaterThanOrEqual(1)
    })

    it('gets messages by channel', async () => {
      const msg: Message = { id: 'm2', channelId: 'c2', userId: 'u1', username: 'A', content: 'test', timestamp: 2, synced: true }
      await saveMessage(msg)
      const result = await getMessagesByChannel('c2')
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('channels', () => {
    it('saves and retrieves channels', async () => {
      const ch: Channel = { id: 'ch1', name: 'general', type: 'text', createdAt: 1 }
      await saveChannel(ch)
      const all = await getAllChannels()
      expect(all.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('rooms', () => {
    it('saves and retrieves a room', async () => {
      const room: Room = { id: 'r1', name: 'Room 1', channels: [], createdAt: 1 }
      await saveRoom(room)
      const r = await getRoom('r1')
      expect(r).toBeDefined()
    })

    it('returns undefined for non-existent room', async () => {
      const r = await getRoom('nonexistent')
      expect(r).toBeUndefined()
    })
  })

  describe('users', () => {
    it('saves and retrieves a user', async () => {
      const user: User = { id: 'u1', username: 'Alice', color: 'red' }
      await saveUser(user)
      const u = await getUser('u1')
      expect(u).toBeDefined()
    })
  })

  describe('roomHistory', () => {
    it('saves, retrieves, and deletes room history', async () => {
      const rh: RoomHistory = { roomId: 'r1', roomName: 'Room 1', lastAccessed: 100, createdAt: 50, order: 1 }
      await saveRoomHistory(rh)
      
      const h = await getRoomHistory('r1')
      expect(h).toBeDefined()

      const all = await getAllRoomHistory()
      expect(all.length).toBeGreaterThanOrEqual(1)

      await deleteRoomHistory('r1')
      const deleted = await getRoomHistory('r1')
      expect(deleted).toBeUndefined()
    })

    it('sorts by order', async () => {
      await saveRoomHistory({ roomId: 'r2', roomName: 'B', lastAccessed: 200, createdAt: 50, order: 2 })
      await saveRoomHistory({ roomId: 'r1', roomName: 'A', lastAccessed: 100, createdAt: 50, order: 1 })
      const all = await getAllRoomHistory()
      // Should be sorted by order
      expect(all[0].order).toBeLessThanOrEqual(all[all.length - 1].order)
    })

    it('updateRoomOrder puts all rooms', async () => {
      const rooms: RoomHistory[] = [
        { roomId: 'r1', roomName: 'A', lastAccessed: 1, createdAt: 1, order: 0 },
        { roomId: 'r2', roomName: 'B', lastAccessed: 2, createdAt: 2, order: 1 },
      ]
      await updateRoomOrder(rooms)
      const r1 = await getRoomHistory('r1')
      expect(r1).toBeDefined()
    })
  })

  describe('files', () => {
    it('saves and gets a file', async () => {
      const file: StoredFile = {
        id: 'f1',
        transferId: 'tf-1',
        name: 'test.txt',
        size: 10,
        type: 'text/plain',
        blob: new Blob(['hello']),
        isPreview: false,
        storedAt: Date.now(),
      }
      await saveFile(file)
      const f = await getFile('f1')
      expect(f).toBeDefined()
    })

    it('gets file by transfer ID', async () => {
      const file: StoredFile = {
        id: 'f2',
        transferId: 'tf-2',
        name: 'test2.txt',
        size: 10,
        type: 'text/plain',
        blob: new Blob(['hello']),
        isPreview: false,
        storedAt: Date.now(),
      }
      await saveFile(file)
      const f = await getFileByTransferId('tf-2')
      expect(f).toBeDefined()
    })

    it('deletes a file', async () => {
      const file: StoredFile = {
        id: 'f3',
        transferId: 'tf-3',
        name: 'test3.txt',
        size: 10,
        type: 'text/plain',
        blob: new Blob(['test']),
        isPreview: false,
        storedAt: Date.now(),
      }
      await saveFile(file)
      await deleteFile('f3')
      const f = await getFile('f3')
      expect(f).toBeUndefined()
    })

    it('getFileUrl returns URL for existing file', async () => {
      const file: StoredFile = {
        id: 'f4',
        transferId: 'tf-4',
        name: 'test4.txt',
        size: 5,
        type: 'text/plain',
        blob: new Blob(['hello']),
        isPreview: false,
        storedAt: Date.now(),
      }
      await saveFile(file)
      const url = await getFileUrl('f4')
      expect(url).toBeDefined()
      expect(typeof url).toBe('string')
    })

    it('getFileUrl returns undefined for non-existent file', async () => {
      const url = await getFileUrl('nonexistent')
      expect(url).toBeUndefined()
    })

    it('getFileUrl returns undefined and logs error on failure', async () => {
      // Save a file with a blob that will cause URL.createObjectURL to fail
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const origCreate = URL.createObjectURL
      URL.createObjectURL = () => { throw new Error('blob error') }

      const file: StoredFile = {
        id: 'f-err',
        transferId: 'tf-err',
        name: 'bad.txt',
        size: 5,
        type: 'text/plain',
        blob: new Blob(['x']),
        isPreview: false,
        storedAt: Date.now(),
      }
      await saveFile(file)
      const url = await getFileUrl('f-err')
      expect(url).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()

      URL.createObjectURL = origCreate
      consoleSpy.mockRestore()
    })

    it('getFileUrl returns undefined when file has no blob', async () => {
      const file: StoredFile = {
        id: 'f-noblob',
        transferId: 'tf-noblob',
        name: 'noblob.txt',
        size: 0,
        type: 'text/plain',
        blob: null as unknown as Blob,
        isPreview: false,
        storedAt: Date.now(),
      }
      await saveFile(file)
      const url = await getFileUrl('f-noblob')
      expect(url).toBeUndefined()
    })
  })
})
