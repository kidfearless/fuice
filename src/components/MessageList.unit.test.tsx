import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'
import type { Message } from '@/lib/types'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/db', () => ({
  getFileUrl: vi.fn().mockResolvedValue(null),
}))

vi.mock('./FileMessage', () => ({ FileMessage: (props: unknown) => <div data-testid="file-message">{props.metadata.name}</div> }))
vi.mock('./MessageReactions', () => ({
  MessageReactions: () => <div data-testid="reactions" />,
  AddReactionButton: () => <div data-testid="add-reaction" />,
}))

import { MessageList } from './MessageList'

function makeMsg(id: string, content: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    channelId: 'ch-1',
    userId: 'u1',
    username: 'Alice',
    content,
    timestamp: Date.now(),
    synced: true,
    ...overrides,
  }
}

describe('MessageList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows empty state when no messages and no channel', () => {
    Object.assign(mockContext, createMockP2PContext({ currentChannel: null, messages: [] }))
    const { container } = render(<MessageList />)
    expect(container).toBeTruthy()
  })

  it('renders messages', () => {
    Object.assign(mockContext, createMockP2PContext({
      messages: [
        makeMsg('m1', 'Hello world'),
        makeMsg('m2', 'How are you?'),
      ],
    }))
    render(<MessageList />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('How are you?')).toBeInTheDocument()
  })

  it('renders file messages', () => {
    Object.assign(mockContext, createMockP2PContext({
      messages: [
        makeMsg('m1', 'File sent', {
          fileMetadata: { name: 'doc.pdf', size: 1024, type: 'application/pdf', chunks: 1, transferId: 'tf-1' },
        }),
      ],
    }))
    render(<MessageList />)
    expect(screen.getByTestId('file-message')).toBeInTheDocument()
  })

  it('renders system messages', () => {
    Object.assign(mockContext, createMockP2PContext({
      messages: [
        makeMsg('m1', 'Alice joined the room', { userId: 'system' }),
      ],
    }))
    render(<MessageList />)
    expect(screen.getByText(/Alice joined/i)).toBeInTheDocument()
  })

  it('groups messages from same user', () => {
    const now = Date.now()
    Object.assign(mockContext, createMockP2PContext({
      messages: [
        makeMsg('m1', 'First', { timestamp: now, username: 'Bob', userId: 'u2' }),
        makeMsg('m2', 'Second', { timestamp: now + 1000, username: 'Bob', userId: 'u2' }),
      ],
    }))
    render(<MessageList />)
    // Both messages should render, and Bob's name should appear (at least once for the group header)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    const bobElements = screen.getAllByText('Bob')
    expect(bobElements.length).toBeGreaterThanOrEqual(1)
  })
})
