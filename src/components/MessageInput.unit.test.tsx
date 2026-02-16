import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockP2PContext } from '@/test/mockP2PContext'

const mockContext = createMockP2PContext()
vi.mock('@/lib/P2PContext', () => ({
  useP2P: () => mockContext,
}))

vi.mock('@/lib/gif', () => ({
  parseGifCommand: vi.fn().mockReturnValue(null),
  searchGif: vi.fn().mockResolvedValue(null),
}))

import { MessageInput } from './MessageInput'

describe('MessageInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockContext, createMockP2PContext())
  })

  it('renders nothing when no current channel', () => {
    Object.assign(mockContext, createMockP2PContext({ currentChannel: null }))
    const { container } = render(<MessageInput />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for voice channel', () => {
    Object.assign(mockContext, createMockP2PContext({
      currentChannel: { id: 'vc-1', name: 'Voice', type: 'voice', createdAt: 1 },
    }))
    const { container } = render(<MessageInput />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the input for a text channel', () => {
    render(<MessageInput />)
    expect(screen.getByPlaceholderText('Message #general')).toBeInTheDocument()
  })

  it('sends a message on Enter', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)
    const input = screen.getByPlaceholderText('Message #general')
    await user.type(input, 'Hello world{Enter}')
    expect(mockContext.sendMessage).toHaveBeenCalledWith('Hello world')
  })

  it('adds a newline on Shift+Enter and does not send immediately', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)
    const input = screen.getByPlaceholderText('Message #general')
    await user.type(input, 'Hello{Shift>}{Enter}{/Shift}world')
    expect(mockContext.sendMessage).not.toHaveBeenCalled()
    expect(input).toHaveValue('Hello\nworld')
  })

  it('does not send empty message', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)
    const input = screen.getByPlaceholderText('Message #general')
    await user.type(input, '{Enter}')
    expect(mockContext.sendMessage).not.toHaveBeenCalled()
  })

  it('shows slash command menu on /', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)
    const input = screen.getByPlaceholderText('Message #general')
    await user.type(input, '/')
    expect(screen.getByText('/gif')).toBeInTheDocument()
    expect(screen.getByText('/giphy')).toBeInTheDocument()
    expect(screen.getByText('/tenor')).toBeInTheDocument()
  })

  it('filters slash commands', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)
    const input = screen.getByPlaceholderText('Message #general')
    await user.type(input, '/gi')
    expect(screen.getByText('/gif')).toBeInTheDocument()
    expect(screen.getByText('/giphy')).toBeInTheDocument()
    expect(screen.queryByText('/tenor')).not.toBeInTheDocument()
  })

  it('handles file too large', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    const bigFile = new File([''], 'big.zip', { type: 'application/zip' })
    Object.defineProperty(bigFile, 'size', { value: 200 * 1024 * 1024 })
    await user.upload(fileInput, bigFile)
    expect(mockContext.sendFile).not.toHaveBeenCalled()
  })

  it('sends a file successfully', async () => {
    const user = userEvent.setup()
    render(<MessageInput />)
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await user.upload(fileInput, file)
    await waitFor(() => {
      expect(mockContext.sendFile).toHaveBeenCalledWith(file)
    })
  })
})
