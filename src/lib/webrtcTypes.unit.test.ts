import { describe, expect, it } from 'vitest'
// webrtcTypes.ts is pure type declarations, no runtime code to test.
// We verify the types compile correctly by importing them.
import type {
  SyncPayload,
  SyncHello,
  HistoryRequest,
  HistoryResponse,
  WebRTCCallbacks,
} from './webrtcTypes'

describe('webrtcTypes', () => {
  it('exports SyncPayload type', () => {
    const payload: SyncPayload = { room: null, channels: [], messages: [] }
    expect(payload).toBeDefined()
  })

  it('exports SyncHello type', () => {
    const hello: SyncHello = { lastMessageId: null, knownMessageIds: [], knownChannelIds: [], roomCreatedAt: 0 }
    expect(hello).toBeDefined()
  })

  it('exports HistoryRequest type', () => {
    const req: HistoryRequest = { requestId: 'r1', channelId: 'c1', beforeMessageId: null, limit: 50 }
    expect(req).toBeDefined()
  })

  it('exports HistoryResponse type', () => {
    const res: HistoryResponse = { requestId: 'r1', channelId: 'c1', messages: [], hasMore: false }
    expect(res).toBeDefined()
  })

  it('exports WebRTCCallbacks type', () => {
    const cb: WebRTCCallbacks = {}
    expect(cb).toBeDefined()
  })
})
