import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileTransfer } from './useFileTransfer'

vi.mock('@/lib/db', () => ({
  saveMessage: vi.fn().mockResolvedValue(undefined),
  saveFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/helpers', () => ({
  generateMessageId: vi.fn(() => 'msg-test-1'),
}))

vi.mock('@/lib/fileTransfer', () => ({
  createImagePreview: vi.fn().mockResolvedValue(new Blob(['preview'], { type: 'image/jpeg' })),
}))

import { saveMessage, saveFile } from '@/lib/db'
import { createImagePreview } from '@/lib/fileTransfer'

describe('useFileTransfer', () => {
  const currentChannelRef = { current: { id: 'ch-1', name: 'general', type: 'text' as const, createdAt: 1 } }

  beforeEach(() => {
    vi.clearAllMocks()
    // mock crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-1' as `${string}-${string}-${string}-${string}-${string}`)
  })

  it('starts with empty file transfers', () => {
    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))
    expect(result.current.fileTransfers.size).toBe(0)
  })

  it('handleFileTransferProgress updates progress for existing transfer', () => {
    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    // Set an initial transfer
    act(() => {
      result.current.setFileTransfers(new Map([
        ['tf-1', { progress: 0, metadata: { name: 'f.txt', size: 100, type: 'text/plain', chunks: 1, transferId: 'tf-1' } }],
      ]))
    })

    act(() => { result.current.handleFileTransferProgress('tf-1', 50) })
    expect(result.current.fileTransfers.get('tf-1')?.progress).toBe(50)
  })

  it('handleFileReceived saves small file and creates message', async () => {
    const setMessages = vi.fn((updater: (prev: unknown[]) => unknown[]) => updater([]))
    const blob = new Blob(['test'], { type: 'text/plain' })
    const metadata = { name: 'test.txt', size: 100, type: 'text/plain', chunks: 1, transferId: 'tf-1' }

    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    await act(async () => {
      await result.current.handleFileReceived('tf-1', blob, metadata, setMessages)
    })

    expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({
      id: 'uuid-1',
      transferId: 'tf-1',
      isPreview: false,
    }))
    expect(saveMessage).toHaveBeenCalled()
    expect(setMessages).toHaveBeenCalled()
  })

  it('handleFileReceived creates preview for large images', async () => {
    const setMessages = vi.fn((updater: (prev: unknown[]) => unknown[]) => updater([]))
    const blob = new Blob(['x'.repeat(100)], { type: 'image/png' })
    Object.defineProperty(blob, 'size', { value: 15 * 1024 * 1024 }) // >10MB
    const metadata = { name: 'big.png', size: 15 * 1024 * 1024, type: 'image/png', chunks: 10, transferId: 'tf-2' }

    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    await act(async () => {
      await result.current.handleFileReceived('tf-2', blob, metadata, setMessages)
    })

    expect(createImagePreview).toHaveBeenCalledWith(blob)
    expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({ isPreview: true }))
  })

  it('handleFileReceived does nothing without current channel', async () => {
    const setMessages = vi.fn()
    const noChannelRef = { current: null }
    const { result } = renderHook(() => useFileTransfer({ currentChannelRef: noChannelRef as unknown }))

    await act(async () => {
      await result.current.handleFileReceived('tf-1', new Blob(), { name: 'f', size: 1, type: 'a', chunks: 1, transferId: 'tf-1' }, setMessages)
    })

    expect(saveMessage).not.toHaveBeenCalled()
  })

  it('handleFileReceived handles preview creation error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(createImagePreview as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('preview fail'))

    const setMessages = vi.fn((updater: (prev: unknown[]) => unknown[]) => updater([]))
    const blob = new Blob(['x'], { type: 'image/png' })
    Object.defineProperty(blob, 'size', { value: 15 * 1024 * 1024 })
    const metadata = { name: 'big.png', size: 15 * 1024 * 1024, type: 'image/png', chunks: 10, transferId: 'tf-3' }

    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    await act(async () => {
      await result.current.handleFileReceived('tf-3', blob, metadata, setMessages)
    })

    expect(consoleSpy).toHaveBeenCalled()
    expect(saveMessage).toHaveBeenCalled() // Message still saved
    consoleSpy.mockRestore()
  })

  it('sendFile sends file and creates message', async () => {
    const mockManager = { sendFile: vi.fn().mockResolvedValue('tf-sent') }
    const setMessages = vi.fn((updater: (prev: unknown[]) => unknown[]) => updater([]))
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })

    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    await act(async () => {
      await result.current.sendFile(file, 'u1', 'Alice', 'ch-1', 'text', mockManager as unknown, setMessages)
    })

    expect(mockManager.sendFile).toHaveBeenCalled()
    expect(saveFile).toHaveBeenCalled()
    expect(saveMessage).toHaveBeenCalled()
    expect(setMessages).toHaveBeenCalled()
  })

  it('sendFile does nothing for non-text channels', async () => {
    const setMessages = vi.fn()
    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    await act(async () => {
      await result.current.sendFile(new File([], 'f'), 'u1', 'A', 'ch-1', 'voice', null, setMessages)
    })

    expect(saveMessage).not.toHaveBeenCalled()
  })

  it('sendFile handles saveFile error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(saveFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('disk full'))

    const mockManager = { sendFile: vi.fn().mockResolvedValue('tf-err') }
    const setMessages = vi.fn((updater: (prev: unknown[]) => unknown[]) => updater([]))
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })

    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    await act(async () => {
      await result.current.sendFile(file, 'u1', 'Alice', 'ch-1', 'text', mockManager as unknown, setMessages)
    })

    expect(consoleSpy).toHaveBeenCalled()
    // Message should still be saved
    expect(saveMessage).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('handleFileReceived removes transfer from map', async () => {
    const setMessages = vi.fn((updater: (prev: unknown[]) => unknown[]) => updater([]))
    const { result } = renderHook(() => useFileTransfer({ currentChannelRef }))

    // Add a transfer
    act(() => {
      result.current.setFileTransfers(new Map([
        ['tf-done', { progress: 80, metadata: { name: 'f', size: 1, type: 'a', chunks: 1, transferId: 'tf-done' } }],
      ]))
    })
    expect(result.current.fileTransfers.has('tf-done')).toBe(true)

    await act(async () => {
      await result.current.handleFileReceived('tf-done', new Blob(['x']), { name: 'f', size: 1, type: 'a', chunks: 1, transferId: 'tf-done' }, setMessages)
    })

    expect(result.current.fileTransfers.has('tf-done')).toBe(false)
  })
})
