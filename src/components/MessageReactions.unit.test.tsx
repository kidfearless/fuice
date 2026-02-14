import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

import { MessageReactions, AddReactionButton } from './MessageReactions'

describe('MessageReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('renders nothing when no reactions', () => {
    const { container } = render(<MessageReactions messageId="m1" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for empty reactions', () => {
    const { container } = render(<MessageReactions messageId="m1" reactions={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders emoji reactions with counts', () => {
    const reactions = {
      '👍': [{ userId: 'u1', username: 'Alice' }, { userId: 'u2', username: 'Bob' }],
      '❤️': [{ userId: 'u1', username: 'Alice' }],
    }
    render(<MessageReactions messageId="m1" reactions={reactions} />)
    expect(screen.getByText('👍')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('❤️')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('calls toggleReaction when reaction button clicked', async () => {
    const user = userEvent.setup()
    const reactions = {
      '👍': [{ userId: 'u2', username: 'Bob' }],
    }
    render(<MessageReactions messageId="m1" reactions={reactions} />)
    const reactionBtn = screen.getByText('👍').closest('button')!
    await user.click(reactionBtn)
    expect(mockContext.toggleReaction).toHaveBeenCalledWith('m1', '👍')
  })

  it('highlights own reaction', () => {
    const reactions = {
      '👍': [{ userId: 'u1', username: 'Alice' }], // u1 matches currentUser.id
    }
    render(<MessageReactions messageId="m1" reactions={reactions} />)
    const btn = screen.getByText('👍').closest('button')!
    // Should have the "has reacted" styling (contains bg-primary/20)
    expect(btn.className).toContain('border-primary')
  })
})

describe('AddReactionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('renders add reaction button', () => {
    render(<AddReactionButton messageId="m1" />)
    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument()
  })

  it('opens emoji picker on click', async () => {
    const user = userEvent.setup()
    render(<AddReactionButton messageId="m1" />)
    await user.click(screen.getByLabelText('Add reaction'))
    // The popover shows quick picks and the search input
    expect(screen.getByLabelText('Search emojis')).toBeInTheDocument()
    expect(screen.getByText('Quick Picks')).toBeInTheDocument()
  })

  it('calls toggleReaction when emoji clicked', async () => {
    const user = userEvent.setup()
    render(<AddReactionButton messageId="m1" />)
    await user.click(screen.getByLabelText('Add reaction'))
    // Click one of the quick pick emojis (👍 is first)
    const quickPickButtons = screen.getAllByRole('button')
    // Find the 👍 button
    const thumbsUpBtn = quickPickButtons.find(btn => btn.textContent === '👍')
    expect(thumbsUpBtn).toBeTruthy()
    await user.click(thumbsUpBtn!)
    expect(mockContext.toggleReaction).toHaveBeenCalledWith('m1', '👍')
  })

  it('filters emojis by search query', async () => {
    const user = userEvent.setup()
    render(<AddReactionButton messageId="m1" />)
    await user.click(screen.getByLabelText('Add reaction'))
    const searchInput = screen.getByLabelText('Search emojis')
    await user.type(searchInput, 'fire')
    // 🔥 should be visible (may appear in quick picks + filtered results)
    expect(screen.getAllByText('🔥').length).toBeGreaterThan(0)
  })

  it('shows no matching emojis message', async () => {
    const user = userEvent.setup()
    render(<AddReactionButton messageId="m1" />)
    await user.click(screen.getByLabelText('Add reaction'))
    const searchInput = screen.getByLabelText('Search emojis')
    await user.type(searchInput, 'xyznonexistent')
    expect(screen.getByText('No matching emojis')).toBeInTheDocument()
  })
})
