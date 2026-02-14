import { describe, expect, it, vi, beforeEach } from 'vitest'
import { registerServiceWorker, clearCacheAndUpdate } from './sw-register'

describe('sw-register', () => {
  describe('registerServiceWorker', () => {
    it('registers service worker when supported', async () => {
      const mockRegister = vi.fn().mockResolvedValue({ scope: '/' })
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: mockRegister },
        writable: true,
        configurable: true,
      })

      await registerServiceWorker()
      expect(mockRegister).toHaveBeenCalledWith('/sw.js')
    })

    it('handles registration failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: vi.fn().mockRejectedValue(new Error('fail')) },
        writable: true,
        configurable: true,
      })

      await registerServiceWorker()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('does nothing when serviceWorker is not in navigator', async () => {
      const orig = navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      await registerServiceWorker() // should not throw
      Object.defineProperty(navigator, 'serviceWorker', {
        value: orig,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('clearCacheAndUpdate', () => {
    beforeEach(() => {
      // Mock location.reload
      Object.defineProperty(window, 'location', {
        value: { ...window.location, reload: vi.fn() },
        writable: true,
        configurable: true,
      })
    })

    it('unregisters service workers, clears caches, and reloads', async () => {
      const unregister = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(window, 'caches', {
        value: {
          keys: vi.fn().mockResolvedValue(['cache-v1']),
          delete: vi.fn().mockResolvedValue(true),
        },
        writable: true,
        configurable: true,
      })

      await clearCacheAndUpdate()

      expect(unregister).toHaveBeenCalled()
      expect(window.caches.delete).toHaveBeenCalledWith('cache-v1')
      expect(window.location.reload).toHaveBeenCalled()
    })

    it('reloads even if clearing fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistrations: vi.fn().mockRejectedValue(new Error('fail')) },
        writable: true,
        configurable: true,
      })

      await clearCacheAndUpdate()
      expect(window.location.reload).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
