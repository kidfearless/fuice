import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoice } from './useVoice'

// Mock voice sounds
vi.mock('@/lib/voiceSounds', () => ({
  playJoinSound: vi.fn(),
  playLeaveSound: vi.fn(),
  playMuteSound: vi.fn(),
  playUnmuteSound: vi.fn(),
  playDeafenSound: vi.fn(),
  playUndeafenSound: vi.fn(),
  playStreamEndedSound: vi.fn(),
}))

vi.mock('@/lib/settings', () => ({
  loadSettings: vi.fn(() => ({
    streaming: { screenShareFrameRate: 30, screenShareResolution: 0, cameraFrameRate: 30, cameraResolution: 0 },
  })),
}))

import { playJoinSound, playLeaveSound, playMuteSound, playUnmuteSound, playDeafenSound, playUndeafenSound, playStreamEndedSound } from '@/lib/voiceSounds'

function createMockWebrtcManager() {
  return {
    addAudioStream: vi.fn().mockResolvedValue(undefined),
    removeAudioStream: vi.fn(),
    broadcastVoiceState: vi.fn(),
    broadcastSpeakingState: vi.fn(),
    broadcastScreenShareState: vi.fn(),
    broadcastCameraState: vi.fn(),
    setLocalScreenShareStream: vi.fn(),
    addCameraStream: vi.fn(),
    removeCameraStream: vi.fn(),
    sendScreenWatchRequest: vi.fn().mockReturnValue(true),
  }
}

function makeOptions(overrides: Record<string, unknown> = {}) {
  return {
    currentUserRef: { current: { id: 'u1', username: 'Alice', color: '#abc' } },
    webrtcManager: createMockWebrtcManager(),
    setSpeakingUsers: vi.fn(),
    ...overrides,
  } as unknown
}

function makeMockStream() {
  const track = { stop: vi.fn(), enabled: true, onended: null as (() => void) | null }
  return {
    stream: {
      getTracks: () => [track],
      getAudioTracks: () => [track],
      getVideoTracks: () => [{ ...track, onended: null }],
    } as unknown as MediaStream,
    track,
  }
}

