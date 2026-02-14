import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/db', () => ({
  getAllRoomHistory: vi.fn().mockResolvedValue([]),
  deleteRoomHistory: vi.fn().mockResolvedValue(undefined),
  updateRoomOrder: vi.fn().mockResolvedValue(undefined),
}))

import { getAllRoomHistory } from '@/lib/db'
import { RoomHistorySidebar } from './RoomHistorySidebar'

const mockedGetAllRoomHistory = vi.mocked(getAllRoomHistory)

describe('RoomHistorySidebar', () => {
  const mockOnAddRoom = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
    mockedGetAllRoomHistory.mockResolvedValue([])
  })

  it('renders the add room button', async () => {
    render(<RoomHistorySidebar onAddRoom={mockOnAddRoom} />)
    // The add button has a plus icon
    await waitFor(() => {
      const addBtn = document.querySelector('.fa-plus')
      expect(addBtn).toBeTruthy()
    })
  })

  it('renders room history items', async () => {
    mockedGetAllRoomHistory.mockResolvedValue([
      { roomId: 'r1', roomName: 'My Room', joinedAt: 1000, order: 0 },
      { roomId: 'r2', roomName: 'Other Room', joinedAt: 2000, order: 1 },
    ])
    render(<RoomHistorySidebar />)
    await waitFor(() => {
      expect(screen.getByText('MR')).toBeInTheDocument() // initials for "My Room"
      expect(screen.getByText('OR')).toBeInTheDocument() // initials for "Other Room"
    })
  })

  it('shows room initials', async () => {
    mockedGetAllRoomHistory.mockResolvedValue([
      { roomId: 'r1', roomName: 'My Room', joinedAt: 1000, order: 0 },
    ])
    render(<RoomHistorySidebar />)
    await waitFor(() => {
      expect(screen.getByText('MR')).toBeInTheDocument()
    })
  })

  it('highlights the current room', async () => {
    Object.assign(mockContext, createMockP2PContext({
      currentRoom: { id: 'r1', name: 'My Room', createdAt: 1000, channels: [] },
    }))
    mockedGetAllRoomHistory.mockResolvedValue([
      { roomId: 'r1', roomName: 'My Room', joinedAt: 1000, order: 0 },
    ])
    render(<RoomHistorySidebar />)
    await waitFor(() => {
      const btn = screen.getByText('MR').closest('button')!
      expect(btn.className).toContain('bg-primary')
    })
  })

  it('calls onAddRoom when add button clicked', async () => {
    const user = userEvent.setup()
    render(<RoomHistorySidebar onAddRoom={mockOnAddRoom} />)
    await waitFor(() => {
      expect(document.querySelector('.fa-plus')).toBeTruthy()
    })
    const addIcon = document.querySelector('.fa-plus')!
    const addBtn = addIcon.closest('button')!
    await user.click(addBtn)
    expect(mockOnAddRoom).toHaveBeenCalled()
  })

  it('joins a room on click', async () => {
    const user = userEvent.setup()
    mockedGetAllRoomHistory.mockResolvedValue([
      { roomId: 'r1', roomName: 'My Room', joinedAt: 1000, order: 0 },
    ])
    render(<RoomHistorySidebar />)
    await waitFor(() => {
      expect(screen.getByText('MR')).toBeInTheDocument()
    })
    await user.click(screen.getByText('MR'))
    expect(mockContext.joinRoom).toHaveBeenCalledWith('r1')
  })
})
