import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  formatTimestamp,
  formatTime,
  generateMessageId,
  generateRoomCode,
  generateUserId,
  generateChannelId,
  getUserColor,
  copyToClipboard,
} from './helpers'

describe('helpers', () => {
  describe('generateRoomCode', () => {
    it('generates 6-character room codes with expected charset', () => {
      const roomCode = generateRoomCode()
      expect(roomCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    })

    it('generates different codes on subsequent calls', () => {
      const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()))
      expect(codes.size).toBeGreaterThan(1)
    })
  })

  describe('generateUserId', () => {
    it('generates user IDs with the expected prefix', () => {
      const userId = generateUserId()
      expect(userId).toMatch(/^user-\d+-[a-z0-9]+$/)
    })

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateUserId()))
      expect(ids.size).toBe(10)
    })
  })

  describe('generateChannelId', () => {
    it('generates channel IDs with the expected prefix', () => {
      const channelId = generateChannelId()
      expect(channelId).toMatch(/^channel-\d+-[a-z0-9]+$/)
    })

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateChannelId()))
      expect(ids.size).toBe(10)
    })
  })

  describe('generateMessageId', () => {
    it('generates UUIDv7-style message IDs', () => {
      const messageId = generateMessageId()
      expect(messageId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    })

    it('generates chronologically sortable IDs', () => {
      const id1 = generateMessageId()
      const id2 = generateMessageId()
      expect(id2.replace(/-/g, '').slice(0, 12) >= id1.replace(/-/g, '').slice(0, 12)).toBe(true)
    })
  })

  describe('getUserColor', () => {
    it('returns stable user color for same username', () => {
      const first = getUserColor('alice')
      const second = getUserColor('alice')
      expect(first).toBe(second)
    })

    it('returns a valid oklch color string', () => {
      const color = getUserColor('bob')
      expect(color).toMatch(/^oklch\(/)
    })

    it('returns different colors for different usernames', () => {
      const colors = new Set(['alice', 'bob', 'charlie', 'dave', 'eve', 'frank'].map(getUserColor))
      expect(colors.size).toBeGreaterThanOrEqual(2)
    })

    it('handles empty string', () => {
      const color = getUserColor('')
      expect(color).toMatch(/^oklch\(/)
    })
  })

  describe('formatTimestamp', () => {
    it('formats recent timestamps as "Just now"', () => {
      const now = Date.now()
      expect(formatTimestamp(now - 20_000)).toBe('Just now')
      expect(formatTimestamp(now - 1000)).toBe('Just now')
    })

    it('formats minutes ago', () => {
      const now = Date.now()
      expect(formatTimestamp(now - 5 * 60_000)).toBe('5m ago')
      expect(formatTimestamp(now - 1 * 60_000)).toBe('1m ago')
      expect(formatTimestamp(now - 59 * 60_000)).toBe('59m ago')
    })

    it('formats hours ago', () => {
      const now = Date.now()
      expect(formatTimestamp(now - 2 * 60 * 60_000)).toBe('2h ago')
      expect(formatTimestamp(now - 23 * 60 * 60_000)).toBe('23h ago')
    })

    it('formats older timestamps as localized dates', () => {
      const now = Date.now()
      const twoDaysAgo = now - 2 * 24 * 60 * 60_000
      const result = formatTimestamp(twoDaysAgo)
      expect(result).not.toContain('ago')
      expect(result).not.toBe('Just now')
    })
  })

  describe('formatTime', () => {
    it('formats a timestamp into HH:MM format', () => {
      const ts = new Date(2025, 0, 15, 14, 30, 0).getTime()
      const result = formatTime(ts)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('works for midnight', () => {
      const ts = new Date(2025, 0, 15, 0, 0, 0).getTime()
      const result = formatTime(ts)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('copyToClipboard', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(),
        },
      })
    })

    it('returns true on successful copy', async () => {
      vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)
      const result = await copyToClipboard('hello')
      expect(result).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
    })

    it('returns false when clipboard API fails', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('fail'))
      const result = await copyToClipboard('hello')
      expect(result).toBe(false)
    })
  })
})
