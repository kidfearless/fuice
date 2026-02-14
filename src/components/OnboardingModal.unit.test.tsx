import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/notifications', () => ({
  loadNotificationSettings: vi.fn().mockReturnValue({ soundEnabled: true, desktopEnabled: false, volume: 0.5 }),
  saveNotificationSettings: vi.fn(),
  requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
  playNotificationSound: vi.fn(),
}))

vi.mock('@/lib/pushSubscription', () => ({
  subscribeToPush: vi.fn().mockResolvedValue(true),
  unsubscribeFromPush: vi.fn().mockResolvedValue(undefined),
}))

import { OnboardingModal } from './OnboardingModal'

describe('OnboardingModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('renders room step when open and no user', () => {
    render(<OnboardingModal open={true} onClose={onClose} hasUser={false} />)
    expect(screen.getByText('Join or Create a Server')).toBeInTheDocument()
  })

  it('renders create and join tabs', () => {
    render(<OnboardingModal open={true} onClose={onClose} hasUser={false} />)
    expect(screen.getByText('Create Room')).toBeInTheDocument()
    expect(screen.getByText('Join Room')).toBeInTheDocument()
  })

  it('skips room step when initialJoinCode provided', () => {
    render(<OnboardingModal open={true} onClose={onClose} hasUser={false} initialJoinCode="ABC123" />)
    // Should skip to username step
    expect(screen.getByText('Choose Your Username')).toBeInTheDocument()
  })

  it('skips username step when hasUser is true', () => {
    render(<OnboardingModal open={true} onClose={onClose} hasUser={true} initialJoinCode="ABC123" />)
    // Should skip to privacy step
    expect(screen.getByText('Privacy & Notifications')).toBeInTheDocument()
  })

  it('can navigate through room → username steps', async () => {
    const user = userEvent.setup()
    render(<OnboardingModal open={true} onClose={onClose} hasUser={false} />)
    // On room step - fill in join code
    const codeInput = screen.getByPlaceholderText('ABC123')
    await user.type(codeInput, 'XYZ789')
    // Click Next
    await user.click(screen.getByText('Next'))
    // Should be on username step
    expect(screen.getByText('Choose Your Username')).toBeInTheDocument()
  })

  it('requires room name/code to proceed', async () => {
    render(<OnboardingModal open={true} onClose={onClose} hasUser={false} />)
    // Next button should be disabled when no value entered
    const nextBtn = screen.getByText('Next')
    expect(nextBtn).toBeDisabled()
  })

  it('renders privacy step with notification toggles', () => {
    render(<OnboardingModal open={true} onClose={onClose} hasUser={true} initialJoinCode="ABC123" />)
    expect(screen.getByText('Message sounds')).toBeInTheDocument()
    expect(screen.getByText('Desktop & push notifications')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<OnboardingModal open={false} onClose={onClose} hasUser={false} />)
    expect(screen.queryByText('Join or Create a Server')).not.toBeInTheDocument()
  })

  it('shows Get Started button on privacy step', () => {
    render(<OnboardingModal open={true} onClose={onClose} hasUser={true} initialJoinCode="ABC123" />)
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('navigates back from privacy step', async () => {
    const user = userEvent.setup()
    render(<OnboardingModal open={true} onClose={onClose} hasUser={false} initialJoinCode="ABC123" />)
    // Should be on username step (room was skipped)
    expect(screen.getByText('Choose Your Username')).toBeInTheDocument()
    // Enter username and go to privacy
    const usernameInput = screen.getByPlaceholderText('Enter username...')
    await user.type(usernameInput, 'TestUser')
    await user.click(screen.getByText('Next'))
    // Now on privacy step
    expect(screen.getByText('Privacy & Notifications')).toBeInTheDocument()
    // Click Back
    await user.click(screen.getByText('Back'))
    // Should be back on username step
    expect(screen.getByText('Choose Your Username')).toBeInTheDocument()
  })
})
