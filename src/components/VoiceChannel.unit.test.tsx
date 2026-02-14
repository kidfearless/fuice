import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

import { VoiceChannel } from './VoiceChannel'

describe('VoiceChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('shows fallback when no voice channel selected', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: null,
    }))
    render(<VoiceChannel />)
    expect(screen.getByText('Select a voice channel to get started')).toBeInTheDocument()
  })

  it('shows fallback when text channel selected', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'ch-1', name: 'general', type: 'text', createdAt: 1 },
    }))
    render(<VoiceChannel />)
    expect(screen.getByText('Select a voice channel to get started')).toBeInTheDocument()
  })

  it('shows join prompt when viewing voice channel but not joined', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'vc-1', name: 'Voice', type: 'voice', createdAt: 1 },
      activeVoiceChannel: null, // not joined
    }))
    render(<VoiceChannel />)
    expect(screen.getByText('Voice')).toBeInTheDocument()
    expect(screen.getByText('Join Voice')).toBeInTheDocument()
  })

  it('calls joinVoiceChannel on join click', async () => {
    const user = userEvent.setup()
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'vc-1', name: 'Voice', type: 'voice', createdAt: 1 },
      activeVoiceChannel: null,
    }))
    render(<VoiceChannel />)
    await user.click(screen.getByText('Join Voice'))
    expect(mockContext.joinVoiceChannel).toHaveBeenCalledWith('vc-1')
  })

  it('shows connected UI when in voice channel', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'vc-1', name: 'TestVoice', type: 'voice', createdAt: 1 },
      activeVoiceChannel: 'vc-1',
      currentUser: { id: 'u1', username: 'Alice', color: '#3498db' },
    }))
    render(<VoiceChannel />)
    // When joined, should show the voice controls
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows peer count in unjoined state', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'vc-1', name: 'Voice', type: 'voice', createdAt: 1 },
      activeVoiceChannel: null,
      peers: [
        { id: 'p1', username: 'Bob', connected: true, voiceChannelId: 'vc-1' },
      ] as unknown,
    }))
    render(<VoiceChannel />)
    expect(screen.getByText(/1 user.* connected/)).toBeInTheDocument()
  })

  it('shows no users message when channel empty', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'vc-1', name: 'Voice', type: 'voice', createdAt: 1 },
      activeVoiceChannel: null,
      peers: [],
    }))
    render(<VoiceChannel />)
    expect(screen.getByText('No one is currently in this channel')).toBeInTheDocument()
  })
})