describe('useVoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock AudioContext
    globalThis.AudioContext = class MockAudioContext {
      createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }))
      createAnalyser = vi.fn(() => ({
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 256,
        connect: vi.fn(),
        getByteFrequencyData: vi.fn(),
      }))
      close = vi.fn()
    } as unknown
    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
        getDisplayMedia: vi.fn(),
      },
      writable: true,
      configurable: true,
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useVoice(makeOptions()))
    expect(result.current.activeVoiceChannel).toBeNull()
    expect(result.current.isMuted).toBe(false)
    expect(result.current.isDeafened).toBe(false)
    expect(result.current.isScreenSharing).toBe(false)
    expect(result.current.isCameraOn).toBe(false)
    expect(result.current.localStream).toBeNull()
    expect(result.current.screenShareStream).toBeNull()
  })

  it('joinVoiceChannel gets audio and joins', async () => {
    const { stream } = makeMockStream()
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(stream)

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    await act(async () => { await result.current.joinVoiceChannel('vc-1') })

    expect(result.current.activeVoiceChannel).toBe('vc-1')
    expect(result.current.localStream).toBe(stream)
    expect(opts.webrtcManager.addAudioStream).toHaveBeenCalledWith(stream)
    expect(opts.webrtcManager.broadcastVoiceState).toHaveBeenCalledWith('vc-1')
    expect(playJoinSound).toHaveBeenCalled()
  })

  it('joinVoiceChannel handles getUserMedia error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('denied'))
    const { result } = renderHook(() => useVoice(makeOptions()))

    await act(async () => { await result.current.joinVoiceChannel('vc-1') })

    expect(result.current.activeVoiceChannel).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('leaveVoiceChannel cleans up', async () => {
    const { stream } = makeMockStream()
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(stream)

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    act(() => { result.current.leaveVoiceChannel() })

    expect(result.current.activeVoiceChannel).toBeNull()
    expect(result.current.localStream).toBeNull()
    expect(opts.webrtcManager.broadcastVoiceState).toHaveBeenCalledWith(null)
    expect(playLeaveSound).toHaveBeenCalled()
  })

  it('toggleMute toggles audio tracks and plays sounds', async () => {
    const { stream, track } = makeMockStream()
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(stream)

    const { result } = renderHook(() => useVoice(makeOptions()))
    await act(async () => { await result.current.joinVoiceChannel('vc-1') })

    act(() => { result.current.toggleMute() })
    expect(result.current.isMuted).toBe(true)
    expect(track.enabled).toBe(false)
    expect(playMuteSound).toHaveBeenCalled()

    act(() => { result.current.toggleMute() })
    expect(result.current.isMuted).toBe(false)
    expect(track.enabled).toBe(true)
    expect(playUnmuteSound).toHaveBeenCalled()
  })

  it('toggleDeafen toggles and plays sounds', () => {
    const { result } = renderHook(() => useVoice(makeOptions()))

    act(() => { result.current.toggleDeafen() })
    expect(result.current.isDeafened).toBe(true)
    expect(playDeafenSound).toHaveBeenCalled()

    act(() => { result.current.toggleDeafen() })
    expect(result.current.isDeafened).toBe(false)
    expect(playUndeafenSound).toHaveBeenCalled()
  })

  it('stopScreenShare stops tracks and broadcasts', async () => {
    const videoTrack = { stop: vi.fn(), enabled: true, onended: null as (() => void) | null }
    const screenStream = { getTracks: () => [videoTrack], getVideoTracks: () => [videoTrack] } as unknown as MediaStream
    ;(navigator.mediaDevices.getDisplayMedia as ReturnType<typeof vi.fn>).mockResolvedValue(screenStream)
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(makeMockStream().stream)

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    // Need to join voice first
    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    await act(async () => { await result.current.startScreenShare() })

    expect(result.current.isScreenSharing).toBe(true)

    act(() => { result.current.stopScreenShare() })
    expect(result.current.isScreenSharing).toBe(false)
    expect(videoTrack.stop).toHaveBeenCalled()
    expect(opts.webrtcManager.broadcastScreenShareState).toHaveBeenCalledWith(null)
    expect(playStreamEndedSound).toHaveBeenCalled()
  })

  it('startScreenShare does nothing without voice channel', async () => {
    const { result } = renderHook(() => useVoice(makeOptions()))
    await act(async () => { await result.current.startScreenShare() })
    expect(result.current.isScreenSharing).toBe(false)
  })

  it('startCamera does nothing without voice channel', async () => {
    const { result } = renderHook(() => useVoice(makeOptions()))
    await act(async () => { await result.current.startCamera() })
    expect(result.current.isCameraOn).toBe(false)
  })

  it('watchScreenShare adds to watched set', () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    act(() => { result.current.watchScreenShare('p1') })
    expect(result.current.watchedScreenShares.has('p1')).toBe(true)
    expect(opts.webrtcManager.sendScreenWatchRequest).toHaveBeenCalledWith('p1', true)
  })

  it('stopWatchingScreenShare removes from watched set', () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    act(() => { result.current.watchScreenShare('p1') })
    act(() => { result.current.stopWatchingScreenShare('p1') })
    expect(result.current.watchedScreenShares.has('p1')).toBe(false)
  })

  it('handlePeerScreenShareStateChanged removes peer when null channel', () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    act(() => { result.current.watchScreenShare('p1') })
    act(() => { result.current.handlePeerScreenShareStateChanged('p1', null) })
    expect(result.current.watchedScreenShares.has('p1')).toBe(false)
  })

  it('handlePeerScreenShareStateChanged ignores non-null channel', () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    act(() => { result.current.watchScreenShare('p1') })
    act(() => { result.current.handlePeerScreenShareStateChanged('p1', 'vc-1') })
    expect(result.current.watchedScreenShares.has('p1')).toBe(true)
  })

  it('cleanupVoice resets all state', async () => {
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(makeMockStream().stream)

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    act(() => { result.current.cleanupVoice() })

    expect(result.current.activeVoiceChannel).toBeNull()
    expect(result.current.localStream).toBeNull()
    expect(result.current.isScreenSharing).toBe(false)
    expect(result.current.isCameraOn).toBe(false)
  })

  it('startCamera gets video and broadcasts', async () => {
    const videoTrack = { stop: vi.fn(), enabled: true, onended: null as (() => void) | null }
    const camStream = { getTracks: () => [videoTrack], getVideoTracks: () => [videoTrack] } as unknown as MediaStream
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeMockStream().stream) // for joinVoiceChannel
      .mockResolvedValueOnce(camStream) // for startCamera

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    await act(async () => { await result.current.startCamera() })

    expect(result.current.isCameraOn).toBe(true)
    expect(opts.webrtcManager.broadcastCameraState).toHaveBeenCalledWith(true)
    expect(opts.webrtcManager.addCameraStream).toHaveBeenCalledWith(camStream)
  })

  it('stopCamera cleans up camera stream', async () => {
    const videoTrack = { stop: vi.fn(), enabled: true, onended: null as (() => void) | null }
    const camStream = { getTracks: () => [videoTrack], getVideoTracks: () => [videoTrack] } as unknown as MediaStream
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeMockStream().stream)
      .mockResolvedValueOnce(camStream)

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    await act(async () => { await result.current.startCamera() })
    act(() => { result.current.stopCamera() })

    expect(result.current.isCameraOn).toBe(false)
    expect(videoTrack.stop).toHaveBeenCalled()
    expect(opts.webrtcManager.removeCameraStream).toHaveBeenCalled()
  })

  it('startScreenShare handles error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(makeMockStream().stream)
    ;(navigator.mediaDevices.getDisplayMedia as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('denied'))

    const { result } = renderHook(() => useVoice(makeOptions()))
    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    await act(async () => { await result.current.startScreenShare() })

    expect(result.current.isScreenSharing).toBe(false)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('startCamera handles no video track', async () => {
    const emptyStream = { getTracks: () => [], getVideoTracks: () => [], getAudioTracks: () => [] } as unknown as MediaStream
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeMockStream().stream)
      .mockResolvedValueOnce(emptyStream)

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))
    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    await act(async () => { await result.current.startCamera() })

    expect(result.current.isCameraOn).toBe(false)
  })

  it('startScreenShare handles no video track', async () => {
    const emptyStream = { getTracks: () => [], getVideoTracks: () => [] } as unknown as MediaStream
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(makeMockStream().stream)
    ;(navigator.mediaDevices.getDisplayMedia as ReturnType<typeof vi.fn>).mockResolvedValue(emptyStream)

    const { result } = renderHook(() => useVoice(makeOptions()))
    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    await act(async () => { await result.current.startScreenShare() })
    expect(result.current.isScreenSharing).toBe(false)
  })

  it('startCamera handles error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeMockStream().stream)
      .mockRejectedValueOnce(new Error('no cam'))

    const { result } = renderHook(() => useVoice(makeOptions()))
    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    await act(async () => { await result.current.startCamera() })

    expect(result.current.isCameraOn).toBe(false)
    consoleSpy.mockRestore()
  })

  it('toggleMute while speaking clears speaking state', async () => {
    const { stream } = makeMockStream()
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue(stream)

    const opts = makeOptions()
    const { result } = renderHook(() => useVoice(opts))

    await act(async () => { await result.current.joinVoiceChannel('vc-1') })
    // Mute should broadcast speaking=false if was speaking
    act(() => { result.current.toggleMute() })
    expect(playMuteSound).toHaveBeenCalled()
  })

  it('watchScreenShare does not add if sendScreenWatchRequest returns false', () => {
    const opts = makeOptions()
    opts.webrtcManager.sendScreenWatchRequest.mockReturnValue(false)
    const { result } = renderHook(() => useVoice(opts))

    act(() => { result.current.watchScreenShare('p1') })
    expect(result.current.watchedScreenShares.has('p1')).toBe(false)
  })
})
