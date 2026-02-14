const CACHE_NAME = 'p2p-chat-v2'
const BACKGROUND_POLL_INTERVAL_FALLBACK_MS = 2 * 60 * 1000 // 2 minutes fallback
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
]

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache files individually to avoid failing on missing resources
      return Promise.allSettled(
        APP_SHELL_URLS.map(url => cache.add(url).catch(err => console.warn('Failed to cache:', url, err)))
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    (async () => {
      if (event.request.mode === 'navigate') {
        try {
          const networkResponse = await fetch(event.request)
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put('/index.html', networkResponse.clone())
          }
          return networkResponse
        } catch {
          const cachedHtml = await caches.match('/index.html')
          if (cachedHtml) return cachedHtml
          return caches.match('/')
        }
      }

      const destination = event.request.destination
      const isAppCodeAsset = ['style', 'script', 'worker'].includes(destination) || requestUrl.pathname.startsWith('/assets/')

      if (isAppCodeAsset) {
        try {
          const networkResponse = await fetch(event.request)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse
          }

          const cache = await caches.open(CACHE_NAME)
          cache.put(event.request, networkResponse.clone())
          return networkResponse
        } catch (error) {
          const fallback = await caches.match(event.request)
          if (fallback) return fallback
          throw error
        }
      }

      const cached = await caches.match(event.request)
      if (cached) {
        return cached
      }

      try {
        const networkResponse = await fetch(event.request)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse
        }

        if (['image', 'font'].includes(destination)) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(event.request, networkResponse.clone())
        }

        return networkResponse
      } catch (error) {
        const fallback = await caches.match(event.request)
        if (fallback) return fallback
        throw error
      }
    })()
  )
})

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
            return Promise.resolve()
          })
        )
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  )
})

// ── Notification click handler ────────────────────────────────────────
// When the user clicks a desktop / PWA notification, focus or open the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open in a tab/window, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/')
    })
  )
})

// ── E2E Encryption helpers (duplicated from src/lib/crypto.ts for SW context) ─

function swFromBase64Url(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function swImportKey(keyStr) {
  const raw = swFromBase64Url(keyStr)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
}

async function swDecryptText(encrypted, keyStr) {
  try {
    const [ivPart, ctPart] = encrypted.split(':')
    if (!ivPart || !ctPart) return null
    const key = await swImportKey(keyStr)
    const iv = swFromBase64Url(ivPart)
    const ciphertext = swFromBase64Url(ctPart)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

function getRoomKeyFromIDB(roomId) {
  return openAppDB().then((db) => {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('roomKeys')) {
        db.close()
        return resolve(null)
      }
      const tx = db.transaction('roomKeys', 'readonly')
      const request = tx.objectStore('roomKeys').get(roomId)
      request.onsuccess = () => { db.close(); resolve(request.result?.key ?? null) }
      request.onerror = () => { db.close(); reject(request.error) }
    })
  })
}

// ── Web Push handler ──────────────────────────────────────────────────
// The push payload carries the full message object from the sender.
// The SW saves it directly into IndexedDB (same DB the app uses) and
// shows an OS notification — all without the app being open.
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = null
  }

  if (!data) return

  // Decrypt the message if it was encrypted, then save to IDB
  const processAndSave = async () => {
    let message = data.message
    let notificationBody = data.body || ''

    if (data.encrypted && data.roomId && message) {
      try {
        const roomKey = await getRoomKeyFromIDB(data.roomId)
        if (roomKey) {
          // Decrypt message content
          if (message.content && message.content.includes(':')) {
            const plaintext = await swDecryptText(message.content, roomKey)
            if (plaintext !== null) {
              message = { ...message, content: plaintext }
            }
          }
          // Decrypt notification body
          if (notificationBody && notificationBody.includes(':')) {
            const plainBody = await swDecryptText(notificationBody, roomKey)
            if (plainBody !== null) {
              notificationBody = plainBody
            }
          }
        }
      } catch (err) {
        console.warn('[sw] Decryption failed, saving encrypted:', err)
      }
    }

    // Save the (decrypted) message to IndexedDB
    await saveMessageToIDB(message)

    // Tell any open client windows to refresh their message list
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((client) => {
      client.postMessage({
        type: 'push-message-received',
        message: message,
      })
    })

    return notificationBody
  }

  const title = data.title || 'New message'

  event.waitUntil(
    processAndSave().then((body) => {
      return self.registration.showNotification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `push-${data.message?.channelId || 'default'}-${Date.now()}`,
        data: {
          roomId: data.roomId,
          channelId: data.message?.channelId,
        },
      })
    }).catch((err) => {
      console.warn('[sw] Failed to process push message:', err)
    })
  )
})

