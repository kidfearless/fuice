import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/crypto', () => ({
  getRoomKey: vi.fn().mockResolvedValue(null),
  buildShareUrl: vi.fn().mockReturnValue('https://example.com/share'),
}))

import { ConnectionInfo } from './ConnectionInfo'

describe('ConnectionInfo', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns null when no room', () => {
    Object.assign(mockContext, createMockP2PContext({ currentRoom: null }))
    const { container } = render(<ConnectionInfo />)
    expect(container.innerHTML).toBe('')
  })

  it('displays room name', () => {
    Object.assign(mockContext, createMockP2PContext())
    render(<ConnectionInfo />)
    expect(screen.getByText(/Test Room/)).toBeInTheDocument()
  })

  it('shows connected badge when signaling is connected', () => {
    Object.assign(mockContext, createMockP2PContext({ isSignalingConnected: true }))
    render(<ConnectionInfo />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows offline badge when signaling is disconnected', () => {
    Object.assign(mockContext, createMockP2PContext({ isSignalingConnected: false }))
    render(<ConnectionInfo />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows peer count', () => {
    Object.assign(mockContext, createMockP2PContext({
      peers: [
        { id: 'p1', username: 'Bob', connected: true, isConnected: true },
        { id: 'p2', username: 'Eve', connected: false, isConnected: false },
      ],
    }))
    render(<ConnectionInfo />)
    // Should show connected peers count
    expect(screen.getByText(/peer/i)).toBeInTheDocument()
  })

  it('has copy button', () => {
    Object.assign(mockContext, createMockP2PContext())
    render(<ConnectionInfo />)
    const copyBtn = screen.getByRole('button')
    expect(copyBtn).toBeInTheDocument()
  })
})
