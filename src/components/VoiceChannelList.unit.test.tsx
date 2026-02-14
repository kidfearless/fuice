import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VoiceChannelList } from './VoiceChannelList'
import type { Channel, Peer, User } from '@/lib/types'

const channels: Channel[] = [
  { id: 'vc-1', name: 'General Voice', type: 'voice', createdAt: 1 },
  { id: 'vc-2', name: 'Music', type: 'voice', createdAt: 2 },
]

const currentUser: User = { id: 'u1', username: 'Alice', color: '#3498db' }

const peers: Peer[] = [
  { id: 'p1', username: 'Bob', isConnected: true, voiceChannelId: 'vc-1' },
  { id: 'p2', username: 'Eve', isConnected: true, voiceChannelId: 'vc-2', isScreenSharing: true, screenShareChannelId: 'vc-2' },
]

describe('VoiceChannelList', () => {
  it('renders voice channel names', () => {
    render(
      <VoiceChannelList
        channels={channels}
        activeVoiceChannel={null}
        currentUser={currentUser}
        peers={peers}
        speakingUsers={new Set()}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('General Voice')).toBeInTheDocument()
    expect(screen.getByText('Music')).toBeInTheDocument()
  })

  it('shows peers in their voice channels', () => {
    render(
      <VoiceChannelList
        channels={channels}
        activeVoiceChannel={null}
        currentUser={currentUser}
        peers={peers}
        speakingUsers={new Set()}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Eve')).toBeInTheDocument()
  })

  it('shows current user in their active voice channel', () => {
    render(
      <VoiceChannelList
        channels={channels}
        activeVoiceChannel="vc-1"
        currentUser={currentUser}
        peers={peers}
        speakingUsers={new Set()}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('calls onSelect when channel is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <VoiceChannelList
        channels={channels}
        activeVoiceChannel={null}
        currentUser={currentUser}
        peers={peers}
        speakingUsers={new Set()}
        onSelect={onSelect}
      />
    )
    await user.click(screen.getByText('General Voice'))
    expect(onSelect).toHaveBeenCalledWith('vc-1')
  })

  it('highlights speaking users', () => {
    const speakingPeers = [
      { id: 'p1', username: 'Bob', connected: true, voiceChannelId: 'vc-1', isSpeaking: true },
    ] as unknown
    const { container } = render(
      <VoiceChannelList
        channels={channels}
        activeVoiceChannel="vc-1"
        currentUser={currentUser}
        peers={speakingPeers}
        speakingUsers={new Set()}
        onSelect={vi.fn()}
      />
    )
    // Speaking users get ring-[2px] ring-[#23a55a]
    expect(container.querySelector('[class*="ring-"]')).toBeTruthy()
  })

  it('renders empty channels without users', () => {
    render(
      <VoiceChannelList
        channels={channels}
        activeVoiceChannel={null}
        currentUser={currentUser}
        peers={[]}
        speakingUsers={new Set()}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('General Voice')).toBeInTheDocument()
    // No user names should appear
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })
})
