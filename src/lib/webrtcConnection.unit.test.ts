import { describe, expect, it, vi } from 'vitest'
import {
  createNegotiationState,
  drainPendingCandidates,
  handleIncomingCandidate,
  handleIncomingAnswer,
  STUN_SERVERS,
} from './webrtcConnection'
import type { Peer } from './types'

function makePeer(id: string, opts: { remoteDesc?: boolean; addIceCandidate?: ReturnType<typeof vi.fn>; setRemoteDescription?: ReturnType<typeof vi.fn> } = {}): Peer {
  const addIceCandidate = opts.addIceCandidate ?? vi.fn().mockResolvedValue(undefined)
  const setRemoteDescription = opts.setRemoteDescription ?? vi.fn().mockResolvedValue(undefined)
  return {
    id,
    username: `User-${id}`,
    connected: true,
    connection: {
      addIceCandidate,
      setRemoteDescription,
      remoteDescription: opts.remoteDesc ? { type: 'offer', sdp: 'sdp' } : null,
    } as unknown as RTCPeerConnection,
  }
}

describe('webrtcConnection', () => {
  describe('STUN_SERVERS', () => {
    it('has at least one STUN server', () => {
      expect(STUN_SERVERS.length).toBeGreaterThanOrEqual(1)
      expect(STUN_SERVERS[0].urls).toContain('stun:')
    })
  })

  describe('createNegotiationState', () => {
    it('creates empty maps', () => {
      const state = createNegotiationState()
      expect(state.isNegotiating.size).toBe(0)
      expect(state.makingOffer.size).toBe(0)
      expect(state.ignoreOffer.size).toBe(0)
      expect(state.pendingCandidates.size).toBe(0)
    })
  })

  describe('drainPendingCandidates', () => {
    it('drains queued candidates', async () => {
      const addIce = vi.fn().mockResolvedValue(undefined)
      const peer = makePeer('p1', { addIceCandidate: addIce, remoteDesc: true })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()

      const cand1 = { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 }
      const cand2 = { candidate: 'c2', sdpMid: '0', sdpMLineIndex: 0 }
      state.pendingCandidates.set('p1', [cand1, cand2])

      await drainPendingCandidates(peers, state, 'p1')
      expect(addIce).toHaveBeenCalledTimes(2)
      expect(state.pendingCandidates.has('p1')).toBe(false)
    })

    it('does nothing when no pending candidates', async () => {
      const peer = makePeer('p1')
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()

      await drainPendingCandidates(peers, state, 'p1')
      // Should not throw
    })

    it('handles addIceCandidate failures gracefully', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const addIce = vi.fn().mockRejectedValue(new Error('fail'))
      const peer = makePeer('p1', { addIceCandidate: addIce, remoteDesc: true })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()
      state.pendingCandidates.set('p1', [{ candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 }])

      await drainPendingCandidates(peers, state, 'p1')
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('handleIncomingCandidate', () => {
    it('adds candidate directly when remote description is set', async () => {
      const addIce = vi.fn().mockResolvedValue(undefined)
      const peer = makePeer('p1', { addIceCandidate: addIce, remoteDesc: true })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()
      const candidate = { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 }

      await handleIncomingCandidate(peers, state, 'p1', candidate)
      expect(addIce).toHaveBeenCalledWith(candidate)
    })

    it('queues candidate when no remote description', async () => {
      const peer = makePeer('p1', { remoteDesc: false })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()
      const candidate = { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 }

      await handleIncomingCandidate(peers, state, 'p1', candidate)
      expect(state.pendingCandidates.get('p1')).toEqual([candidate])
    })

    it('appends to existing queue', async () => {
      const peer = makePeer('p1', { remoteDesc: false })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()

      await handleIncomingCandidate(peers, state, 'p1', { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 })
      await handleIncomingCandidate(peers, state, 'p1', { candidate: 'c2', sdpMid: '0', sdpMLineIndex: 0 })
      expect(state.pendingCandidates.get('p1')!.length).toBe(2)
    })

    it('does nothing for unknown peer', async () => {
      const peers = new Map<string, Peer>()
      const state = createNegotiationState()
      await handleIncomingCandidate(peers, state, 'unknown', { candidate: 'c', sdpMid: '0', sdpMLineIndex: 0 })
      // Should not throw
    })

    it('handles addIceCandidate failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const addIce = vi.fn().mockRejectedValue(new Error('ICE fail'))
      const peer = makePeer('p1', { addIceCandidate: addIce, remoteDesc: true })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()

      await handleIncomingCandidate(peers, state, 'p1', { candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 })
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('handleIncomingAnswer', () => {
    it('sets remote description and drains candidates', async () => {
      const setRemote = vi.fn().mockResolvedValue(undefined)
      const addIce = vi.fn().mockResolvedValue(undefined)
      const peer = makePeer('p1', { setRemoteDescription: setRemote, addIceCandidate: addIce })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()
      state.makingOffer.set('p1', true)

      const answer: RTCSessionDescriptionInit = { type: 'answer', sdp: 'answer-sdp' }
      await handleIncomingAnswer(peers, state, 'p1', answer)

      expect(setRemote).toHaveBeenCalledWith(answer)
      expect(state.makingOffer.get('p1')).toBe(false)
    })

    it('does nothing for unknown peer', async () => {
      const peers = new Map<string, Peer>()
      const state = createNegotiationState()
      await handleIncomingAnswer(peers, state, 'unknown', { type: 'answer', sdp: 'sdp' })
      // Should not throw
    })

    it('handles setRemoteDescription failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const setRemote = vi.fn().mockRejectedValue(new Error('fail'))
      const peer = makePeer('p1', { setRemoteDescription: setRemote })
      const peers = new Map([['p1', peer]])
      const state = createNegotiationState()

      await handleIncomingAnswer(peers, state, 'p1', { type: 'answer', sdp: 'sdp' })
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
