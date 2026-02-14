import { FileMetadata, FileTransfer } from './types'

const CHUNK_SIZE = 16384

export class FileTransferManager {
  private activeTransfers: Map<string, FileTransfer> = new Map()
  private onTransferProgress?: (transferId: string, progress: number) => void
  private onTransferComplete?: (transferId: string, blob: Blob, metadata: FileMetadata) => void

  setCallbacks(callbacks: {
    onTransferProgress?: (transferId: string, progress: number) => void
    onTransferComplete?: (transferId: string, blob: Blob, metadata: FileMetadata) => void
  }) {
    this.onTransferProgress = callbacks.onTransferProgress
    this.onTransferComplete = callbacks.onTransferComplete
  }

  async prepareFileForTransfer(file: File): Promise<{ metadata: FileMetadata; chunks: ArrayBuffer[] }> {
    const transferId = crypto.randomUUID()
    const chunks: ArrayBuffer[] = []
    
    let offset = 0
    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer()
      chunks.push(chunk)
      offset += CHUNK_SIZE
    }

    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      chunks: chunks.length,
      transferId,
    }

    return { metadata, chunks }
  }

  initializeTransfer(metadata: FileMetadata) {
    const transfer: FileTransfer = {
      id: metadata.transferId,
      metadata,
      chunks: new Map(),
      receivedChunks: 0,
      progress: 0,
      complete: false,
    }

    this.activeTransfers.set(metadata.transferId, transfer)
  }

  receiveChunk(transferId: string, chunkIndex: number, data: ArrayBuffer) {
    const transfer = this.activeTransfers.get(transferId)
    if (!transfer) {
      console.warn('Received chunk for unknown transfer:', transferId)
      return
    }

    transfer.chunks.set(chunkIndex, data)
    transfer.receivedChunks++
    transfer.progress = (transfer.receivedChunks / transfer.metadata.chunks) * 100

    this.onTransferProgress?.(transferId, transfer.progress)

    if (transfer.receivedChunks === transfer.metadata.chunks) {
      this.finalizeTransfer(transferId)
    }
  }

  private finalizeTransfer(transferId: string) {
    const transfer = this.activeTransfers.get(transferId)
    if (!transfer) return

    const orderedChunks: ArrayBuffer[] = []
    for (let i = 0; i < transfer.metadata.chunks; i++) {
      const chunk = transfer.chunks.get(i)
      if (chunk) {
        orderedChunks.push(chunk)
      }
    }

    const blob = new Blob(orderedChunks, { type: transfer.metadata.type })
    transfer.blob = blob
    transfer.complete = true

    this.onTransferComplete?.(transferId, blob, transfer.metadata)
  }

  getTransfer(transferId: string): FileTransfer | undefined {
    return this.activeTransfers.get(transferId)
  }

  clearTransfer(transferId: string) {
    this.activeTransfers.delete(transferId)
  }

  getAllTransfers(): FileTransfer[] {
    return Array.from(this.activeTransfers.values())
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type.includes('pdf')) return 'pdf'
  if (type.includes('text')) return 'text'
  if (type.includes('zip') || type.includes('compressed')) return 'archive'
  return 'file'
}

export async function createImagePreview(blob: Blob, maxWidth: number = 200, maxHeight: number = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate dimensions to fit within maxWidth x maxHeight while maintaining aspect ratio
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((previewBlob) => {
          if (previewBlob) {
            resolve(previewBlob)
          } else {
            reject(new Error('Failed to create preview blob'))
          }
        }, 'image/jpeg', 0.8)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(blob)
  })
}
