import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  playJoinSound,
  playLeaveSound,
  playMuteSound,
  playUnmuteSound,
  playDeafenSound,
  playUndeafenSound,
  playViewerJoinSound,
  playViewerLeaveSound,
  playStreamEndedSound,
} from './voiceSounds'

// Mock AudioContext since jsdom doesn't provide it
class MockOscillatorNode {
  type = 'sine'
  frequency = { value: 0, setValueAtTime: vi.fn() }
  connect = vi.fn().mockReturnThis()
  start = vi.fn()
  stop = vi.fn()
}

class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn().mockReturnThis()
}

class MockAudioContext {
  state = 'running' as AudioContextState
  currentTime = 0
  destination = {} as AudioDestinationNode
  createOscillator = vi.fn(() => new MockOscillatorNode())
  createGain = vi.fn(() => new MockGainNode())
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn()
}

describe('voiceSounds', () => {
  beforeEach(() => {
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('playJoinSound creates oscillators', () => {
    expect(() => playJoinSound()).not.toThrow()
  })

  it('playLeaveSound creates oscillators', () => {
    expect(() => playLeaveSound()).not.toThrow()
  })

  it('playMuteSound creates oscillators', () => {
    expect(() => playMuteSound()).not.toThrow()
  })

  it('playUnmuteSound creates oscillators', () => {
    expect(() => playUnmuteSound()).not.toThrow()
  })

  it('playDeafenSound creates oscillators', () => {
    expect(() => playDeafenSound()).not.toThrow()
  })

  it('playUndeafenSound creates oscillators', () => {
    expect(() => playUndeafenSound()).not.toThrow()
  })

  it('playViewerJoinSound creates oscillators', () => {
    expect(() => playViewerJoinSound()).not.toThrow()
  })

  it('playViewerLeaveSound creates oscillators', () => {
    expect(() => playViewerLeaveSound()).not.toThrow()
  })

  it('playStreamEndedSound creates oscillators', () => {
    expect(() => playStreamEndedSound()).not.toThrow()
  })

  it('resumes suspended context', () => {
    // Create context with suspended state
    const SuspendedCtx = class extends MockAudioContext {
      state = 'suspended' as AudioContextState
    }
    globalThis.AudioContext = SuspendedCtx as unknown as typeof AudioContext
    expect(() => playJoinSound()).not.toThrow()
  })
})
