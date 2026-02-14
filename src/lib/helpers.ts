export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function generateChannelId(): string {
  return `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function generateMessageId(): string {
  return uuidv7()
}

/**
 * Generate a UUIDv7: a time-sortable UUID with 48-bit millisecond timestamp
 * and 74 bits of randomness. Allows chronological ordering by ID.
 */
function uuidv7(): string {
  const now = Date.now()
  // 48-bit timestamp in the first 6 bytes
  const timeHex = now.toString(16).padStart(12, '0')
  // Random bits for the rest
  const rand = new Uint8Array(10)
  crypto.getRandomValues(rand)
  // Set version (7) and variant (10xx) bits
  rand[0] = (rand[0] & 0x0f) | 0x70 // version 7
  rand[2] = (rand[2] & 0x3f) | 0x80 // variant 10xx
  const randHex = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('')
  // Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
  return (
    timeHex.slice(0, 8) + '-' +
    timeHex.slice(8, 12) + '-' +
    randHex.slice(0, 4) + '-' +
    randHex.slice(4, 8) + '-' +
    randHex.slice(8, 20)
  )
}

export function getUserColor(username: string): string {
  const colors = [
    'oklch(0.75 0.15 195)',
    'oklch(0.65 0.18 145)',
    'oklch(0.70 0.20 285)',
    'oklch(0.75 0.18 65)',
    'oklch(0.70 0.15 330)',
    'oklch(0.65 0.20 240)',
  ]
  
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) {
    return 'Just now'
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
