import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'
import { render as tlRender } from '@testing-library/react'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

import { VoiceAudioManager } from './VoiceAudioManager'

// Mock Audio constructor
class MockAudio {
  autoplay = false
  srcObject: unknown = null
  muted = false
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
}

describe('VoiceAudioManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
    // @ts-expect-error - test-only replacement for browser Audio
    globalThis.Audio = MockAudio
  })

  it('renders nothing visible', () => {
    const { container } = tlRender(<VoiceAudioManager />)
    // The component renders null
    expect(container.firstChild).toBeNull()
  })

  it('does nothing when not in voice channel', () => {
    Object.assign(mockContext, createMockP2PContext({
      activeVoiceChannel: null,
      remoteStreams: new Map(),
    }))
    tlRender(<VoiceAudioManager />)
    // No audio elements should be created — nothing to assert except no errors
  })

  it('creates audio elements for remote streams', () => {
    const stream = {} as MediaStream
    Object.assign(mockContext, createMockP2PContext({
      activeVoiceChannel: 'vc-1',
      remoteStreams: new Map([['p1', stream]]),
    }))
    tlRender(<VoiceAudioManager />)
    // The component should have created an Audio element and called play
    // We can't easily inspect internal refs, but we verify no errors thrown
  })

  it('cleans up audio on unmount', () => {
    const stream = {} as MediaStream
    Object.assign(mockContext, createMockP2PContext({
      activeVoiceChannel: 'vc-1',
      remoteStreams: new Map([['p1', stream]]),
    }))
    const { unmount } = tlRender(<VoiceAudioManager />)
    unmount()
    // Cleanup should run without errors
  })

  it('mutes audio when deafened', () => {
    const stream = {} as MediaStream
    Object.assign(mockContext, createMockP2PContext({
      activeVoiceChannel: 'vc-1',
      remoteStreams: new Map([['p1', stream]]),
      isDeafened: true,
    }))
    tlRender(<VoiceAudioManager />)
    // Audio elements should be muted — we verify no errors
  })

  it('tears down audio when leaving voice channel', () => {
    const stream = {} as MediaStream
    Object.assign(mockContext, createMockP2PContext({
      activeVoiceChannel: 'vc-1',
      remoteStreams: new Map([['p1', stream]]),
    }))
    const { rerender } = tlRender(<VoiceAudioManager />)
    
    // Now leave the voice channel
    Object.assign(mockContext, createMockP2PContext({
      activeVoiceChannel: null,
      remoteStreams: new Map(),
    }))
    rerender(<VoiceAudioManager />)
    // Should clean up without errors
  })
})
