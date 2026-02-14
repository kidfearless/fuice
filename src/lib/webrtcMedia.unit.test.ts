import { describe, expect, it, vi } from 'vitest'
import { addStreamToPeers, removeStreamFromPeers, sendFileToPeers } from './webrtcMedia'
import { FileTransferManager } from './fileTransfer'
import type { Peer, Message } from './types'

function createMockPeer(id: string): Peer {
  const senders: { track: MediaStreamTrack | null }[] = []
  return {
    id,
    username: `User-${id}`,
    connected: true,
    connection: {
      addTrack: vi.fn((track: MediaStreamTrack, _stream: MediaStream) => {
        const sender = { track }
        senders.push(sender)
        return sender
      }),
      removeTrack: vi.fn(),
      getSenders: () => senders,
    } as unknown as RTCPeerConnection,
  }
}

function createMockStream(trackIds: string[]): MediaStream {
  const tracks = trackIds.map(id => ({ id, kind: 'audio' } as MediaStreamTrack))
  return {
    getTracks: () => tracks,
  } as unknown as MediaStream
}

describe('webrtcMedia', () => {
  describe('addStreamToPeers', () => {
    it('adds all tracks from stream to all peer connections', () => {
      const p1 = createMockPeer('p1')
      const p2 = createMockPeer('p2')
      const peers = new Map([['p1', p1], ['p2', p2]])
      const stream = createMockStream(['t1', 't2'])

      addStreamToPeers(peers, stream)

      expect(p1.connection!.addTrack).toHaveBeenCalledTimes(2)
      expect(p2.connection!.addTrack).toHaveBeenCalledTimes(2)
    })

    it('handles empty peers', () => {
      const peers = new Map<string, Peer>()
      const stream = createMockStream(['t1'])
      addStreamToPeers(peers, stream) // should not throw
    })

    it('handles peers without connections', () => {
      const p1: Peer = { id: 'p1', username: 'A', connected: true }
      const peers = new Map([['p1', p1]])
      const stream = createMockStream(['t1'])
      addStreamToPeers(peers, stream) // should not throw
    })
  })

  describe('removeStreamFromPeers', () => {
    it('removes matching tracks from peer connections', () => {
      const p1 = createMockPeer('p1')
      const peers = new Map([['p1', p1]])
      const stream = createMockStream(['t1'])

      // First add tracks so getSenders returns them
      addStreamToPeers(peers, stream)

      removeStreamFromPeers(peers, stream)
      expect(p1.connection!.removeTrack).toHaveBeenCalled()
    })

    it('handles peers without connections', () => {
      const p1: Peer = { id: 'p1', username: 'A', connected: true }
      const peers = new Map([['p1', p1]])
      const stream = createMockStream(['t1'])
      removeStreamFromPeers(peers, stream) // should not throw
    })
  })

  describe('sendFileToPeers', () => {
    it('sends file metadata and chunks to all open peers', async () => {
      const manager = new FileTransferManager()
      const sentMessages: (string | ArrayBuffer)[] = []
      const mockDC = {
        readyState: 'open',
        bufferedAmount: 0,
        send: vi.fn((msg: string | ArrayBuffer) => sentMessages.push(msg)),
        bufferedAmountLowThreshold: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as RTCDataChannel

      const peer: Peer = {
        id: 'p1',
        username: 'Alice',
        connected: true,
        dataChannel: mockDC,
      }
      const peers = new Map([['p1', peer]])

      // Create a small file mock
      const data = new Uint8Array([1, 2, 3, 4, 5])
      const file = {
        name: 'test.bin',
        size: 5,
        type: 'application/octet-stream',
        slice: (start: number, end: number) => ({
          arrayBuffer: () => Promise.resolve(data.slice(start, end).buffer),
        }),
      } as unknown as File

      const msg: Message = {
        id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: '', timestamp: 1, synced: true,
      }

      const transferId = await sendFileToPeers(peers, manager, file, msg)
      expect(transferId).toBeTruthy()
      // Should have sent metadata + chunk meta + chunk binary
      expect(mockDC.send).toHaveBeenCalled()
    })

    it('skips peers with closed data channels when sending chunks', async () => {
      const manager = new FileTransferManager()
      const mockDCOpen = {
        readyState: 'open',
        bufferedAmount: 0,
        send: vi.fn(),
        bufferedAmountLowThreshold: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as RTCDataChannel

      const mockDCClosed = {
        readyState: 'closed',
        bufferedAmount: 0,
        send: vi.fn(),
        bufferedAmountLowThreshold: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as RTCDataChannel

      const peers = new Map([
        ['p1', { id: 'p1', username: 'A', connected: true, dataChannel: mockDCOpen } as Peer],
        ['p2', { id: 'p2', username: 'B', connected: true, dataChannel: mockDCClosed } as Peer],
      ])

      const data = new Uint8Array([1])
      const file = {
        name: 'f.bin', size: 1, type: 'application/octet-stream',
        slice: () => ({ arrayBuffer: () => Promise.resolve(data.buffer) }),
      } as unknown as File
      const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: '', timestamp: 1, synced: true }

      await sendFileToPeers(peers, manager, file, msg)
      // Open DC got the metadata
      expect(mockDCOpen.send).toHaveBeenCalled()
      // Closed DC never sent anything
      expect(mockDCClosed.send).not.toHaveBeenCalled()
    })

    it('handles send errors gracefully', async () => {
      const manager = new FileTransferManager()
      const mockDC = {
        readyState: 'open',
        bufferedAmount: 0,
        send: vi.fn().mockImplementation((msg: unknown) => {
          // Throw on binary data only (chunk)
          if (msg instanceof ArrayBuffer) throw new Error('send failed')
        }),
        bufferedAmountLowThreshold: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as RTCDataChannel

      const peers = new Map([
        ['p1', { id: 'p1', username: 'A', connected: true, dataChannel: mockDC } as Peer],
      ])

      const data = new Uint8Array([1])
      const file = {
        name: 'f.bin', size: 1, type: 'application/octet-stream',
        slice: () => ({ arrayBuffer: () => Promise.resolve(data.buffer) }),
      } as unknown as File
      const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: '', timestamp: 1, synced: true }

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await sendFileToPeers(peers, manager, file, msg)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('waits for buffer drain on high buffered amount', async () => {
      const manager = new FileTransferManager()
      const mockDC = {
        readyState: 'open',
        bufferedAmount: 2 * 1024 * 1024, // Above high water
        send: vi.fn(),
        bufferedAmountLowThreshold: 0,
        addEventListener: vi.fn((event: string, cb: () => void) => {
          if (event === 'bufferedamountlow') {
            // Simulate drain after a tick
            setTimeout(() => {
              (mockDC as unknown as { bufferedAmount: number }).bufferedAmount = 0
              cb()
            }, 10)
          }
        }),
        removeEventListener: vi.fn(),
      } as unknown as RTCDataChannel

      const peers = new Map([
        ['p1', { id: 'p1', username: 'A', connected: true, dataChannel: mockDC } as Peer],
      ])

      const data = new Uint8Array([1])
      const file = {
        name: 'f.bin', size: 1, type: 'application/octet-stream',
        slice: () => ({ arrayBuffer: () => Promise.resolve(data.buffer) }),
      } as unknown as File
      const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: '', timestamp: 1, synced: true }

      await sendFileToPeers(peers, manager, file, msg)
      expect(mockDC.send).toHaveBeenCalled()
    })

    it('handles peers with no open data channels', async () => {
      const manager = new FileTransferManager()
      const peers = new Map([
        ['p1', { id: 'p1', username: 'A', connected: true } as Peer],
      ])
      const data = new Uint8Array([1])
      const file = {
        name: 'f.bin', size: 1, type: 'application/octet-stream',
        slice: () => ({ arrayBuffer: () => Promise.resolve(data.buffer) }),
      } as unknown as File
      const msg: Message = { id: 'm1', channelId: 'c1', userId: 'u1', username: 'A', content: '', timestamp: 1, synced: true }

      const transferId = await sendFileToPeers(peers, manager, file, msg)
      expect(transferId).toBeTruthy()
    })
  })
})
