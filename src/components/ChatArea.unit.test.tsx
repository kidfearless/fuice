import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

// Mock child components to isolate ChatArea logic
vi.mock('./MessageList', () => ({ MessageList: () => <div data-testid="message-list" /> }))
vi.mock('./MessageInput', () => ({ MessageInput: () => <div data-testid="message-input" /> }))
vi.mock('./VoiceChannel', () => ({ VoiceChannel: () => <div data-testid="voice-channel" /> }))
vi.mock('./HelpPanel', () => ({ HelpPanel: () => <div data-testid="help-panel" /> }))
vi.mock('./ConnectionInfo', () => ({ ConnectionInfo: () => <div data-testid="connection-info" /> }))

import { ChatArea } from './ChatArea'

describe('ChatArea', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows HelpPanel and ConnectionInfo when no channel selected', () => {
    Object.assign(mockContext, createMockP2PContext({ currentChannel: null }))
    render(<ChatArea />)
    expect(screen.getByTestId('help-panel')).toBeInTheDocument()
    expect(screen.getByTestId('connection-info')).toBeInTheDocument()
  })

  it('shows MessageList and MessageInput for text channel', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'ch-1', name: 'general', type: 'text', createdAt: 1 },
    }))
    render(<ChatArea />)
    expect(screen.getByTestId('message-list')).toBeInTheDocument()
    expect(screen.getByTestId('message-input')).toBeInTheDocument()
  })

  it('shows VoiceChannel for voice channel', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'vc-1', name: 'Voice', type: 'voice', createdAt: 1 },
    }))
    render(<ChatArea />)
    expect(screen.getByTestId('voice-channel')).toBeInTheDocument()
  })

  it('renders mobile header with menu button in mobile mode', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'ch-1', name: 'general', type: 'text', createdAt: 1 },
    }))
    const onMenuToggle = vi.fn()
    render(<ChatArea isMobile onMenuToggle={onMenuToggle} />)
    // Should have the channel name visible
    expect(screen.getByText('general')).toBeInTheDocument()
  })

  it('does not render mobile header when not mobile', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'ch-1', name: 'general', type: 'text', createdAt: 1 },
    }))
    const { container } = render(<ChatArea isMobile={false} />)
    // No hamburger menu
    const menuButtons = container.querySelectorAll('[data-testid="menu-toggle"]')
    expect(menuButtons).toHaveLength(0)
  })
})
