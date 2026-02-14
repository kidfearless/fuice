#!/usr/bin/env node

import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import webpush from 'web-push'

const PORT = process.env.PORT || 3001

// ── Logging ──────────────────────────────────────────────────────────
const LOG_COLORS = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', magenta: '\x1b[35m', blue: '\x1b[34m' }
function ts() { return new Date().toISOString() }
function log(tag, color, ...args) { console.log(`${LOG_COLORS.dim}${ts()}${LOG_COLORS.reset} ${color}[${tag}]${LOG_COLORS.reset}`, ...args) }
const logWs    = (...args) => log('ws',    LOG_COLORS.green,   ...args)
const logRoom  = (...args) => log('room',  LOG_COLORS.cyan,    ...args)
const logSig   = (...args) => log('sig',   LOG_COLORS.blue,    ...args)
const logPush  = (...args) => log('push',  LOG_COLORS.magenta, ...args)
const logPoll  = (...args) => log('poll',  LOG_COLORS.yellow,  ...args)
const logErr   = (...args) => log('error', LOG_COLORS.red,     ...args)
const logStats = (...args) => log('stats', LOG_COLORS.dim,     ...args)

// ── VAPID setup ──────────────────────────────────────────────────────
// Provide these via environment variables.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:maintainers@example.com'

const hasVapidConfig = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
if (hasVapidConfig) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} else {
  logPush('VAPID keys are not configured; push notifications are disabled')
}

const server = createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    })
    res.end()
    return
  }

  // Expose the public VAPID key so the client can fetch it at runtime
  if (req.method === 'GET' && req.url === '/vapid-public-key') {
    if (!hasVapidConfig) {
      res.writeHead(503, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      })
      res.end(JSON.stringify({ error: 'Push notifications are not configured on this server' }))
      return
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }))
    return
  }

  // ── Poll relay endpoint (zero storage) ─────────────────────────────
  // The service worker or client calls this to ask an online peer for
  // missed messages. The server does NOT store anything — it relays the
  // request to a connected peer via WS and streams the answer back.
  const pollMatch = req.url?.match(/^\/rooms\/([^/]+)\/poll$/)
  if (req.method === 'POST' && pollMatch) {
    const roomId = decodeURIComponent(pollMatch[1])
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      let parsed
      try { parsed = JSON.parse(body) } catch { parsed = {} }
      const lastMessageId = parsed.lastMessageId ?? null

      const room = rooms.get(roomId)
      if (!room || room.size === 0) {
        logPoll(`Room ${roomId} — no online peers, returning empty`)
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ messages: [] }))
        return
      }

      // Find the first connected peer to relay the poll to
      let targetClient = null
      for (const [, client] of room) {
        if (client.ws.readyState === WebSocket.OPEN) { targetClient = client; break }
      }
      if (!targetClient) {
        logPoll(`Room ${roomId} — ${room.size} peer(s) registered but none connected`)
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ messages: [] }))
        return
      }

      const pollId = `poll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const timeoutId = setTimeout(() => {
        if (pendingPolls.has(pollId)) {
          pendingPolls.delete(pollId)
          logPoll(`${pollId} timed out after ${POLL_TIMEOUT_MS}ms (peer: ${targetClient.username})`)
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ messages: [] }))
        }
      }, POLL_TIMEOUT_MS)

      pendingPolls.set(pollId, { res, timeoutId })

      // Relay the poll request to the online peer
      targetClient.ws.send(JSON.stringify({
        type: 'sync-poll',
        pollId,
        lastMessageId,
        roomId,
      }))
      logPoll(`${pollId} → relayed to ${targetClient.username} in room ${roomId} (since: ${lastMessageId || 'beginning'})`)
    })
    return
  }

  res.writeHead(404)
  res.end()
})
const wss = new WebSocketServer({ server })

const rooms = new Map()
// Map<roomId, Map<endpoint, PushSubscription>>
// No visitor IDs stored — subscriptions are keyed by their opaque endpoint URL.
const pushSubscriptions = new Map()
// Set<endpoint>
const expiredEndpoints = new Set()

// ── Pending poll relay (zero storage) ────────────────────────────────
// Holds HTTP responses temporarily while relaying a sync-poll to an online
// peer via WS. Cleared on response or timeout — nothing persisted.
// Map<pollId, { res, timeoutId }>
const pendingPolls = new Map()
const POLL_TIMEOUT_MS = 8000

wss.on('connection', (ws) => {
  let currentUserId = null
  let currentRoomId = null
  let currentUsername = null

  logWs(`New connection (total clients: ${wss.clients.size})`)

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      
      switch (message.type) {
        case 'join':
          handleJoin(message)
          break
        case 'offer':
        case 'answer':
        case 'connection-candidate':
          handleSignaling(message)
          break
        case 'push-subscribe':
          handlePushSubscribe(message)
          break
        case 'push-notify':
          handlePushNotify(message)
          break
        case 'sync-poll-response':
          handleSyncPollResponse(message)
          break
        default:
          console.log('Unknown message type:', message.type)
      }
    } catch (error) {
      logErr(`Failed to parse WS message from ${currentUsername || 'unknown'}:`, error.message)
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  })

  ws.on('close', (code, reason) => {
    logWs(`Disconnected: ${currentUsername || 'unknown'} (code: ${code}, reason: ${reason || 'none'}, remaining clients: ${wss.clients.size})`)
    handleDisconnect()
  })

  ws.on('error', (error) => {
    logErr(`WS error for ${currentUsername || 'unknown'}:`, error.message)
  })

  function handleJoin(message) {
    currentUserId = message.userId
    currentRoomId = message.roomId
    currentUsername = message.username

    if (!rooms.has(currentRoomId)) {
      rooms.set(currentRoomId, new Map())
    }

    const room = rooms.get(currentRoomId)
    room.set(currentUserId, {
      ws,
      username: currentUsername,
      userId: currentUserId,
    })

    logRoom(`+ ${currentUsername} (${currentUserId}) joined ${currentRoomId} (room size: ${room.size})`)

    const peers = Array.from(room.entries())
      .filter(([id]) => id !== currentUserId)
      .map(([id, client]) => ({
        id,
        username: client.username,
      }))

    ws.send(JSON.stringify({
      type: 'peer-list',
      peers,
    }))

    broadcastToRoom(currentRoomId, {
      type: 'peer-joined',
      userId: currentUserId,
      username: currentUsername,
    }, currentUserId)
  }

  function handleSignaling(message) {
    if (!currentRoomId) {
      logErr(`Signaling from ${currentUsername || 'unknown'} but not in a room`)
      return
    }

    const room = rooms.get(currentRoomId)
    if (!room) {
      logErr(`Room ${currentRoomId} not found for signaling from ${currentUsername}`)
      return
    }

    const targetPeer = room.get(message.to)
    if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
      targetPeer.ws.send(JSON.stringify(message))
      logSig(`${message.type}: ${currentUsername} → ${targetPeer.username} (room: ${currentRoomId})`)
    } else {
      logSig(`${message.type}: ${currentUsername} → ${message.to} FAILED (peer offline/gone)`)
    }
  }

  function handleDisconnect() {
    if (currentRoomId && currentUserId) {
      const room = rooms.get(currentRoomId)
      if (room) {
        room.delete(currentUserId)
        logRoom(`- ${currentUsername || currentUserId} left ${currentRoomId} (room size: ${room.size})`)

        if (room.size === 0) {
          rooms.delete(currentRoomId)
          logRoom(`Room ${currentRoomId} is now empty — removed`)
          // Clean up push subs for empty rooms
          if (pushSubscriptions.has(currentRoomId)) {
            const count = pushSubscriptions.get(currentRoomId).size
            pushSubscriptions.delete(currentRoomId)
            logPush(`Cleaned ${count} push sub(s) for empty room ${currentRoomId}`)
          }
        } else {
          broadcastToRoom(currentRoomId, {
            type: 'peer-left',
            userId: currentUserId,
          })
        }
      }
    }
  }

  function broadcastToRoom(roomId, message, excludeUserId = null) {
    const room = rooms.get(roomId)
    if (!room) return

    room.forEach((client, userId) => {
      if (userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message))
      }
    })
  }

  // ── Push subscription management ──────────────────────────────────
  function handlePushSubscribe(message) {
    const { roomId, subscription } = message
    if (!roomId || !subscription || !subscription.endpoint) return

    if (!pushSubscriptions.has(roomId)) {
      pushSubscriptions.set(roomId, new Map())
    }
    // Key by endpoint — no visitor identity stored
    const epShort = subscription.endpoint.slice(-24)
    pushSubscriptions.get(roomId).set(subscription.endpoint, subscription)
    logPush(`Registered sub …${epShort} in room ${roomId} (${pushSubscriptions.get(roomId).size} total for room)`)

    // Check if we have a pending "expired" flag for this endpoint (in-memory only)
    // If so, tell the client to renew immediately.
    if (expiredEndpoints.has(subscription.endpoint)) {
      logPush(`Endpoint …${epShort} was previously expired — requesting renewal`)
      ws.send(JSON.stringify({ type: 'push-renew' }))
      expiredEndpoints.delete(subscription.endpoint)
    }
  }

  // ── Sync-poll response relay ──────────────────────────────────────
  // When a client answers a sync-poll, match it to the pending HTTP
  // request and return the messages. Nothing is stored.
  function handleSyncPollResponse(message) {
    const { pollId, messages } = message
    if (!pollId) return
    const pending = pendingPolls.get(pollId)
    if (!pending) {
      logPoll(`${pollId} response arrived but no pending request (already timed out?)`)
      return
    }
    clearTimeout(pending.timeoutId)
    pendingPolls.delete(pollId)
    const count = (messages || []).length
    pending.res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    pending.res.end(JSON.stringify({ messages: messages || [] }))
    logPoll(`${pollId} ← ${count} message(s) returned to SW`)
  }

  // Blind relay: the server does not parse the payload, it just forwards it.
  function handlePushNotify(message) {
    const { roomId, senderEndpoint, payload } = message
    if (!roomId || !payload) return

    if (!hasVapidConfig) {
      logPush('push-notify ignored because VAPID keys are not configured')
      return
    }

    const roomSubs = pushSubscriptions.get(roomId)
    if (!roomSubs || roomSubs.size === 0) {
      logPush(`Notify for room ${roomId} — no subscriptions registered`)
      return
    }

    let sent = 0, skipped = 0
    roomSubs.forEach((subscription, endpoint) => {
      // Skip the sender's own subscription
      if (senderEndpoint && endpoint === senderEndpoint) { skipped++; return }

      const epShort = endpoint.slice(-24)
      sent++
      webpush.sendNotification(subscription, payload)
        .then(() => logPush(`✓ Delivered push to …${epShort} (room: ${roomId})`))
        .catch((err) => {
          const code = err.statusCode || 'unknown'
          logPush(`✗ Push to …${epShort} failed: ${code} — ${err.message || ''}`)
          if (err.statusCode === 410 || err.statusCode === 404) {
            roomSubs.delete(endpoint)
            expiredEndpoints.add(endpoint)
            logPush(`Removed expired endpoint …${epShort} (${roomSubs.size} remaining in room ${roomId})`)
          }
        })
    })
    logPush(`Notify room ${roomId}: ${sent} push(es) sent, ${skipped} skipped (sender)`)
  }
})

server.listen(PORT, () => {
  logStats(`Signaling server listening on port ${PORT}`)
  logStats(`VAPID subject: ${VAPID_SUBJECT}`)
})

setInterval(() => {
  const totalPeers = Array.from(rooms.values()).reduce((n, r) => n + r.size, 0)
  const totalSubs = Array.from(pushSubscriptions.values()).reduce((n, m) => n + m.size, 0)
  logStats(`Rooms: ${rooms.size} | Peers: ${totalPeers} | Push subs: ${totalSubs} | WS clients: ${wss.clients.size} | Pending polls: ${pendingPolls.size}`)
  if (rooms.size > 0) {
    rooms.forEach((room, roomId) => {
      const names = Array.from(room.values()).map(c => c.username).join(', ')
      const subs = pushSubscriptions.get(roomId)?.size || 0
      logStats(`  ${roomId}: ${room.size} peer(s) [${names}] | ${subs} push sub(s)`)
    })
  }
}, 60000)

process.on('SIGTERM', () => {
  logStats('SIGTERM received — shutting down gracefully…')
  wss.clients.forEach((client) => {
    client.close(1001, 'server shutting down')
  })
  server.close(() => {
    logStats('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logStats('SIGINT received — shutting down…')
  wss.clients.forEach((client) => {
    client.close(1001, 'server shutting down')
  })
  server.close(() => {
    logStats('Server closed')
    process.exit(0)
  })
})
