import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  getRoom: vi.fn(),
}))

import { getRoom } from '@/lib/db'
import { JoinRoomDialog } from './JoinRoomDialog'

const mockedGetRoom = vi.mocked(getRoom)

describe('JoinRoomDialog', () => {
  const onAccept = vi.fn()
  const onDecline = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetRoom.mockResolvedValue(null)
  })

  it('renders the invitation card', async () => {
    render(<JoinRoomDialog roomCode="ABC123" onAccept={onAccept} onDecline={onDecline} />)
    expect(screen.getByText("You've been invited!")).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    mockedGetRoom.mockReturnValue(new Promise(() => {})) // never resolves
    render(<JoinRoomDialog roomCode="ABC123" onAccept={onAccept} onDecline={onDecline} />)
    expect(screen.getAllByText('Loading...').length).toBeGreaterThanOrEqual(1)
  })

  it('shows room name from db', async () => {
    mockedGetRoom.mockResolvedValue({ id: 'ABC123', name: 'Cool Room', createdAt: 1000, channels: [] } as unknown)
    render(<JoinRoomDialog roomCode="ABC123" onAccept={onAccept} onDecline={onDecline} />)
    await waitFor(() => {
      expect(screen.getByText('Cool Room')).toBeInTheDocument()
    })
  })

  it('shows fallback room name when not found', async () => {
    mockedGetRoom.mockResolvedValue(null)
    render(<JoinRoomDialog roomCode="XYZ789" onAccept={onAccept} onDecline={onDecline} />)
    await waitFor(() => {
      expect(screen.getByText('Room XYZ789')).toBeInTheDocument()
    })
  })

  it('calls onAccept when accept button clicked', async () => {
    mockedGetRoom.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<JoinRoomDialog roomCode="ABC123" onAccept={onAccept} onDecline={onDecline} />)
    await waitFor(() => {
      expect(screen.getByText('Accept & Join')).not.toBeDisabled()
    })
    await user.click(screen.getByText('Accept & Join'))
    expect(onAccept).toHaveBeenCalled()
  })

  it('calls onDecline when decline button clicked', async () => {
    mockedGetRoom.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<JoinRoomDialog roomCode="ABC123" onAccept={onAccept} onDecline={onDecline} />)
    await waitFor(() => {
      expect(screen.getByText('Decline')).not.toBeDisabled()
    })
    await user.click(screen.getByText('Decline'))
    expect(onDecline).toHaveBeenCalled()
  })

  it('shows "Joining..." when isLoading is true', async () => {
    mockedGetRoom.mockResolvedValue(null)
    render(<JoinRoomDialog roomCode="ABC123" onAccept={onAccept} onDecline={onDecline} isLoading />)
    await waitFor(() => {
      expect(screen.getByText('Joining...')).toBeInTheDocument()
    })
  })

  it('handles getRoom errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedGetRoom.mockRejectedValue(new Error('DB error'))
    render(<JoinRoomDialog roomCode="ABC123" onAccept={onAccept} onDecline={onDecline} />)
    await waitFor(() => {
      expect(screen.getByText('Room ABC123')).toBeInTheDocument()
    })
    consoleSpy.mockRestore()
  })
})
