import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  generateRoomKey,
  encryptText,
  decryptText,
  buildShareUrl,
  extractKeyFromFragment,
  saveRoomKey,
  getRoomKey,
  deleteRoomKey,
} from './crypto'

describe('crypto', () => {
  describe('generateRoomKey', () => {
    it('generates a base64url-encoded key string', async () => {
      const key = await generateRoomKey()
      expect(key).toBeTruthy()
      // Base64url: only [A-Za-z0-9_-]
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('generates different keys each time', async () => {
      const key1 = await generateRoomKey()
      const key2 = await generateRoomKey()
      expect(key1).not.toBe(key2)
    })
  })

  describe('encryptText / decryptText', () => {
    it('encrypts and decrypts text round-trip', async () => {
      const key = await generateRoomKey()
      const plaintext = 'Hello, world!'
      const encrypted = await encryptText(plaintext, key)
      expect(encrypted).toContain(':') // format is iv:ciphertext
      expect(encrypted).not.toBe(plaintext)

      const decrypted = await decryptText(encrypted, key)
      expect(decrypted).toBe(plaintext)
    })

    it('handles empty string', async () => {
      const key = await generateRoomKey()
      const encrypted = await encryptText('', key)
      const decrypted = await decryptText(encrypted, key)
      expect(decrypted).toBe('')
    })

    it('handles unicode text', async () => {
      const key = await generateRoomKey()
      const text = '🎉 Ñoño café 日本語'
      const encrypted = await encryptText(text, key)
      const decrypted = await decryptText(encrypted, key)
      expect(decrypted).toBe(text)
    })

    it('returns null for wrong key', async () => {
      const key1 = await generateRoomKey()
      const key2 = await generateRoomKey()
      const encrypted = await encryptText('secret', key1)
      const decrypted = await decryptText(encrypted, key2)
      expect(decrypted).toBeNull()
    })

    it('returns null for malformed encrypted text (no colon)', async () => {
      const key = await generateRoomKey()
      const decrypted = await decryptText('nocolonhere', key)
      expect(decrypted).toBeNull()
    })

    it('returns null for empty parts', async () => {
      const key = await generateRoomKey()
      const decrypted = await decryptText(':', key)
      expect(decrypted).toBeNull()
    })
  })

  describe('buildShareUrl', () => {
    it('builds a URL with room ID and encryption key in fragment', () => {
      const url = buildShareUrl('ROOM123', 'myKey_abc-123')
      expect(url).toContain('?join=ROOM123')
      expect(url).toContain('#ek=myKey_abc-123')
    })
  })

  describe('extractKeyFromFragment', () => {
    it('extracts key from hash fragment', () => {
      window.location.hash = '#ek=testKey123'
      expect(extractKeyFromFragment()).toBe('testKey123')
    })

    it('returns null when no hash', () => {
      window.location.hash = ''
      expect(extractKeyFromFragment()).toBeNull()
    })

    it('returns null when hash has no ek param', () => {
      window.location.hash = '#other=value'
      expect(extractKeyFromFragment()).toBeNull()
    })

    it('extracts key when ek is not the first param', () => {
      window.location.hash = '#foo=bar&ek=myKey'
      expect(extractKeyFromFragment()).toBe('myKey')
    })
  })

  describe('saveRoomKey / getRoomKey / deleteRoomKey (IndexedDB)', () => {
    // Mock IndexedDB since jsdom doesn't provide it
    let mockStore: Map<string, { roomId: string; key: string }>

    function createIndexedDBMock(opts?: { triggerUpgrade?: boolean }) {
      mockStore = new Map()
      const storeNames = new Set<string>(opts?.triggerUpgrade ? [] : [
        'messages', 'channels', 'rooms', 'users', 'roomHistory', 'files', 'roomKeys',
      ])

      const mockObjectStore = {
        put: vi.fn((value: { roomId: string; key: string }) => {
          mockStore.set(value.roomId, value)
          return { onsuccess: null, onerror: null }
        }),
        get: vi.fn((key: string) => {
          const result = mockStore.get(key)
          const req = { result, onsuccess: null as (() => void) | null, onerror: null }
          setTimeout(() => req.onsuccess?.(), 0)
          return req
        }),
        delete: vi.fn((key: string) => {
          mockStore.delete(key)
          return { onsuccess: null, onerror: null }
        }),
        createIndex: vi.fn(),
      }

      const mockTx = {
        objectStore: vi.fn(() => mockObjectStore),
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
      }

      const mockDB = {
        transaction: vi.fn((_store: string, _mode?: string) => {
          const tx = { ...mockTx, oncomplete: null as (() => void) | null, onerror: null as (() => void) | null }
          setTimeout(() => tx.oncomplete?.(), 0)
          return tx
        }),
        close: vi.fn(),
        objectStoreNames: { contains: vi.fn((name: string) => storeNames.has(name)) },
        createObjectStore: vi.fn((name: string) => {
          storeNames.add(name)
          return { createIndex: vi.fn() }
        }),
      }

      const mockRequest = {
        result: mockDB,
        onupgradeneeded: null as ((e: unknown) => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: null,
      }

      globalThis.indexedDB = {
        open: vi.fn(() => {
          setTimeout(() => {
            if (opts?.triggerUpgrade && mockRequest.onupgradeneeded) {
              mockRequest.onupgradeneeded({ target: mockRequest })
            }
            mockRequest.onsuccess?.()
          }, 0)
          return mockRequest
        }),
      } as unknown as IDBFactory

      return { mockDB, mockRequest }
    }

    beforeEach(() => {
      createIndexedDBMock()
    })

    it('saves and retrieves a room key', async () => {
      const key = await generateRoomKey()
      await saveRoomKey('test-room-1', key)
      const retrieved = await getRoomKey('test-room-1')
      expect(retrieved).toBe(key)
    })

    it('returns null for non-existent room key', async () => {
      const result = await getRoomKey('nonexistent-room')
      expect(result).toBeNull()
    })

    it('deletes a room key', async () => {
      const key = await generateRoomKey()
      await saveRoomKey('test-room-delete', key)
      await deleteRoomKey('test-room-delete')
      const result = await getRoomKey('test-room-delete')
      expect(result).toBeNull()
    })

    it('overwrites existing key', async () => {
      const key1 = await generateRoomKey()
      const key2 = await generateRoomKey()
      await saveRoomKey('test-room-overwrite', key1)
      await saveRoomKey('test-room-overwrite', key2)
      const result = await getRoomKey('test-room-overwrite')
      expect(result).toBe(key2)
    })

    it('creates all object stores during upgrade', async () => {
      const { mockDB } = createIndexedDBMock({ triggerUpgrade: true })
      await saveRoomKey('upgrade-room', 'upgrade-key')
      // onupgradeneeded should have triggered createObjectStore for all stores
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('messages', { keyPath: 'id' })
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('channels', { keyPath: 'id' })
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('rooms', { keyPath: 'id' })
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('users', { keyPath: 'id' })
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('roomHistory', { keyPath: 'roomId' })
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('files', { keyPath: 'id' })
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('roomKeys', { keyPath: 'roomId' })
    })

    it('handles DB open error', async () => {
      const mockRequest = {
        result: null as unknown,
        onupgradeneeded: null as ((e: unknown) => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: new Error('DB open failed'),
      }
      globalThis.indexedDB = {
        open: vi.fn(() => {
          setTimeout(() => mockRequest.onerror?.(), 0)
          return mockRequest
        }),
      } as unknown as IDBFactory
      await expect(saveRoomKey('fail-room', 'key')).rejects.toThrow()
    })
  })
})
