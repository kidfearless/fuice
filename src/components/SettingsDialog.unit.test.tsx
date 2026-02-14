import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/settings', () => ({
  loadSettings: vi.fn().mockReturnValue({
    fontScale: 1,
    density: 'comfortable',
    streaming: { screenShareFrameRate: 15, screenShareResolution: 720, cameraFrameRate: 30, cameraResolution: 720 },
  }),
  updateSettings: vi.fn().mockReturnValue({
    fontScale: 1,
    density: 'comfortable',
    streaming: { screenShareFrameRate: 15, screenShareResolution: 720, cameraFrameRate: 30, cameraResolution: 720 },
  }),
  resetSettings: vi.fn().mockReturnValue({
    fontScale: 1,
    density: 'comfortable',
    streaming: { screenShareFrameRate: 15, screenShareResolution: 720, cameraFrameRate: 30, cameraResolution: 720 },
  }),
}))

vi.mock('@/lib/notifications', () => ({
  loadNotificationSettings: vi.fn().mockReturnValue({ soundEnabled: true, desktopEnabled: false, volume: 0.5 }),
  saveNotificationSettings: vi.fn(),
  requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
  getNotificationPermission: vi.fn().mockReturnValue('default'),
  playNotificationSound: vi.fn(),
  showDesktopNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/pushSubscription', () => ({
  subscribeToPush: vi.fn().mockResolvedValue(true),
  unsubscribeFromPush: vi.fn().mockResolvedValue(undefined),
}))

import { SettingsDialog } from './SettingsDialog'
import { showDesktopNotification } from '@/lib/notifications'

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('renders the settings trigger button', () => {
    render(<SettingsDialog />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('opens dialog on click', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)
    await user.click(screen.getByText('Settings'))
    expect(screen.getByText('Personalize your experience.')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('shows display name input', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)
    await user.click(screen.getByText('Settings'))
    expect(screen.getByLabelText('Display name')).toBeInTheDocument()
  })

  it('shows appearance section', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)
    await user.click(screen.getByText('Settings'))
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByLabelText('Font size')).toBeInTheDocument()
  })

  it('shows notifications section', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)
    await user.click(screen.getByText('Settings'))
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByLabelText('Message sounds')).toBeInTheDocument()
  })

  it('enabling desktop notifications registers push for current room', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)

    await user.click(screen.getByText('Settings'))
    const desktopToggle = screen.getByRole('switch', { name: 'Desktop notifications' })
    await user.click(desktopToggle)

    await waitFor(() => {
      expect(mockContext.registerPushForCurrentRoom).toHaveBeenCalled()
    })
  })

  it('shows streaming section', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)
    await user.click(screen.getByText('Settings'))
    expect(screen.getByText('Streaming')).toBeInTheDocument()
  })

  it('shows reset button', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)
    await user.click(screen.getByText('Settings'))
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('shows a link to the project repository', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)
    await user.click(screen.getByText('Settings'))

    const repoLink = screen.getByRole('link', { name: 'kidfearless/fuice' })
    expect(repoLink).toHaveAttribute('href', 'https://github.com/kidfearless/fuice')
  })

  it('sends a test notification from settings', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    render(<SettingsDialog />)

    await user.click(screen.getByText('Settings'))
    await user.click(screen.getByRole('button', { name: 'Send test notification' }))

    await waitFor(() => {
      expect(showDesktopNotification).toHaveBeenCalled()
    })
  })
})
