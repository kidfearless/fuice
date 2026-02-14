import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RoomForm } from './RoomForm'

vi.mock('@/lib/sw-register', () => ({
  clearCacheAndUpdate: vi.fn().mockResolvedValue(undefined),
}))

const defaultProps = {
  username: 'Alice',
  onCreateRoom: vi.fn().mockResolvedValue(undefined),
  onJoinRoom: vi.fn().mockResolvedValue(undefined),
}

describe('RoomForm', () => {
  it('renders create and join tabs', () => {
    render(<RoomForm {...defaultProps} />)
    expect(screen.getByRole('tab', { name: /create/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /join/i })).toBeInTheDocument()
  })

  it('create tab shows room name input', () => {
    render(<RoomForm {...defaultProps} />)
    expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
  })

  it('calls onCreateRoom with trimmed name', async () => {
    const user = userEvent.setup()
    const onCreateRoom = vi.fn().mockResolvedValue(undefined)
    render(<RoomForm {...defaultProps} onCreateRoom={onCreateRoom} />)

    await user.type(screen.getByLabelText(/room name/i), '  My Room  ')
    await user.click(screen.getByRole('button', { name: /create room/i }))

    expect(onCreateRoom).toHaveBeenCalledWith('My Room')
  })

  it('join tab shows room code input', async () => {
    const user = userEvent.setup()
    render(<RoomForm {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /join/i }))
    expect(screen.getByLabelText(/room code/i)).toBeInTheDocument()
  })

  it('calls onJoinRoom with uppercased code', async () => {
    const user = userEvent.setup()
    const onJoinRoom = vi.fn().mockResolvedValue(undefined)
    render(<RoomForm {...defaultProps} onJoinRoom={onJoinRoom} />)

    await user.click(screen.getByRole('tab', { name: /join/i }))
    await user.type(screen.getByLabelText(/room code/i), 'abc123')
    await user.click(screen.getByRole('button', { name: /join room/i }))

    expect(onJoinRoom).toHaveBeenCalledWith('ABC123')
  })

  it('create button is disabled when input is empty', () => {
    render(<RoomForm {...defaultProps} />)
    expect(screen.getByRole('button', { name: /create room/i })).toBeDisabled()
  })

  it('create room on Enter key', async () => {
    const user = userEvent.setup()
    const onCreateRoom = vi.fn().mockResolvedValue(undefined)
    render(<RoomForm {...defaultProps} onCreateRoom={onCreateRoom} />)

    const input = screen.getByLabelText(/room name/i)
    await user.type(input, 'New Room{Enter}')

    expect(onCreateRoom).toHaveBeenCalledWith('New Room')
  })
})