// ── IndexedDB access from the service worker ──────────────────────────
// Opens the same 'p2p-chat-db' database the app uses and writes directly.
function openAppDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('p2p-chat-db', 4)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' })
        store.createIndex('by-channel', 'channelId')
        store.createIndex('by-timestamp', 'timestamp')
      }
      if (!db.objectStoreNames.contains('channels')) {
        db.createObjectStore('channels', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('rooms')) {
        db.createObjectStore('rooms', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('roomHistory')) {
        const rh = db.createObjectStore('roomHistory', { keyPath: 'roomId' })
        rh.createIndex('by-last-accessed', 'lastAccessed')
      }
      if (!db.objectStoreNames.contains('files')) {
        const fs = db.createObjectStore('files', { keyPath: 'id' })
        fs.createIndex('by-transfer-id', 'transferId')
        fs.createIndex('by-stored-at', 'storedAt')
      }
      if (!db.objectStoreNames.contains('roomKeys')) {
        db.createObjectStore('roomKeys', { keyPath: 'roomId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function saveMessageToIDB(message) {
  if (!message || !message.id) return Promise.resolve()
  return openAppDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite')
      tx.objectStore('messages').put(message)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  })
}

// ── Helper: get latest message ID for a specific room ──────────────
// Avoids using a cross-room checkpoint that can skip valid messages.
function getLatestMessageIdForRoomFromIDB(roomId) {
  return openAppDB().then((db) => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('rooms') || !db.objectStoreNames.contains('messages')) {
        db.close()
        return resolve(null)
      }

      const roomTx = db.transaction('rooms', 'readonly')
      const roomReq = roomTx.objectStore('rooms').get(roomId)
      roomReq.onsuccess = () => {
        const room = roomReq.result
        const channels = Array.isArray(room?.channels) ? room.channels : []
        const channelIds = channels.map(c => c?.id).filter(Boolean)
        if (channelIds.length === 0) {
          db.close()
          return resolve(null)
        }

        const tx = db.transaction('messages', 'readonly')
        const byChannel = tx.objectStore('messages').index('by-channel')
        const ids = []
        let pending = channelIds.length

        const done = () => {
          pending -= 1
          if (pending > 0) return
          db.close()
          if (ids.length === 0) return resolve(null)
          ids.sort((a, b) => a.localeCompare(b))
          resolve(ids[ids.length - 1] ?? null)
        }

        for (const channelId of channelIds) {
          const req = byChannel.openCursor(IDBKeyRange.only(channelId), 'prev')
          req.onsuccess = () => {
            const id = req.result?.value?.id
            if (id) ids.push(id)
            done()
          }
          req.onerror = () => done()
        }
      }
      roomReq.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  })
}

// ── Helper: get active rooms from IDB ────────────────────────────────
function getActiveRoomsFromIDB() {
  return openAppDB().then((db) => {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('roomHistory')) {
        db.close()
        return resolve([])
      }
      const tx = db.transaction('roomHistory', 'readonly')
      const request = tx.objectStore('roomHistory').getAll()
      request.onsuccess = () => { db.close(); resolve(request.result || []) }
      request.onerror = () => { db.close(); reject(request.error) }
    })
  })
}

