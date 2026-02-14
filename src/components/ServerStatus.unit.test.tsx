import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/notifications', () => ({
  loadNotificationSettings: vi.fn().mockReturnValue({ soundEnabled: true, desktopEnabled: false, volume: 0.5 }),
  getNotificationPermission: vi.fn().mockReturnValue('default'),
}))

import { ServerStatus } from './ServerStatus'

describe('ServerStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('returns null when no current room', () => {
    Object.assign(mockContext, createMockP2PContext({ currentRoom: null }))
    const { container } = render(<ServerStatus />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the status trigger button', () => {
    render(<ServerStatus />)
    // The trigger has a shield icon
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('shows signaling status when popover opened', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    Object.assign(mockContext, createMockP2PContext({
      isSignalingConnected: true,
      hasRoomKey: true,
    }))
    render(<ServerStatus />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Room Status')).toBeInTheDocument()
    expect(screen.getByText('Signaling')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows encryption status', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    Object.assign(mockContext, createMockP2PContext({
      isSignalingConnected: true,
      hasRoomKey: true,
    }))
    render(<ServerStatus />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Encryption')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('shows disconnected state', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    Object.assign(mockContext, createMockP2PContext({
      isSignalingConnected: false,
      hasRoomKey: false,
    }))
    render(<ServerStatus />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByText('No Key')).toBeInTheDocument()
  })

  it('shows peer count', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    Object.assign(mockContext, createMockP2PContext({
      peers: [
        { id: 'p1', username: 'Bob', connected: true },
        { id: 'p2', username: 'Carol', connected: true },
      ] as unknown,
    }))
    render(<ServerStatus />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('2 connected')).toBeInTheDocument()
  })

  it('shows Web APIs section', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<ServerStatus />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Web APIs')).toBeInTheDocument()
    expect(screen.getByText('WebRTC')).toBeInTheDocument()
    expect(screen.getByText('IndexedDB')).toBeInTheDocument()
  })
})
