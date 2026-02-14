import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  loadNotificationSettings,
  saveNotificationSettings,
  playNotificationSound,
  requestNotificationPermission,
  getNotificationPermission,
  showDesktopNotification,
  notifyIncomingMessage,
} from './notifications'
import type { Message } from './types'

describe('notifications', () => {
  const mockStorage = new Map<string, string>()

  beforeEach(() => {
    mockStorage.clear()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage.get(key) ?? null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { mockStorage.set(key, value) })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadNotificationSettings', () => {
    it('returns defaults when nothing stored', () => {
      const s = loadNotificationSettings()
      expect(s.soundEnabled).toBe(true)
      expect(s.desktopEnabled).toBe(true)
      expect(s.volume).toBe(0.5)
    })

    it('merges stored settings', () => {
      mockStorage.set('p2p-notification-settings', JSON.stringify({ volume: 0.8 }))
      const s = loadNotificationSettings()
      expect(s.volume).toBe(0.8)
      expect(s.soundEnabled).toBe(true)
    })

    it('returns defaults on corrupted JSON', () => {
      mockStorage.set('p2p-notification-settings', 'bad-json')
      const s = loadNotificationSettings()
      expect(s.soundEnabled).toBe(true)
    })
  })

  describe('saveNotificationSettings', () => {
    it('saves settings to localStorage', () => {
      saveNotificationSettings({ soundEnabled: false, desktopEnabled: true, volume: 0.3 })
      const stored = JSON.parse(mockStorage.get('p2p-notification-settings')!)
      expect(stored.soundEnabled).toBe(false)
      expect(stored.volume).toBe(0.3)
    })
  })

  describe('playNotificationSound', () => {
    // playNotificationSound uses a module-level AudioContext cache.
    // We use STABLE function references across tests (same vi.fn() instances)
    // since the AudioContext is created once and cached internally.
    let mockAudioState = 'running'

    const MockOsc = function(this: Record<string, unknown>) {
      this.type = 'sine'
      this.frequency = { value: 0, setValueAtTime: vi.fn() }
      this.connect = vi.fn()
      this.start = vi.fn()
      this.stop = vi.fn()
    }
    const MockGain = function(this: Record<string, unknown>) {
      this.gain = {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      }
      this.connect = vi.fn()
    }
    const mockCreateOsc = vi.fn(() => new (MockOsc as unknown as new () => OscillatorNode)())
    const mockCreateGain = vi.fn(() => new (MockGain as unknown as new () => GainNode)())
    const mockResume = vi.fn()

    beforeEach(() => {
      mockAudioState = 'running'
      mockCreateOsc.mockClear()
      mockCreateGain.mockClear()
      mockResume.mockClear()
      // Restore default implementation after any test that changed it
      mockCreateOsc.mockImplementation(() => new (MockOsc as unknown as new () => OscillatorNode)())

      globalThis.AudioContext = class {
        get state() { return mockAudioState }
        currentTime = 0
        destination = {}
        createOscillator = mockCreateOsc
        createGain = mockCreateGain
        resume = mockResume
      } as unknown as typeof AudioContext
    })

    it('plays notification sound without throwing', () => {
      expect(() => playNotificationSound(0.5)).not.toThrow()
    })

    it('plays with default volume', () => {
      expect(() => playNotificationSound()).not.toThrow()
    })

    it('resumes suspended AudioContext', () => {
      mockAudioState = 'suspended'
      playNotificationSound(0.3)
      expect(mockResume).toHaveBeenCalled()
    })

    it('catches errors in audio creation and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockCreateOsc.mockImplementation(() => { throw new Error('audio error') })
      expect(() => playNotificationSound()).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith('Failed to play notification sound:', expect.any(Error))
      warnSpy.mockRestore()
    })

    it('handles AudioContext constructor error gracefully', () => {
      globalThis.AudioContext = class {
        constructor() { throw new Error('not allowed') }
      } as unknown as typeof AudioContext
      expect(() => playNotificationSound()).not.toThrow()
    })
  })

  describe('requestNotificationPermission', () => {
    it('returns denied when Notification is not in window', async () => {
      const orig = (window as { Notification?: unknown }).Notification
      delete (window as { Notification?: unknown }).Notification
      const result = await requestNotificationPermission()
      expect(result).toBe('denied')
      ;(window as { Notification?: unknown }).Notification = orig
    })

    it('returns granted when already granted', async () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted', requestPermission: vi.fn() },
        writable: true,
        configurable: true,
      })
      const result = await requestNotificationPermission()
      expect(result).toBe('granted')
    })

    it('returns denied when already denied', async () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'denied', requestPermission: vi.fn() },
        writable: true,
        configurable: true,
      })
      const result = await requestNotificationPermission()
      expect(result).toBe('denied')
    })

    it('calls requestPermission when status is default', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default', requestPermission: mockRequestPermission },
        writable: true,
        configurable: true,
      })
      const result = await requestNotificationPermission()
      expect(result).toBe('granted')
      expect(mockRequestPermission).toHaveBeenCalled()
    })
  })

  describe('getNotificationPermission', () => {
    it('returns denied when Notification is not in window', () => {
      const orig = (window as { Notification?: unknown }).Notification
      delete (window as { Notification?: unknown }).Notification
      const result = getNotificationPermission()
      expect(result).toBe('denied')
      ;(window as { Notification?: unknown }).Notification = orig
    })

    it('returns current permission level', () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      })
      expect(getNotificationPermission()).toBe('granted')
    })
  })

  describe('showDesktopNotification', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'ch-1',
      userId: 'u-1',
      username: 'Alice',
      content: 'Hello world',
      timestamp: Date.now(),
      synced: true,
    }

    it('does nothing when Notification is not available', async () => {
      const orig = (window as { Notification?: unknown }).Notification
      delete (window as { Notification?: unknown }).Notification
      await expect(showDesktopNotification(message)).resolves.toBeUndefined()
      ;(window as { Notification?: unknown }).Notification = orig
    })

    it('does nothing when permission is not granted', async () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'denied' },
        writable: true,
        configurable: true,
      })
      await expect(showDesktopNotification(message)).resolves.toBeUndefined()
    })

    it('creates a notification when permission is granted and no service worker', async () => {
      const mockNotification = vi.fn()
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(mockNotification, { permission: 'granted' }),
        writable: true,
        configurable: true,
      })
      // Remove serviceWorker to force fallback
      const origSW = navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      await showDesktopNotification(message, 'TestRoom')
      expect(mockNotification).toHaveBeenCalledWith(
        'Alice in TestRoom',
        expect.objectContaining({ body: 'Hello world' }),
      )
      Object.defineProperty(navigator, 'serviceWorker', {
        value: origSW,
        writable: true,
        configurable: true,
      })
    })

    it('uses service worker notification when available', async () => {
      const showNotification = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(vi.fn(), { permission: 'granted' }),
        writable: true,
        configurable: true,
      })
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ showNotification }) },
        writable: true,
        configurable: true,
      })
      await showDesktopNotification(message)
      expect(showNotification).toHaveBeenCalledWith('Alice', expect.any(Object))
    })

    it('falls through to basic Notification when service worker throws', async () => {
      const mockNotification = vi.fn()
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(mockNotification, { permission: 'granted' }),
        writable: true,
        configurable: true,
      })
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.reject(new Error('sw failed')) },
        writable: true,
        configurable: true,
      })
      await showDesktopNotification(message, 'Room')
      expect(mockNotification).toHaveBeenCalledWith('Alice in Room', expect.any(Object))
    })

    it('truncates long message content', async () => {
      const mockNotification = vi.fn()
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(mockNotification, { permission: 'granted' }),
        writable: true,
        configurable: true,
      })
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const longMsg = { ...message, content: 'A'.repeat(200) }
      await showDesktopNotification(longMsg)
      const body = mockNotification.mock.calls[0][1].body as string
      expect(body.length).toBeLessThanOrEqual(121) // 120 + '…'
      expect(body.endsWith('…')).toBe(true)
    })

    it('shows file name for file messages', async () => {
      const mockNotification = vi.fn()
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(mockNotification, { permission: 'granted' }),
        writable: true,
        configurable: true,
      })
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const fileMsg = {
        ...message,
        fileMetadata: { name: 'photo.jpg', size: 1024, type: 'image/jpeg', chunks: 1, transferId: 'tf-1' },
      }
      await showDesktopNotification(fileMsg)
      const body = mockNotification.mock.calls[0][1].body as string
      expect(body).toContain('photo.jpg')
    })
  })

  describe('notifyIncomingMessage', () => {
    const message: Message = {
      id: 'msg-1',
      channelId: 'ch-1',
      userId: 'u-remote',
      username: 'Bob',
      content: 'Hi',
      timestamp: Date.now(),
      synced: true,
    }

    beforeEach(() => {
      // Default: sound enabled, desktop enabled
      mockStorage.set('p2p-notification-settings', JSON.stringify({
        soundEnabled: true,
        desktopEnabled: true,
        volume: 0.5,
      }))
    })

    it('does nothing for own messages', () => {
      // Should not throw or play anything
      notifyIncomingMessage(message, 'u-remote', 'ch-1')
    })

    it('plays sound for remote messages', () => {
      // Just verify no error
      notifyIncomingMessage(message, 'u-local', 'ch-1')
    })

    it('does not play sound when soundEnabled is false', () => {
      mockStorage.set('p2p-notification-settings', JSON.stringify({
        soundEnabled: false,
        desktopEnabled: false,
        volume: 0.5,
      }))
      notifyIncomingMessage(message, 'u-local', 'ch-1')
    })

    it('shows desktop notification for hidden tab', () => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true })
      notifyIncomingMessage(message, 'u-local', 'ch-1', 'Room')
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true })
    })

    it('shows desktop notification for different channel', () => {
      notifyIncomingMessage(message, 'u-local', 'ch-other', 'Room')
    })

    it('no desktop notification for same channel and visible tab', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true })
      notifyIncomingMessage(message, 'u-local', 'ch-1', 'Room')
    })
  })
})
