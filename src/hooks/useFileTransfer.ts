import { useState, useCallback, MutableRefObject } from 'react'
import { Message, FileMetadata, Channel } from '@/lib/types'
import { saveMessage, saveFile } from '@/lib/db'
import { generateMessageId } from '@/lib/helpers'
import { createImagePreview } from '@/lib/fileTransfer'
import { WebRTCManager } from '@/lib/webrtc'

interface UseFileTransferOptions {
  currentChannelRef: MutableRefObject<Channel | null>
}

export function useFileTransfer({ currentChannelRef }: UseFileTransferOptions) {
  const [fileTransfers, setFileTransfers] = useState<Map<string, { progress: number; metadata: FileMetadata }>>(new Map())

  const handleFileTransferProgress = useCallback((transferId: string, progress: number) => {
    setFileTransfers(prev => {
      const next = new Map(prev)
      const existing = next.get(transferId)
      if (existing) {
        next.set(transferId, { ...existing, progress })
      }
      return next
    })
  }, [])

  const handleFileReceived = useCallback(async (
    transferId: string,
    blob: Blob,
    metadata: FileMetadata,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    if (!currentChannelRef.current) return

    const FILE_SIZE_THRESHOLD = 10 * 1024 * 1024
    const isSmallFile = blob.size < FILE_SIZE_THRESHOLD
    const isImage = metadata.type.startsWith('image/')
    let storedFileId: string | undefined

    try {
      if (isSmallFile) {
        storedFileId = crypto.randomUUID()
        await saveFile({
          id: storedFileId,
          transferId,
          name: metadata.name,
          size: metadata.size,
          type: metadata.type,
          blob,
          isPreview: false,
          storedAt: Date.now(),
        })
      } else if (isImage) {
        try {
          const previewBlob = await createImagePreview(blob)
          storedFileId = crypto.randomUUID()
          await saveFile({
            id: storedFileId,
            transferId,
            name: metadata.name,
            size: metadata.size,
            type: metadata.type,
            blob: previewBlob,
            isPreview: true,
            storedAt: Date.now(),
          })
        } catch (error) {
          console.error('Failed to create image preview:', error)
        }
      }
    } catch (error) {
      console.error('Failed to save file to storage:', error)
    }

    const message: Message = {
      id: generateMessageId(),
      channelId: currentChannelRef.current.id,
      userId: 'remote',
      username: 'Peer',
      content: `Received file: ${metadata.name}`,
      timestamp: Date.now(),
      synced: true,
      fileMetadata: metadata,
      fileUrl: undefined,
      storedFileId,
    }

    await saveMessage(message)
    setMessages(prev => [...prev, message])
    setFileTransfers(prev => {
      const next = new Map(prev)
      next.delete(transferId)
      return next
    })
  }, [currentChannelRef])

  const sendFile = useCallback(async (
    file: File,
    userId: string,
    username: string,
    channelId: string,
    channelType: string,
    webrtcManager: WebRTCManager | null,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    if (channelType !== 'text' || !webrtcManager) return

    const transferId = await webrtcManager.sendFile(file, {} as Message)
    const FILE_SIZE_THRESHOLD = 10 * 1024 * 1024
    const isSmallFile = file.size < FILE_SIZE_THRESHOLD
    let storedFileId: string | undefined
    const fileBlob = new Blob([file], { type: file.type })

    if (isSmallFile) {
      try {
        storedFileId = crypto.randomUUID()
        await saveFile({
          id: storedFileId,
          transferId,
          name: file.name,
          size: file.size,
          type: file.type,
          blob: fileBlob,
          isPreview: false,
          storedAt: Date.now(),
        })
      } catch (error) {
        console.error('Failed to save sent file to storage:', error)
      }
    }

    const message: Message = {
      id: generateMessageId(),
      channelId,
      userId,
      username,
      content: `Sent file: ${file.name}`,
      timestamp: Date.now(),
      synced: false,
      fileMetadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        chunks: Math.ceil(file.size / 16384),
        transferId,
      },
      fileUrl: URL.createObjectURL(file),
      storedFileId,
    }

    await saveMessage(message)
    setMessages(prev => [...prev, message])
  }, [])

  return {
    fileTransfers,
    setFileTransfers,
    handleFileTransferProgress,
    handleFileReceived,
    sendFile,
  }
}
