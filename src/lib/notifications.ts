import type { Message } from '@/lib/types'

// ── Notification settings ────────────────────────────────────────────
const NOTIF_SETTINGS_KEY = 'p2p-notification-settings'

export interface NotificationSettings {
  soundEnabled: boolean
  desktopEnabled: boolean
  volume: number // 0-1
}

const DEFAULT_NOTIF_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  desktopEnabled: true,
  volume: 0.5,
}

export function loadNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(NOTIF_SETTINGS_KEY)
    if (!stored) return DEFAULT_NOTIF_SETTINGS
    return { ...DEFAULT_NOTIF_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_NOTIF_SETTINGS
  }
}

export function saveNotificationSettings(settings: NotificationSettings) {
  localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings))
}

// ── Sound notification (Web Audio API blip) ──────────────────────────
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/**
 * Play a short pleasant notification blip using Web Audio API.
 * No external audio file needed.
 */
export function playNotificationSound(volume = 0.5) {
  try {
    const ctx = getAudioContext()

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // Create a pleasant two-tone blip
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)       // A5
    osc1.frequency.setValueAtTime(1174.66, now + 0.08) // D6

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.51, now)   // E6
    osc2.frequency.setValueAtTime(1760, now + 0.08) // A6

    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.02)
    gainNode.gain.linearRampToValueAtTime(volume * 0.2, now + 0.08)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.15)
    osc2.stop(now + 0.15)
  } catch (e) {
    console.warn('Failed to play notification sound:', e)
  }
}

// ── Desktop / Push notifications ─────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

/**
 * Show a desktop notification for an incoming message.
 * Falls back to service worker notification if available (works even when
 * the tab is in the background / app is installed as PWA).
 */
export async function showDesktopNotification(message: Message, roomName?: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const title = roomName
    ? `${message.username} in ${roomName}`
    : message.username

  const body = message.fileMetadata
    ? `📎 ${message.fileMetadata.name}`
    : message.content.length > 120
      ? message.content.slice(0, 120) + '…'
      : message.content

  const options: NotificationOptions = {
    body,
    tag: `msg-${message.id}`,     // de-duplicate rapid messages
    silent: true,                  // we already play our own sound
    icon: '/icons/icon-192.png',
  }

  // Prefer service-worker–based notification (works when minimized / PWA)
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      await reg.showNotification(title, options)
      return
    }
  } catch {
    // fall through to basic Notification
  }

  new Notification(title, options)
}

// ── Combined handler ─────────────────────────────────────────────────

/**
 * Called when a remote message is received. Decides whether to play sound
 * and/or show a desktop notification based on user settings and tab focus.
 */
export function notifyIncomingMessage(
  message: Message,
  currentUserId: string,
  activeChannelId: string | null,
  roomName?: string,
) {
  // Never notify for own messages
  if (message.userId === currentUserId) return

  const settings = loadNotificationSettings()

  // Play sound blip (even for the active channel — audible feedback)
  if (settings.soundEnabled) {
    playNotificationSound(settings.volume)
  }

  // Desktop notification only when the tab isn't focused or message is in a
  // different channel (so the user might not see it)
  const tabHidden = typeof document !== 'undefined' && document.hidden
  const differentChannel = message.channelId !== activeChannelId

  if (settings.desktopEnabled && (tabHidden || differentChannel)) {
    showDesktopNotification(message, roomName)
  }
}
