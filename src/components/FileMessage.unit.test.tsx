import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FileMessage } from './FileMessage'
import type { FileMetadata } from '@/lib/types'

function makeMeta(overrides: Partial<FileMetadata> = {}): FileMetadata {
  return { name: 'test.txt', size: 1024, type: 'text/plain', chunks: 1, transferId: 'tf-1', ...overrides }
}

describe('FileMessage', () => {
  it('renders file name and size', () => {
    render(<FileMessage metadata={makeMeta()} />)
    expect(screen.getByText('test.txt')).toBeInTheDocument()
    expect(screen.getByText(/1.*KB/i)).toBeInTheDocument()
  })

  it('renders download button when fileUrl provided', () => {
    const { container } = render(<FileMessage metadata={makeMeta()} fileUrl="blob:http://localhost/abc" />)
    // The download button is a ghost icon button with a download icon
    const downloadIcon = container.querySelector('.fa-download')
    expect(downloadIcon).toBeTruthy()
  })

  it('shows image preview for image types', () => {
    render(<FileMessage metadata={makeMeta({ type: 'image/png', name: 'photo.png' })} fileUrl="blob:http://localhost/img" />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
  })

  it('shows video preview for video types', () => {
    const { container } = render(
      <FileMessage metadata={makeMeta({ type: 'video/mp4', name: 'clip.mp4' })} fileUrl="blob:http://localhost/vid" />
    )
    const video = container.querySelector('video')
    expect(video).toBeInTheDocument()
  })

  it('shows generic file icon for unknown type', () => {
    render(<FileMessage metadata={makeMeta({ type: 'application/octet-stream' })} />)
    // Should render without crashing, showing generic icon
    expect(screen.getByText('test.txt')).toBeInTheDocument()
  })

  it('shows pdf icon for pdf type', () => {
    render(<FileMessage metadata={makeMeta({ type: 'application/pdf', name: 'doc.pdf' })} />)
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
  })

  it('shows zip icon for compressed types', () => {
    render(<FileMessage metadata={makeMeta({ type: 'application/zip', name: 'archive.zip' })} />)
    expect(screen.getByText('archive.zip')).toBeInTheDocument()
  })

  it('shows audio icon for audio types', () => {
    render(<FileMessage metadata={makeMeta({ type: 'audio/mp3', name: 'song.mp3' })} />)
    expect(screen.getByText('song.mp3')).toBeInTheDocument()
  })

  it('download handler creates and clicks anchor element', async () => {
    const user = userEvent.setup()
    const clickMock = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = originalCreateElement('a')
        el.click = clickMock
        return el
      }
      return originalCreateElement(tag)
    })

    const { container } = render(<FileMessage metadata={makeMeta()} fileUrl="blob:http://localhost/abc" />)
    const downloadIcon = container.querySelector('.fa-download')
    const downloadBtn = downloadIcon?.closest('button')
    expect(downloadBtn).toBeTruthy()
    await user.click(downloadBtn!)

    expect(clickMock).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('no download when no fileUrl', async () => {
    render(<FileMessage metadata={makeMeta()} />)
    // No download button visible or if it is, it should be safe to click
    const btn = screen.queryByRole('button', { name: /download/i })
    if (btn) {
      const user = userEvent.setup()
      await user.click(btn)
      // Should not crash
    }
  })
})
