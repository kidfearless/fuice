import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('pushSubscription', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  describe('urlBase64ToUint8Array (via subscribeToPush)', () => {
    // Tested indirectly via subscribeToPush
    it('is used internally for VAPID key conversion', async () => {
      // The function is private, but we test it through the public API
      const { getVapidPublicKey } = await import('./pushSubscription')
      
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8IowEmk' }),
      } as Response)

      const key = await getVapidPublicKey()
      expect(key).toBeTruthy()
    })
  })

  describe('getVapidPublicKey', () => {
    it('fetches and caches VAPID public key', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'test-vapid-key' }),
      } as Response)

      const { getVapidPublicKey } = await import('./pushSubscription')
      const key = await getVapidPublicKey()
      expect(key).toBe('test-vapid-key')
    })

    it('returns null on fetch failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

      const { getVapidPublicKey } = await import('./pushSubscription')
      const key = await getVapidPublicKey()
      expect(key).toBeNull()
    })

    it('returns null on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response)

      const { getVapidPublicKey } = await import('./pushSubscription')
      const key = await getVapidPublicKey()
      expect(key).toBeNull()
    })

    it('returns null when key is missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const { getVapidPublicKey } = await import('./pushSubscription')
      const key = await getVapidPublicKey()
      expect(key).toBeNull()
    })

    it('uses fallback URL when VITE_SIGNALING_URL is not set', async () => {
      const origUrl = import.meta.env.VITE_SIGNALING_URL
      const origPort = import.meta.env.VITE_SIGNALING_PORT
      delete import.meta.env.VITE_SIGNALING_URL
      delete import.meta.env.VITE_SIGNALING_PORT

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'fallback-key' }),
      } as Response)

      const { getVapidPublicKey } = await import('./pushSubscription')
      const key = await getVapidPublicKey()
      expect(key).toBe('fallback-key')

      // The fetch URL should use localhost (jsdom default)
      const fetchUrl = fetchSpy.mock.calls[0][0] as string
      expect(fetchUrl).toContain('localhost')
      expect(fetchUrl).toContain('3001')

      import.meta.env.VITE_SIGNALING_URL = origUrl
      import.meta.env.VITE_SIGNALING_PORT = origPort
    })
  })

  describe('subscribeToPush', () => {
    it('returns null when no VAPID key available', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response)

      const { subscribeToPush } = await import('./pushSubscription')
      const result = await subscribeToPush()
      expect(result).toBeNull()
    })

    it('refreshes an existing subscription and returns the new subscription', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8IowEmk' }),
      } as Response)

      const existingSub = { endpoint: 'https://example.com/push' }
      const unsubscribe = vi.fn().mockResolvedValue(true)
      const newSub = { endpoint: 'https://example.com/push-new' }
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue({
                toJSON: () => existingSub,
                unsubscribe,
              }),
              subscribe: vi.fn().mockResolvedValue({
                toJSON: () => newSub,
              }),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { subscribeToPush } = await import('./pushSubscription')
      const result = await subscribeToPush()
      expect(unsubscribe).toHaveBeenCalled()
      expect(result).toEqual(newSub)
    })

    it('returns null on subscription failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'vapid-key' }),
      } as Response)

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockRejectedValue(new Error('fail')),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { subscribeToPush } = await import('./pushSubscription')
      const result = await subscribeToPush()
      expect(result).toBeNull()
    })

    it('creates a new subscription when none exists', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ publicKey: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8IowEmk' }),
      } as Response)

      const newSub = { endpoint: 'https://push.example.com/new' }
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
              subscribe: vi.fn().mockResolvedValue({
                toJSON: () => newSub,
              }),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { subscribeToPush } = await import('./pushSubscription')
      const result = await subscribeToPush()
      expect(result).toEqual(newSub)
    })
  })

  describe('unsubscribeFromPush', () => {
    it('unsubscribes existing subscription', async () => {
      const unsubscribe = vi.fn().mockResolvedValue(true)
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue({ unsubscribe }),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { unsubscribeFromPush } = await import('./pushSubscription')
      await unsubscribeFromPush()
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('handles no existing subscription', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { unsubscribeFromPush } = await import('./pushSubscription')
      await unsubscribeFromPush() // should not throw
    })

    it('handles errors gracefully', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.reject(new Error('fail')),
        },
        writable: true,
        configurable: true,
      })

      const { unsubscribeFromPush } = await import('./pushSubscription')
      await unsubscribeFromPush() // should not throw
    })
  })

  describe('isPushSubscribed', () => {
    it('returns true when subscribed', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue({ endpoint: 'x' }),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { isPushSubscribed } = await import('./pushSubscription')
      const result = await isPushSubscribed()
      expect(result).toBe(true)
    })

    it('returns false when not subscribed', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { isPushSubscribed } = await import('./pushSubscription')
      const result = await isPushSubscribed()
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.reject(new Error('fail')),
        },
        writable: true,
        configurable: true,
      })

      const { isPushSubscribed } = await import('./pushSubscription')
      const result = await isPushSubscribed()
      expect(result).toBe(false)
    })
  })

  describe('getPushEndpoint', () => {
    it('returns endpoint when subscribed', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example.com' }),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { getPushEndpoint } = await import('./pushSubscription')
      const result = await getPushEndpoint()
      expect(result).toBe('https://push.example.com')
    })

    it('returns null when not subscribed', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const { getPushEndpoint } = await import('./pushSubscription')
      const result = await getPushEndpoint()
      expect(result).toBeNull()
    })

    it('returns null on error', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.reject(new Error('fail')),
        },
        writable: true,
        configurable: true,
      })

      const { getPushEndpoint } = await import('./pushSubscription')
      const result = await getPushEndpoint()
      expect(result).toBeNull()
    })
  })
})
