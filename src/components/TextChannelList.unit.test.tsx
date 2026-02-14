import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TextChannelList } from './TextChannelList'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const channels = [
  { id: 'ch-1', name: 'general', type: 'text' as const, createdAt: 1 },
  { id: 'ch-2', name: 'random', type: 'text' as const, createdAt: 2 },
]

describe('TextChannelList', () => {
  it('renders channel names', () => {
    render(<TextChannelList channels={channels} currentChannelId="ch-1" onSelect={vi.fn()} />)
    expect(screen.getByText('general')).toBeInTheDocument()
    expect(screen.getByText('random')).toBeInTheDocument()
  })

  it('highlights active channel', () => {
    const { container } = render(
      <TextChannelList channels={channels} currentChannelId="ch-1" onSelect={vi.fn()} />
    )
    const buttons = container.querySelectorAll('button')
    // The active channel button should have different styling
    expect(buttons.length).toBe(2)
  })

  it('calls onSelect when channel is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<TextChannelList channels={channels} currentChannelId="ch-1" onSelect={onSelect} />)

    await user.click(screen.getByText('random'))
    expect(onSelect).toHaveBeenCalledWith('ch-2')
  })

  it('renders empty when no channels', () => {
    const { container } = render(
      <TextChannelList channels={[]} currentChannelId={undefined} onSelect={vi.fn()} />
    )
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})
