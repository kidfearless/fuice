import { describe, expect, it } from 'vitest'
// types.ts is pure type declarations, no runtime code.
import type {
  FileMetadata,
  Message,
  ReactionEvent,
  Channel,
  User,
  Peer,
  Room,
  RoomHistory,
  SignalingMessage,
} from './types'

describe('types', () => {
  it('exports Message type', () => {
    const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: 'hi', timestamp: 1, synced: true }
    expect(msg).toBeDefined()
  })

  it('exports Channel type', () => {
    const ch: Channel = { id: 'ch1', name: 'general', type: 'text', createdAt: 1 }
    expect(ch).toBeDefined()
  })

  it('exports User type', () => {
    const user: User = { id: 'u1', username: 'Alice', color: 'red' }
    expect(user).toBeDefined()
  })

  it('exports Room type', () => {
    const room: Room = { id: 'r1', name: 'Room 1', channels: [], createdAt: 1 }
    expect(room).toBeDefined()
  })

  it('exports Peer type', () => {
    const peer: Peer = { id: 'p1', username: 'Bob', connected: true }
    expect(peer).toBeDefined()
  })

  it('exports RoomHistory type', () => {
    const rh: RoomHistory = { roomId: 'r1', roomName: 'Room', lastAccessed: 1, createdAt: 1, order: 0 }
    expect(rh).toBeDefined()
  })

  it('exports ReactionEvent type', () => {
    const re: ReactionEvent = { messageId: 'm1', emoji: '👍', userId: 'u1', username: 'A', action: 'add' }
    expect(re).toBeDefined()
  })

  it('exports FileMetadata type', () => {
    const fm: FileMetadata = { name: 'f.txt', size: 10, type: 'text/plain', chunks: 1, transferId: 'tf-1' }
    expect(fm).toBeDefined()
  })

  it('exports SignalingMessage type', () => {
    const sm: SignalingMessage = { type: 'offer', from: 'u1', data: {}, roomId: 'r1' }
    expect(sm).toBeDefined()
  })
})
