/**
 * Regression tests for push notification delivery, background sync,
 * and message delivery when peers go offline / come back online.
 *
 * These test the fixes for:
 * 1. Push always sent (not gated on sender's desktopEnabled)
 * 2. Push re-registration on signaling reconnect
 * 3. registerPush not gated on desktopEnabled setting
 * 4. Push payload body truncation + fileMetadata stripping
 * 5. Signaling reconnect with exponential backoff (unlimited)
 * 6. SW message listener for push-delivered messages
 * 7. Visibility-change IDB reload
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════
// 1. Signaling reconnect: exponential backoff, unlimited retries
// ═══════════════════════════════════════════════════════════════════════

describe('SignalingClient reconnect (regression)', () => {
  let origWebSocket: typeof WebSocket

  class MockWebSocket {
    static OPEN = 1
    static lastInstance: MockWebSocket | null = null

    readyState = 0
    onopen: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onmessage: ((event: MessageEvent) => void) | null = null
    sent: string[] = []

    constructor(public url: string) {
      MockWebSocket.lastInstance = this
    }

    send(data: string) { this.sent.push(data) }
    close() {
      this.readyState = 3
      this.onclose?.(new CloseEvent('close'))
    }

    simulateOpen() {
      this.readyState = 1
      this.onopen?.(new Event('open'))
    }
  }

  let lastWS: MockWebSocket

  beforeEach(() => {
    origWebSocket = globalThis.WebSocket
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url)
        lastWS = MockWebSocket.lastInstance as MockWebSocket
      }
    } as unknown as typeof WebSocket
    ;(globalThis.WebSocket as unknown as { OPEN: number }).OPEN = MockWebSocket.OPEN
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0) // deterministic jitter
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.WebSocket = origWebSocket
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses exponential backoff with cap at 30s', async () => {
    const { SignalingClient } = await import('./signaling')

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')
    lastWS.simulateOpen()
    await vi.advanceTimersByTimeAsync(1)

    // Disconnect triggers reconnect
    const delays: number[] = []

    // Track setTimeout delays for reconnects
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    // 1st disconnect → reconnect attempt 1
    lastWS.close()
    let reconnectCall = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
    expect(reconnectCall).toBeDefined()
    const delay1 = reconnectCall![1] as number
    // Attempt 1: base * 2^0 = 1000ms (+ jitter=0 since Math.random=0)
    expect(delay1).toBe(1000)
    delays.push(delay1)

    // Advance to trigger reconnect, then close again
    await vi.advanceTimersByTimeAsync(delay1 + 10)
    lastWS.simulateOpen()
    await vi.advanceTimersByTimeAsync(1)
    setTimeoutSpy.mockClear()
    lastWS.close()
    reconnectCall = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
    // Attempt should reset to 1 because we successfully reconnected (reconnectAttempts resets on open)
    // Reconnect attempt 1 again since counter was reset
    expect(reconnectCall).toBeDefined()
    const delay2 = reconnectCall![1] as number
    expect(delay2).toBe(1000) // reset because we had a successful connection
    delays.push(delay2)

    client.disconnect()
  })

  it('uses exponential backoff when connection never succeeds', async () => {
    const { SignalingClient } = await import('./signaling')

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    // Close without ever opening — triggers reconnect
    lastWS.close()

    // Collect several backoff delays by repeatedly failing
    const attemptDelays: number[] = []
    for (let i = 0; i < 6; i++) {
      const call = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
      if (call) {
        attemptDelays.push(call[1] as number)
        setTimeoutSpy.mockClear()
        await vi.advanceTimersByTimeAsync((call[1] as number) + 10)
        // New WS created but closes immediately
        lastWS.close()
      }
    }

    // Each delay should be >= previous (exponential)
    for (let i = 1; i < attemptDelays.length; i++) {
      expect(attemptDelays[i]).toBeGreaterThanOrEqual(attemptDelays[i - 1])
    }

    // No delay should exceed 30000ms cap
    for (const d of attemptDelays) {
      expect(d).toBeLessThanOrEqual(30000)
    }

    client.disconnect()
  })

  it('never stops reconnecting (unlimited attempts)', async () => {
    const { SignalingClient } = await import('./signaling')

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    // Simulate 10 consecutive failures — should still keep trying
    lastWS.close()
    for (let i = 0; i < 10; i++) {
      const call = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
      expect(call).toBeDefined() // still attempting
      setTimeoutSpy.mockClear()
      await vi.advanceTimersByTimeAsync((call![1] as number) + 10)
      lastWS.close()
    }

    // After 10 failures, should still be attempting
    const finalCall = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
    expect(finalCall).toBeDefined()

    client.disconnect()
  })

  it('resets reconnect counter on successful connection', async () => {
    const { SignalingClient } = await import('./signaling')

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.connect('ws://localhost:3001')

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    // Fail 3 times
    lastWS.close()
    for (let i = 0; i < 3; i++) {
      const call = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
      setTimeoutSpy.mockClear()
      await vi.advanceTimersByTimeAsync((call![1] as number) + 10)
      if (i < 2) lastWS.close()
    }

    // Now succeed
    lastWS.simulateOpen()
    await vi.advanceTimersByTimeAsync(1)

    // Disconnect again — delay should be back to base (1000ms)
    setTimeoutSpy.mockClear()
    lastWS.close()
    const call = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
    expect(call).toBeDefined()
    expect(call![1]).toBe(1000) // reset to base

    client.disconnect()
  })

  it('fires onConnected on every reconnect', async () => {
    const { SignalingClient } = await import('./signaling')
    const onConnected = vi.fn()

    const client = new SignalingClient('room-1', 'user-1', 'Alice')
    client.onConnected(onConnected)
    client.connect('ws://localhost:3001')
    lastWS.simulateOpen()
    await vi.advanceTimersByTimeAsync(1)
    expect(onConnected).toHaveBeenCalledTimes(1)

    // Disconnect and reconnect
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    lastWS.close()
    const call = setTimeoutSpy.mock.calls.find(c => typeof c[1] === 'number' && c[1] >= 1000)
    await vi.advanceTimersByTimeAsync((call![1] as number) + 10)
    lastWS.simulateOpen()
    await vi.advanceTimersByTimeAsync(1)
    expect(onConnected).toHaveBeenCalledTimes(2)

    client.disconnect()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 2. Push always sent (not gated on sender notification settings)
// ═══════════════════════════════════════════════════════════════════════

describe('Push always sent regardless of sender settings (regression)', () => {
  it('sendMessage dispatches push even when sender desktopEnabled=false', async () => {
    // This tests that the P2PContext.sendMessage code path does NOT
    // check loadNotificationSettings().desktopEnabled before pushing.
    // We verify by grepping the source — unit testing the full P2PContext
    // render is expensive, so we do a code-level assertion.
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    // The sendMessage function should NOT contain loadNotificationSettings
    // before calling pushToOfflinePeers
    const sendMessageBlock = contextSrc.slice(
      contextSrc.indexOf('const sendMessage = async'),
      contextSrc.indexOf('const toggleReaction')
    )

    expect(sendMessageBlock).not.toContain('loadNotificationSettings')
    expect(sendMessageBlock).not.toContain('ns.desktopEnabled')

    // It should always call pushToOfflinePeers
    expect(sendMessageBlock).toContain('pushToOfflinePeers')
  })

  it('sendGifMessage dispatches push even when sender desktopEnabled=false', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    const sendGifBlock = contextSrc.slice(
      contextSrc.indexOf('const sendGifMessage = async'),
      contextSrc.indexOf('const authorizePeerAccess')
    )

    expect(sendGifBlock).not.toContain('loadNotificationSettings')
    expect(sendGifBlock).not.toContain('ns.desktopEnabled')
    expect(sendGifBlock).toContain('pushToOfflinePeers')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 3. registerPush not gated on desktopEnabled
// ═══════════════════════════════════════════════════════════════════════

describe('registerPush not gated on notification settings (regression)', () => {
  it('registerPush does not check desktopEnabled', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    // Find the registerPush callback
    const registerPushStart = contextSrc.indexOf('const registerPush = useCallback')
    const registerPushEnd = contextSrc.indexOf('}, [])', registerPushStart)
    const registerPushBlock = contextSrc.slice(registerPushStart, registerPushEnd)

    expect(registerPushBlock).not.toContain('desktopEnabled')
    expect(registerPushBlock).not.toContain('loadNotificationSettings')
    // It should check Notification.permission === 'denied' (deny only)
    expect(registerPushBlock).toContain("Notification.permission === 'denied'")
    // It should call subscribeToPush
    expect(registerPushBlock).toContain('subscribeToPush')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 4. Push re-registration on signaling reconnect
// ═══════════════════════════════════════════════════════════════════════

describe('Push re-registration on signaling reconnect (regression)', () => {
  it('onSignalingConnected calls registerPush', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    // Find the onSignalingConnected callback in setupManager
    const setupBlock = contextSrc.slice(
      contextSrc.indexOf('const setupManager = useCallback'),
      contextSrc.indexOf('setWebrtcManager(manager)')
    )

    // onSignalingConnected should call registerPush
    const sigConnectedBlock = setupBlock.slice(
      setupBlock.indexOf('onSignalingConnected'),
      setupBlock.indexOf('onSignalingDisconnected')
    )

    expect(sigConnectedBlock).toContain('registerPush')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 5. Push payload size safety
// ═══════════════════════════════════════════════════════════════════════

describe('Push payload size safety (regression)', () => {
  it('sendMessage truncates body to 200 chars', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    const sendMessageBlock = contextSrc.slice(
      contextSrc.indexOf('const sendMessage = async'),
      contextSrc.indexOf('const toggleReaction')
    )

    // Should truncate preview
    expect(sendMessageBlock).toContain('preview.length > 200')
    expect(sendMessageBlock).toContain("preview.slice(0, 197) + '…'")
  })

  it('sendMessage strips fileMetadata from push payload', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    const sendMessageBlock = contextSrc.slice(
      contextSrc.indexOf('const sendMessage = async'),
      contextSrc.indexOf('const toggleReaction')
    )

    expect(sendMessageBlock).toContain('delete pushMessage.fileMetadata')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 6. SW message listener (push-message-received)
// ═══════════════════════════════════════════════════════════════════════

describe('SW push-message-received listener (regression)', () => {
  it('P2PContext listens for push-message-received from service worker', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    // Must have a serviceWorker message listener
    expect(contextSrc).toContain("navigator.serviceWorker.addEventListener('message', handler)")
    expect(contextSrc).toContain("event.data?.type === 'push-message-received'")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 7. Visibility-change IDB reload
// ═══════════════════════════════════════════════════════════════════════

describe('Visibility-change IDB reload (regression)', () => {
  it('P2PContext reloads messages from IDB on visibility change', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const contextSrc = fs.readFileSync(
      path.resolve(__dirname, './P2PContext.tsx'),
      'utf8'
    )

    expect(contextSrc).toContain('visibilitychange')
    expect(contextSrc).toContain("document.visibilityState === 'visible'")
    expect(contextSrc).toContain('getMessagesByChannel')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 8. Service worker push event handler
// ═══════════════════════════════════════════════════════════════════════

describe('Service worker push handler (regression)', () => {
  it('SW saves push messages to IDB and shows notification', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const swSrc = fs.readFileSync(
      path.resolve(__dirname, '../../public/sw.js'),
      'utf8'
    )

    // Must have push event listener
    expect(swSrc).toContain("self.addEventListener('push'")
    // Must save to IDB
    expect(swSrc).toContain('saveMessageToIDB')
    // Must show notification
    expect(swSrc).toContain('showNotification')
    // Must post message to clients
    expect(swSrc).toContain('push-message-received')
  })

  it('SW decrypts messages using room key from IDB', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const swSrc = fs.readFileSync(
      path.resolve(__dirname, '../../public/sw.js'),
      'utf8'
    )

    expect(swSrc).toContain('getRoomKeyFromIDB')
    expect(swSrc).toContain('swDecryptText')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 9. Signaling server push subscription handling (in-memory only)
// ═══════════════════════════════════════════════════════════════════════

describe('Signaling server push subs are memory-only (regression)', () => {
  it('signaling server does not import fs or persist subscriptions', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const serverSrc = fs.readFileSync(
      path.resolve(__dirname, '../../signaling-server.js'),
      'utf8'
    )

    // Must NOT import fs or write to disk
    expect(serverSrc).not.toMatch(/^import.*\bfs\b.*from/m)
    expect(serverSrc).not.toContain('writeFileSync')
    expect(serverSrc).not.toContain('readFileSync')
    expect(serverSrc).not.toContain('.push-subscriptions.json')

    // Must still handle push-subscribe and push-notify
    expect(serverSrc).toContain('push-subscribe')
    expect(serverSrc).toContain('push-notify')
    expect(serverSrc).toContain('webpush.sendNotification')
  })
})
