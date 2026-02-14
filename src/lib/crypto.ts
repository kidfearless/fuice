/**
 * End-to-end encryption utilities using the Web Crypto API.
 *
 * Each room has a random AES-256-GCM key that is:
 *  - Generated on room creation
 *  - Shared via the URL fragment (#ek=...) which is never sent to servers
 *  - Stored locally in IndexedDB
 *
 * Only message *content* is encrypted. Metadata (timestamps, channel IDs,
 * user IDs) stays plaintext so the app can route and display messages.
 */

// ── Key storage (IndexedDB) ─────────────────────────────────────────

const DB_NAME = 'p2p-chat-db'
const STORE_NAME = 'roomKeys'

/** Open the DB, creating the roomKeys store if needed (bumps to v4). */
function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // We need version 4 to add the roomKeys store
    const request = indexedDB.open(DB_NAME, 4)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      // Existing stores from app migrations (1-3)
      if (!db.objectStoreNames.contains('messages')) {
        const s = db.createObjectStore('messages', { keyPath: 'id' })
        s.createIndex('by-channel', 'channelId')
        s.createIndex('by-timestamp', 'timestamp')
      }
      if (!db.objectStoreNames.contains('channels')) db.createObjectStore('channels', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('rooms')) db.createObjectStore('rooms', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('roomHistory')) {
        const rh = db.createObjectStore('roomHistory', { keyPath: 'roomId' })
        rh.createIndex('by-last-accessed', 'lastAccessed')
      }
      if (!db.objectStoreNames.contains('files')) {
        const fs = db.createObjectStore('files', { keyPath: 'id' })
        fs.createIndex('by-transfer-id', 'transferId')
        fs.createIndex('by-stored-at', 'storedAt')
      }
      // New in v4
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'roomId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ── Base64url encoding ──────────────────────────────────────────────

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  bytes.forEach(b => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ── Key generation & import ─────────────────────────────────────────

/** Generate a new random AES-256-GCM key and return its base64url-encoded raw bytes. */
export async function generateRoomKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  )
  const raw = await crypto.subtle.exportKey('raw', key)
  return toBase64Url(raw)
}

/** Import a base64url-encoded raw key into a CryptoKey. */
async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = fromBase64Url(keyStr)
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ── Encrypt / Decrypt ───────────────────────────────────────────────

/**
 * Encrypt a plaintext string. Returns a string in the format `iv:ciphertext`
 * where both parts are base64url-encoded.
 */
export async function encryptText(plaintext: string, keyStr: string): Promise<string> {
  const key = await importKey(keyStr)
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  return `${toBase64Url(iv.buffer)}:${toBase64Url(ciphertext)}`
}

/**
 * Decrypt a string in the format `iv:ciphertext` back to plaintext.
 * Returns null if decryption fails (wrong key, corrupted data, etc.).
 */
export async function decryptText(encrypted: string, keyStr: string): Promise<string | null> {
  try {
    const [ivPart, ctPart] = encrypted.split(':')
    if (!ivPart || !ctPart) return null
    const key = await importKey(keyStr)
    const iv = fromBase64Url(ivPart)
    const ciphertext = fromBase64Url(ctPart)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

// ── Room key persistence (IndexedDB) ────────────────────────────────

/** Save a room's encryption key to IndexedDB. */
export async function saveRoomKey(roomId: string, keyStr: string): Promise<void> {
  const db = await openKeyDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ roomId, key: keyStr })
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/** Get a room's encryption key from IndexedDB, or null if not found. */
export async function getRoomKey(roomId: string): Promise<string | null> {
  const db = await openKeyDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(roomId)
    request.onsuccess = () => {
      db.close()
      resolve(request.result?.key ?? null)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

/** Delete a room's encryption key. */
export async function deleteRoomKey(roomId: string): Promise<void> {
  const db = await openKeyDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(roomId)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

// ── URL fragment helpers ────────────────────────────────────────────

/** Build a share URL with the encryption key in the fragment (never sent to servers). */
export function buildShareUrl(roomId: string, keyStr: string): string {
  return `${window.location.origin}${window.location.pathname}?join=${roomId}#ek=${keyStr}`
}

/** Extract the encryption key from the current URL fragment. Returns null if not present. */
export function extractKeyFromFragment(): string | null {
  const hash = window.location.hash
  if (!hash) return null
  const match = hash.match(/[#&]ek=([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}
