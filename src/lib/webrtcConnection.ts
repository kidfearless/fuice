import { Peer } from './types'

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export { STUN_SERVERS }

export interface NegotiationState {
  isNegotiating: Map<string, boolean>
  makingOffer: Map<string, boolean>
  ignoreOffer: Map<string, boolean>
  pendingCandidates: Map<string, RTCIceCandidateInit[]>
}

export function createNegotiationState(): NegotiationState {
  return {
    isNegotiating: new Map(),
    makingOffer: new Map(),
    ignoreOffer: new Map(),
    pendingCandidates: new Map(),
  }
}

export async function drainPendingCandidates(
  peers: Map<string, Peer>,
  state: NegotiationState,
  peerId: string
) {
  const queued = state.pendingCandidates.get(peerId)
  if (queued?.length) {
    state.pendingCandidates.delete(peerId)
    for (const c of queued) {
      try { await peers.get(peerId)?.connection?.addIceCandidate(c) }
      catch (err) { console.warn('Failed queued ICE candidate:', err) }
    }
  }
}

export async function handleIncomingCandidate(
  peers: Map<string, Peer>,
  state: NegotiationState,
  peerId: string,
  candidate: RTCIceCandidateInit
) {
  const peer = peers.get(peerId)
  if (!peer?.connection) return
  if (!peer.connection.remoteDescription) {
    let queue = state.pendingCandidates.get(peerId)
    if (!queue) { queue = []; state.pendingCandidates.set(peerId, queue) }
    queue.push(candidate)
    return
  }
  try { await peer.connection.addIceCandidate(candidate) }
  catch (err) { console.warn('Failed ICE candidate:', err) }
}

export async function handleIncomingAnswer(
  peers: Map<string, Peer>,
  state: NegotiationState,
  peerId: string,
  answer: RTCSessionDescriptionInit
) {
  const peer = peers.get(peerId)
  if (peer?.connection) {
    try {
      await peer.connection.setRemoteDescription(answer)
      state.makingOffer.set(peerId, false)
      await drainPendingCandidates(peers, state, peerId)
    } catch (err) {
      console.error('Failed to set remote description:', err)
    }
  }
}
