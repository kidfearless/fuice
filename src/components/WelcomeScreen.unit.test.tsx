import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = vi.hoisted(() => ({})) as unknown as ReturnType<typeof createMockP2PContext>
Object.assign(mockContext, createMockP2PContext())
vi.mock('@/lib/P2PContext', async () => {
  const { createContext } = await vi.importActual<typeof import('react')>('react')
  return {
    useP2P: () => mockContext,
    P2PContext: createContext(mockContext),
  }
})

// Must import after mock
import { WelcomeScreen } from './WelcomeScreen'

vi.mock('@/lib/sw-register', () => ({
  clearCacheAndUpdate: vi.fn(),
}))

describe('WelcomeScreen', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders RoomForm when user exists', () => {
    Object.assign(mockContext, createMockP2PContext({ currentUser: { id: 'u1', username: 'Alice', color: '#abc' } }))
    render(<WelcomeScreen />)
    // RoomForm has Create/Join tabs
    expect(screen.getByRole('tab', { name: /create/i })).toBeInTheDocument()
  })

  it('renders UsernameForm when no user', () => {
    Object.assign(mockContext, createMockP2PContext({ currentUser: null }))
    render(<WelcomeScreen />)
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
  })
})