// ── Helper: derive signaling HTTP URL ────────────────────────────────
function getSignalingHttpUrl() {
  // In the SW context we don't have import.meta.env.
  // Use the origin — in production the signaling server's HTTP port is
  // typically the same host on port 3001. For same-origin deploys
  // (Vercel/Netlify) it's co-located.
  const origin = self.location.origin
  const host = self.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return `${self.location.protocol}//${host}:3001`
  }
  return origin.replace(/:\d+$/, '') + ':3001'
}

// ── Background poll: ask an online peer for missed messages ──────────
async function backgroundPollForMessages() {
  try {
    const rooms = await getActiveRoomsFromIDB()
    if (!rooms || rooms.length === 0) return

    const baseUrl = getSignalingHttpUrl()
    let totalNewMessages = 0

    for (const room of rooms) {
      const roomId = room.roomId
      if (!roomId) continue
      const lastMessageId = await getLatestMessageIdForRoomFromIDB(roomId)

      try {
        const res = await fetch(`${baseUrl}/rooms/${encodeURIComponent(roomId)}/poll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastMessageId }),
        })

        if (!res.ok) continue
        const data = await res.json()
        if (!Array.isArray(data.messages) || data.messages.length === 0) continue

        // Decrypt and save each message
        let roomKey = null
        try { roomKey = await getRoomKeyFromIDB(roomId) } catch { /* ignore */ }

        for (const msg of data.messages) {
          let decryptedMsg = msg
          if (roomKey && msg.content && msg.content.includes(':')) {
            try {
              const plaintext = await swDecryptText(msg.content, roomKey)
              if (plaintext !== null) {
                decryptedMsg = { ...msg, content: plaintext }
              }
            } catch { /* save encrypted */ }
          }
          await saveMessageToIDB(decryptedMsg)
          totalNewMessages++
        }
      } catch (err) {
        console.warn(`[sw-poll] Failed to poll room ${roomId}:`, err)
      }
    }

    // Notify any open client windows to refresh
    if (totalNewMessages > 0) {
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((client) => {
        client.postMessage({ type: 'background-poll-complete', newMessages: totalNewMessages })
      })

      // Show a notification if no windows are focused
      const focusedClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const anyFocused = focusedClients.some((c) => c.visibilityState === 'visible')
      if (!anyFocused) {
        await self.registration.showNotification('New messages', {
          body: `You have ${totalNewMessages} new message${totalNewMessages > 1 ? 's' : ''} while you were away.`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'background-poll',
        })
      }
    }

    console.log(`[sw-poll] Background poll complete: ${totalNewMessages} new messages`)
  } catch (err) {
    console.warn('[sw-poll] Background poll failed:', err)
  }
}

// ── Periodic Background Sync ─────────────────────────────────────────
// Fired by the browser periodically (Chrome: minInterval ~12h, but
// frequently more often for high-engagement sites).
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'p2p-chat-poll') {
    event.waitUntil(backgroundPollForMessages())
  }
})

// ── Fallback: setInterval-based polling ──────────────────────────────
// periodicsync is Chrome-only and may not fire often enough.
// As a fallback, poll every 2 minutes while the SW is alive.
// The SW stays alive as long as there's a push subscription or active page.
let pollIntervalId = null

function startFallbackPolling() {
  if (pollIntervalId) return
  pollIntervalId = setInterval(() => {
    backgroundPollForMessages()
  }, BACKGROUND_POLL_INTERVAL_FALLBACK_MS)
  console.log('[sw-poll] Fallback polling started (every 2 min)')
}

// Start fallback polling when the SW activates
self.addEventListener('activate', () => {
  startFallbackPolling()
})

// Also handle explicit poll requests from the client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'poll-now') {
    event.waitUntil(backgroundPollForMessages())
  }
})
