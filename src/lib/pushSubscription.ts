/**
 * Client-side Web Push subscription management.
 *
 * Flow:
 * 1. Fetch VAPID public key from the signaling server's HTTP endpoint.
 * 2. Subscribe the service worker's PushManager.
 * 3. Send the PushSubscription to the signaling server over the existing WS
 *    so it can push to us when we're offline.
 */

// ── Helpers ──────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Build the HTTP base URL that corresponds to the signaling server. */
function getSignalingHttpUrl(): string {
  const envUrl = import.meta.env.VITE_SIGNALING_URL as string | undefined
  if (envUrl && !isPlaceholderSignalingUrl(envUrl)) {
    // Convert ws(s):// to http(s)://
    return envUrl
      .replace(/^wss:/, 'https:')
      .replace(/^ws:/, 'http:')
  }
  const protocol = window.location.protocol // already http: or https:
  const host = window.location.hostname
  const port = import.meta.env.VITE_SIGNALING_PORT || '3001'
  return `${protocol}//${host}:${port}`
}

function isPlaceholderSignalingUrl(url: string): boolean {
  const normalized = url.toLowerCase()
  return normalized.includes('your-app-signaling') || normalized.includes('example.com')
}

let cachedVapidKey: string | null = null

/** Fetch the VAPID public key from the signaling server (cached). */
export async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey
  try {
    const res = await fetch(`${getSignalingHttpUrl()}/vapid-public-key`)
    if (!res.ok) return null
    const data = await res.json()
    cachedVapidKey = data.publicKey ?? null
    return cachedVapidKey
  } catch (e) {
    console.warn('[push] Could not fetch VAPID key:', e)
    return null
  }
}

// ── Subscribe / unsubscribe ──────────────────────────────────────────

/**
 * Subscribe the service worker to Web Push and return the PushSubscription
 * JSON (to be sent to the signaling server).
 */
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  try {
    const vapidKey = await getVapidPublicKey()
    if (!vapidKey) {
      console.warn('[push] No VAPID key available — push disabled')
      return null
    }

    const registration = await navigator.serviceWorker.ready

    // Always unsubscribe first to get a fresh endpoint.
    // Stale endpoints cause 410 errors on the push service and
    // silently drop messages.  Re-subscribing is cheap.
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      try {
        await existing.unsubscribe()
        console.log('[push] Unsubscribed stale push subscription')
      } catch (e) {
        console.warn('[push] Failed to unsubscribe stale sub:', e)
      }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
    console.log('[push] Subscribed to push notifications (fresh endpoint)')
    return subscription.toJSON()
  } catch (e) {
    console.warn('[push] Subscription failed:', e)
    return null
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      console.log('[push] Unsubscribed from push notifications')
    }
  } catch (e) {
    console.warn('[push] Unsubscribe failed:', e)
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

/** Return the current push subscription endpoint, or null if not subscribed. */
export async function getPushEndpoint(): Promise<string | null> {
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    return sub?.endpoint ?? null
  } catch {
    return null
  }
}
