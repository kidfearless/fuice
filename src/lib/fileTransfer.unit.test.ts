import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  FileTransferManager,
  formatFileSize,
  getFileIcon,
  createImagePreview,
} from './fileTransfer'
import type { FileMetadata } from './types'

describe('FileTransferManager', () => {
  let manager: FileTransferManager

  beforeEach(() => {
    manager = new FileTransferManager()
  })

  describe('prepareFileForTransfer', () => {
    function createMockFile(name: string, size: number, type: string): File {
      const data = new Uint8Array(size)
      const file = {
        name,
        size,
        type,
        slice(start: number, end: number) {
          const sliced = data.slice(start, end)
          return {
            arrayBuffer: () => Promise.resolve(sliced.buffer.slice(sliced.byteOffset, sliced.byteOffset + sliced.byteLength)),
          }
        },
      } as unknown as File
      return file
    }

    it('splits a file into chunks and returns metadata', async () => {
      const file = createMockFile('test.txt', 40000, 'text/plain')

      const result = await manager.prepareFileForTransfer(file)
      expect(result.metadata.name).toBe('test.txt')
      expect(result.metadata.type).toBe('text/plain')
      expect(result.metadata.size).toBe(40000)
      expect(result.metadata.chunks).toBe(3) // ceil(40000/16384) = 3
      expect(result.metadata.transferId).toBeTruthy()
      expect(result.chunks.length).toBe(3)
    })

    it('handles small files (single chunk)', async () => {
      const file = createMockFile('small.txt', 5, 'text/plain')
      const result = await manager.prepareFileForTransfer(file)
      expect(result.metadata.chunks).toBe(1)
      expect(result.chunks.length).toBe(1)
    })
  })

  describe('initializeTransfer', () => {
    it('creates a new transfer entry', () => {
      const metadata: FileMetadata = {
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
        chunks: 1,
        transferId: 'tf-1',
      }
      manager.initializeTransfer(metadata)
      const transfer = manager.getTransfer('tf-1')
      expect(transfer).toBeDefined()
      expect(transfer!.id).toBe('tf-1')
      expect(transfer!.progress).toBe(0)
      expect(transfer!.complete).toBe(false)
    })
  })

  describe('receiveChunk', () => {
    it('tracks received chunks and progress', () => {
      const onProgress = vi.fn()
      manager.setCallbacks({ onTransferProgress: onProgress })

      const metadata: FileMetadata = {
        name: 'test.txt',
        size: 200,
        type: 'text/plain',
        chunks: 2,
        transferId: 'tf-2',
      }
      manager.initializeTransfer(metadata)

      manager.receiveChunk('tf-2', 0, new ArrayBuffer(100))
      expect(onProgress).toHaveBeenCalledWith('tf-2', 50)

      const transfer = manager.getTransfer('tf-2')
      expect(transfer!.receivedChunks).toBe(1)
    })

    it('finalizes transfer when all chunks received', () => {
      const onComplete = vi.fn()
      manager.setCallbacks({ onTransferComplete: onComplete })

      const metadata: FileMetadata = {
        name: 'test.txt',
        size: 10,
        type: 'text/plain',
        chunks: 2,
        transferId: 'tf-3',
      }
      manager.initializeTransfer(metadata)
      manager.receiveChunk('tf-3', 0, new ArrayBuffer(5))
      manager.receiveChunk('tf-3', 1, new ArrayBuffer(5))

      expect(onComplete).toHaveBeenCalledWith('tf-3', expect.any(Blob), metadata)
      const transfer = manager.getTransfer('tf-3')
      expect(transfer!.complete).toBe(true)
      expect(transfer!.blob).toBeInstanceOf(Blob)
    })

    it('warns for unknown transfer IDs', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      manager.receiveChunk('unknown-id', 0, new ArrayBuffer(10))
      expect(consoleSpy).toHaveBeenCalledWith(
        'Received chunk for unknown transfer:',
        'unknown-id'
      )
      consoleSpy.mockRestore()
    })
  })

  describe('clearTransfer', () => {
    it('removes a transfer', () => {
      const metadata: FileMetadata = {
        name: 'test.txt',
        size: 10,
        type: 'text/plain',
        chunks: 1,
        transferId: 'tf-4',
      }
      manager.initializeTransfer(metadata)
      expect(manager.getTransfer('tf-4')).toBeDefined()
      manager.clearTransfer('tf-4')
      expect(manager.getTransfer('tf-4')).toBeUndefined()
    })
  })

  describe('getAllTransfers', () => {
    it('returns all active transfers', () => {
      manager.initializeTransfer({ name: 'a.txt', size: 1, type: 'text/plain', chunks: 1, transferId: 'tf-a' })
      manager.initializeTransfer({ name: 'b.txt', size: 1, type: 'text/plain', chunks: 1, transferId: 'tf-b' })
      expect(manager.getAllTransfers()).toHaveLength(2)
    })
  })
})

