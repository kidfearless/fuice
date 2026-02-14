import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePeers } from './usePeers'
import type { Peer } from '@/lib/types'

class MockMediaStream {
  id = crypto.randomUUID()
  getTracks() { return [] }
  getAudioTracks() { return [] }
  getVideoTracks() { return [] }
}

function makePeer(id: string, extra: Partial<Peer> = {}): Peer {
  return { id, username: `User-${id}`, isConnected: true, ...extra }
}

describe('usePeers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.MediaStream = MockMediaStream as unknown
  })

  it('starts with empty arrays and maps', () => {
    const { result } = renderHook(() => usePeers())
    expect(result.current.peers).toEqual([])
    expect(result.current.remoteStreams.size).toBe(0)
    expect(result.current.remoteScreenStreams.size).toBe(0)
    expect(result.current.remoteCameraStreams.size).toBe(0)
    expect(result.current.speakingUsers.size).toBe(0)
  })

  it('handlePeerConnected adds a new peer', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1')) })
    expect(result.current.peers).toHaveLength(1)
    expect(result.current.peers[0].id).toBe('p1')
  })

  it('handlePeerConnected replaces existing peer with same id', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1', { username: 'Old' })) })
    act(() => { result.current.handlePeerConnected(makePeer('p1', { username: 'New' })) })
    expect(result.current.peers).toHaveLength(1)
    expect(result.current.peers[0].username).toBe('New')
  })

  it('handlePeerDisconnected removes peer and all associated streams', () => {
    const { result } = renderHook(() => usePeers())
    const stream = new MockMediaStream() as unknown as MediaStream
    act(() => {
      result.current.handlePeerConnected(makePeer('p1'))
      result.current.handleRemoteStream('p1', stream)
      result.current.handleRemoteScreenStream('p1', stream)
      result.current.handleRemoteCameraStream('p1', stream)
    })
    expect(result.current.peers).toHaveLength(1)
    expect(result.current.remoteStreams.size).toBe(1)

    act(() => { result.current.handlePeerDisconnected('p1') })
    expect(result.current.peers).toHaveLength(0)
    expect(result.current.remoteStreams.size).toBe(0)
    expect(result.current.remoteScreenStreams.size).toBe(0)
    expect(result.current.remoteCameraStreams.size).toBe(0)
  })

  it('handleRemoteStream sets stream for peer', () => {
    const { result } = renderHook(() => usePeers())
    const stream = new MockMediaStream() as unknown as MediaStream
    act(() => { result.current.handleRemoteStream('p1', stream) })
    expect(result.current.remoteStreams.get('p1')).toBe(stream)
  })

  it('handleRemoteScreenStream sets screen stream for peer', () => {
    const { result } = renderHook(() => usePeers())
    const stream = new MockMediaStream() as unknown as MediaStream
    act(() => { result.current.handleRemoteScreenStream('p1', stream) })
    expect(result.current.remoteScreenStreams.get('p1')).toBe(stream)
  })

  it('handleRemoteCameraStream sets camera stream for peer', () => {
    const { result } = renderHook(() => usePeers())
    const stream = new MockMediaStream() as unknown as MediaStream
    act(() => { result.current.handleRemoteCameraStream('p1', stream) })
    expect(result.current.remoteCameraStreams.get('p1')).toBe(stream)
  })

  it('handleVoiceStateChanged updates peer voiceChannelId', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1')) })
    act(() => { result.current.handleVoiceStateChanged('p1', 'vc-1') })
    expect(result.current.peers[0].voiceChannelId).toBe('vc-1')
  })

  it('handleVoiceStateChanged with null clears voiceChannelId', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1', { voiceChannelId: 'vc-1' })) })
    act(() => { result.current.handleVoiceStateChanged('p1', null) })
    expect(result.current.peers[0].voiceChannelId).toBeUndefined()
  })

  it('handlePeerSpeaking sets speaking state and updates speakingUsers', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1')) })
    act(() => { result.current.handlePeerSpeaking('p1', true) })
    expect(result.current.peers[0].isSpeaking).toBe(true)
    expect(result.current.speakingUsers.has('p1')).toBe(true)

    act(() => { result.current.handlePeerSpeaking('p1', false) })
    expect(result.current.peers[0].isSpeaking).toBe(false)
    expect(result.current.speakingUsers.has('p1')).toBe(false)
  })

  it('handlePeerUserInfo updates username', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1', { username: 'Old' })) })
    act(() => { result.current.handlePeerUserInfo('p1', 'NewName') })
    expect(result.current.peers[0].username).toBe('NewName')
  })

  it('handlePeerScreenShareStateChanged sets screen share flags', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1')) })
    act(() => { result.current.handlePeerScreenShareStateChanged('p1', 'vc-1') })
    expect(result.current.peers[0].isScreenSharing).toBe(true)
    expect(result.current.peers[0].screenShareChannelId).toBe('vc-1')
  })

  it('handlePeerScreenShareStateChanged null clears screen stream', () => {
    const { result } = renderHook(() => usePeers())
    const stream = new MockMediaStream() as unknown as MediaStream
    act(() => {
      result.current.handlePeerConnected(makePeer('p1'))
      result.current.handleRemoteScreenStream('p1', stream)
    })
    act(() => { result.current.handlePeerScreenShareStateChanged('p1', null) })
    expect(result.current.peers[0].isScreenSharing).toBe(false)
    expect(result.current.remoteScreenStreams.has('p1')).toBe(false)
  })

  it('handlePeerCameraStateChanged off removes camera stream', () => {
    const { result } = renderHook(() => usePeers())
    const stream = new MockMediaStream() as unknown as MediaStream
    act(() => {
      result.current.handlePeerConnected(makePeer('p1'))
      result.current.handleRemoteCameraStream('p1', stream)
    })
    act(() => { result.current.handlePeerCameraStateChanged('p1', false) })
    expect(result.current.peers[0].isCameraOn).toBe(false)
    expect(result.current.remoteCameraStreams.has('p1')).toBe(false)
  })

  it('handlePeerCameraStateChanged on sets camera flag', () => {
    const { result } = renderHook(() => usePeers())
    act(() => { result.current.handlePeerConnected(makePeer('p1')) })
    act(() => { result.current.handlePeerCameraStateChanged('p1', true) })
    expect(result.current.peers[0].isCameraOn).toBe(true)
  })
})
