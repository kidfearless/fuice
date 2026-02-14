import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { loadSettings, saveSettings, applySettings, updateSettings, resetSettings, type AppSettings } from './settings'

describe('settings', () => {
  const mockStorage = new Map<string, string>()

  beforeEach(() => {
    mockStorage.clear()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage.get(key) ?? null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { mockStorage.set(key, value) })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadSettings', () => {
    it('returns default settings when nothing is stored', () => {
      const settings = loadSettings()
      expect(settings.fontScale).toBe(1)
      expect(settings.density).toBe('comfortable')
      expect(settings.streaming.screenShareFrameRate).toBe(15)
      expect(settings.streaming.screenShareResolution).toBe(720)
      expect(settings.streaming.cameraFrameRate).toBe(30)
      expect(settings.streaming.cameraResolution).toBe(480)
    })

    it('loads and merges stored settings', () => {
      mockStorage.set('p2p-settings', JSON.stringify({ fontScale: 1.5 }))
      const settings = loadSettings()
      expect(settings.fontScale).toBe(1.5)
      expect(settings.density).toBe('comfortable') // default
    })

    it('deep-merges streaming settings', () => {
      mockStorage.set('p2p-settings', JSON.stringify({
        streaming: { screenShareFrameRate: 30 },
      }))
      const settings = loadSettings()
      expect(settings.streaming.screenShareFrameRate).toBe(30)
      expect(settings.streaming.cameraFrameRate).toBe(30) // default preserved
    })

    it('handles stored settings without streaming key', () => {
      mockStorage.set('p2p-settings', JSON.stringify({ fontScale: 0.8, density: 'compact' }))
      const settings = loadSettings()
      expect(settings.fontScale).toBe(0.8)
      expect(settings.streaming.cameraFrameRate).toBe(30)
    })

    it('returns defaults on corrupted JSON', () => {
      mockStorage.set('p2p-settings', 'not-json{{{')
      const settings = loadSettings()
      expect(settings.fontScale).toBe(1)
    })
  })

  describe('saveSettings', () => {
    it('saves settings to localStorage', () => {
      const settings: AppSettings = {
        fontScale: 1.2,
        density: 'compact',
        streaming: {
          screenShareFrameRate: 30,
          screenShareResolution: 1080,
          cameraFrameRate: 60,
          cameraResolution: 720,
        },
      }
      saveSettings(settings)
      const stored = mockStorage.get('p2p-settings')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored!)).toEqual(settings)
    })
  })

  describe('applySettings', () => {
    it('applies font scale and density to document root', () => {
      const root = document.documentElement
      const settings: AppSettings = {
        fontScale: 1.5,
        density: 'compact',
        streaming: {
          screenShareFrameRate: 15,
          screenShareResolution: 720,
          cameraFrameRate: 30,
          cameraResolution: 480,
        },
      }
      applySettings(settings)
      expect(root.style.getPropertyValue('--app-font-scale')).toBe('1.5')
      expect(root.dataset.density).toBe('compact')
      expect(root.style.getPropertyValue('--radius')).toBe('0.375rem')
    })

    it('applies comfortable density radius', () => {
      const root = document.documentElement
      const settings: AppSettings = {
        fontScale: 1,
        density: 'comfortable',
        streaming: {
          screenShareFrameRate: 15,
          screenShareResolution: 720,
          cameraFrameRate: 30,
          cameraResolution: 480,
        },
      }
      applySettings(settings)
      expect(root.style.getPropertyValue('--radius')).toBe('0.5rem')
    })
  })

  describe('updateSettings', () => {
    it('merges partial settings, saves and applies', () => {
      const result = updateSettings({ fontScale: 2 })
      expect(result.fontScale).toBe(2)
      expect(result.density).toBe('comfortable')
      const stored = mockStorage.get('p2p-settings')
      expect(stored).toBeDefined()
    })
  })

  describe('resetSettings', () => {
    it('resets to defaults', () => {
      // Store custom settings first
      saveSettings({ fontScale: 2, density: 'compact', streaming: { screenShareFrameRate: 60, screenShareResolution: 1080, cameraFrameRate: 60, cameraResolution: 1080 } })
      const result = resetSettings()
      expect(result.fontScale).toBe(1)
      expect(result.density).toBe('comfortable')
    })
  })
})