describe('formatFileSize', () => {
  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })
})

describe('getFileIcon', () => {
  it('returns image for image types', () => {
    expect(getFileIcon('image/png')).toBe('image')
    expect(getFileIcon('image/jpeg')).toBe('image')
  })

  it('returns video for video types', () => {
    expect(getFileIcon('video/mp4')).toBe('video')
  })

  it('returns audio for audio types', () => {
    expect(getFileIcon('audio/mpeg')).toBe('audio')
  })

  it('returns pdf for PDF', () => {
    expect(getFileIcon('application/pdf')).toBe('pdf')
  })

  it('returns text for text types', () => {
    expect(getFileIcon('text/plain')).toBe('text')
  })

  it('returns archive for compressed types', () => {
    expect(getFileIcon('application/zip')).toBe('archive')
    expect(getFileIcon('application/x-compressed')).toBe('archive')
  })

  it('returns file for unknown types', () => {
    expect(getFileIcon('application/octet-stream')).toBe('file')
  })
})

describe('createImagePreview', () => {
  it('rejects when image fails to load', async () => {
    // Mock Image to fire onerror
    const OrigImage = globalThis.Image
    globalThis.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onerror?.(), 0)
      }
    } as unknown as typeof Image

    const blob = new Blob(['not-an-image'], { type: 'image/png' })
    await expect(createImagePreview(blob, 100, 100)).rejects.toThrow('Failed to load image')
    globalThis.Image = OrigImage
  })

  it('rejects when canvas context is unavailable', async () => {
    // Mock Image to fire onload, but canvas.getContext returns null (jsdom default)
    const OrigImage = globalThis.Image
    globalThis.Image = class {
      width = 200
      height = 200
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    } as unknown as typeof Image

    const blob = new Blob(['fake-image'], { type: 'image/png' })
    await expect(createImagePreview(blob, 100, 100)).rejects.toThrow('Failed to get canvas context')
    globalThis.Image = OrigImage
  })

  it('creates preview when canvas context available', async () => {
    const OrigImage = globalThis.Image
    globalThis.Image = class {
      width = 400
      height = 200
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    } as unknown as typeof Image

    // Mock canvas getContext to return a fake 2d context
    const origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as unknown as typeof origGetContext

    // Mock toBlob
    const origToBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = vi.fn(function(this: HTMLCanvasElement, cb: BlobCallback) {
      cb(new Blob(['preview'], { type: 'image/jpeg' }))
    }) as unknown as typeof origToBlob

    const blob = new Blob(['fake-image'], { type: 'image/png' })
    const preview = await createImagePreview(blob, 100, 100)
    expect(preview).toBeInstanceOf(Blob)

    HTMLCanvasElement.prototype.getContext = origGetContext
    HTMLCanvasElement.prototype.toBlob = origToBlob
    globalThis.Image = OrigImage
  })

  it('handles tall images', async () => {
    const OrigImage = globalThis.Image
    globalThis.Image = class {
      width = 100
      height = 400
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    } as unknown as typeof Image

    const origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as unknown as typeof origGetContext

    const origToBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = vi.fn(function(this: HTMLCanvasElement, cb: BlobCallback) {
      cb(new Blob(['preview'], { type: 'image/jpeg' }))
    }) as unknown as typeof origToBlob

    const blob = new Blob(['fake-image'], { type: 'image/png' })
    const preview = await createImagePreview(blob, 200, 200)
    expect(preview).toBeInstanceOf(Blob)

    HTMLCanvasElement.prototype.getContext = origGetContext
    HTMLCanvasElement.prototype.toBlob = origToBlob
    globalThis.Image = OrigImage
  })

  it('rejects when toBlob returns null', async () => {
    const OrigImage = globalThis.Image
    globalThis.Image = class {
      width = 100
      height = 100
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    } as unknown as typeof Image

    const origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as unknown as typeof origGetContext

    const origToBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = vi.fn(function(this: HTMLCanvasElement, cb: BlobCallback) {
      cb(null)
    }) as unknown as typeof origToBlob

    const blob = new Blob(['fake-image'], { type: 'image/png' })
    await expect(createImagePreview(blob)).rejects.toThrow('Failed to create preview blob')

    HTMLCanvasElement.prototype.getContext = origGetContext
    HTMLCanvasElement.prototype.toBlob = origToBlob
    globalThis.Image = OrigImage
  })

  it('rejects when FileReader fails', async () => {
    const origRead = FileReader.prototype.readAsDataURL
    FileReader.prototype.readAsDataURL = function() {
      setTimeout(() => (this as unknown as { onerror: () => void }).onerror(), 0)
    }

    const blob = new Blob(['bad'], { type: 'image/png' })
    await expect(createImagePreview(blob)).rejects.toThrow('Failed to read file')

    FileReader.prototype.readAsDataURL = origRead
  })
})
