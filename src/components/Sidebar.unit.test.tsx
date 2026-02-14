import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/crypto', () => ({
  getRoomKey: vi.fn().mockResolvedValue(null),
  buildShareUrl: vi.fn().mockReturnValue('https://example.com/join?code=ROOM1'),
}))

vi.mock('@/lib/helpers', () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('@/lib/sw-register', () => ({
  clearCacheAndUpdate: vi.fn(),
}))

// Mock child components   
vi.mock('@/components/SettingsDialog', () => ({ SettingsDialog: () => <div data-testid="settings-dialog" /> }))
vi.mock('@/components/ServerStatus', () => ({ ServerStatus: () => <div data-testid="server-status" /> }))
vi.mock('@/components/TextChannelList', () => ({
  TextChannelList: (props: unknown) => (
    <div data-testid="text-channel-list">
      {props.channels?.map((c: unknown) => <div key={c.id}>{c.name}</div>)}
    </div>
  ),
}))
vi.mock('@/components/VoiceChannelList', () => ({
  VoiceChannelList: (props: unknown) => (
    <div data-testid="voice-channel-list">
      {props.channels?.map((c: unknown) => <div key={c.id}>{c.name}</div>)}
    </div>
  ),
}))
vi.mock('@/components/PeerList', () => ({
  PeerList: () => <div data-testid="peer-list" />,
}))

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('renders the room name', () => {
    render(<Sidebar />)
    expect(screen.getByText('Test Room')).toBeInTheDocument()
  })

  it('renders peer count', () => {
    Object.assign(mockContext, createMockP2PContext({
      peers: [{ id: 'p1', username: 'Bob', connected: true }] as unknown,
    }))
    render(<Sidebar />)
    expect(screen.getByText(/1 peer/)).toBeInTheDocument()
  })

  it('renders the room code', () => {
    render(<Sidebar />)
    expect(screen.getByText('room-1')).toBeInTheDocument()
  })

  it('renders text and voice channel lists', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('text-channel-list')).toBeInTheDocument()
    expect(screen.getByTestId('voice-channel-list')).toBeInTheDocument()
  })

  it('renders peer list', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('peer-list')).toBeInTheDocument()
  })

  it('renders settings and leave room buttons', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('settings-dialog')).toBeInTheDocument()
    expect(screen.getByText('Leave Room')).toBeInTheDocument()
  })

  it('shows voice connected bar when in voice channel', () => {
    Object.assign(mockContext, createMockP2PContext({
      activeVoiceChannel: 'vc-1',
    }))
    render(<Sidebar />)
    expect(screen.getByText('Voice Connected')).toBeInTheDocument()
    // The voice channel name appears in the voice bar
    expect(screen.getAllByText('Voice').length).toBeGreaterThanOrEqual(1)
  })

  it('hides voice bar when not in voice channel', () => {
    Object.assign(mockContext, createMockP2PContext({ activeVoiceChannel: null }))
    render(<Sidebar />)
    expect(screen.queryByText('Voice Connected')).not.toBeInTheDocument()
  })

  it('calls leaveRoom on leave button click', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)
    await user.click(screen.getByText('Leave Room'))
    expect(mockContext.leaveRoom).toHaveBeenCalledWith(true, true)
  })

  it('calls toggleMute when mute button clicked in voice bar', async () => {
    const user = userEvent.setup()
    Object.assign(mockContext, createMockP2PContext({ activeVoiceChannel: 'vc-1' }))
    render(<Sidebar />)
    // Find the mute button by title
    const muteBtn = screen.getByTitle('Mute')
    await user.click(muteBtn)
    expect(mockContext.toggleMute).toHaveBeenCalled()
  })
})
