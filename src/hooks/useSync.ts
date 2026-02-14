import { useCallback, MutableRefObject, useRef } from 'react'
import { Channel, Message, Room } from '@/lib/types'
import { WebRTCManager, SyncPayload, SyncHello, HistoryRequest, HistoryResponse } from '@/lib/webrtc'
import { getMessagesByChannel, saveChannel, saveMessage } from '@/lib/db'
import { notifyIncomingMessage } from '@/lib/notifications'
import { encryptText, decryptText } from '@/lib/crypto'

const MAX_SYNC_HELLO_IDS = 2000
const MAX_SYNC_RESPONSE_MESSAGES = 100
const HISTORY_PAGE_SIZE = 100
const MAX_IN_MEMORY_MESSAGES = 500
const HISTORY_REQUEST_TIMEOUT_MS = 6000

async function getRoomMessages(channels: Channel[]): Promise<Message[]> {
  const textChannels = channels.filter((channel) => channel.type === 'text')
  if (textChannels.length === 0) return []
  const perChannel = await Promise.all(textChannels.map((channel) => getMessagesByChannel(channel.id)))
  return perChannel.flat().sort((a, b) => a.id.localeCompare(b.id))
}

function getRecentMessages(messages: Message[], count: number): Message[] {
  if (messages.length <= count) return messages
  return messages.slice(messages.length - count)
}

interface UseSyncOptions {
  currentRoomRef: MutableRefObject<Room | null>
  channelsRef: MutableRefObject<Channel[]>
  currentChannelRef: MutableRefObject<Channel | null>
  currentUserIdRef: MutableRefObject<string | null>
  roomKeyRef: MutableRefObject<string | null>
  setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>
  setCurrentChannel: React.Dispatch<React.SetStateAction<Channel | null>>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

export function useSync({
  currentRoomRef,
  channelsRef,
  currentChannelRef,
  currentUserIdRef,
  roomKeyRef,
  setCurrentRoom,
  setChannels,
  setCurrentChannel,
  setMessages,
}: UseSyncOptions) {
  const pendingHistoryRequestsRef = useRef(
    new Map<string, { resolve: (count: number) => void; timeoutId: number }>()
  )

  const handleSyncRequested = useCallback(async (manager: WebRTCManager, peerId: string) => {
    const room = currentRoomRef.current
    const chans = channelsRef.current
    const allMessages = await getRoomMessages(chans)
    const recentMessages = getRecentMessages(allMessages, MAX_SYNC_RESPONSE_MESSAGES)
    const key = roomKeyRef.current

    // Encrypt message contents for transmission
    let wireMessages = recentMessages
    if (key) {
      wireMessages = await Promise.all(recentMessages.map(async (m) => ({
        ...m,
        content: await encryptText(m.content, key),
      })))
    }

    const payloadRoom = room ? { ...room, channels: chans } : null
    const payload: SyncPayload = { room: payloadRoom, channels: chans, messages: wireMessages }
    console.log('Sending sync response to peer:', peerId, payload)
    manager.sendSyncResponse(peerId, payload)
  }, [currentRoomRef, channelsRef, roomKeyRef])

  const handleDataChannelReady = useCallback(async (manager: WebRTCManager, peerId: string) => {
    const chans = channelsRef.current
    const allMessages = await getRoomMessages(chans)
    const room = currentRoomRef.current
    const lastMessageId = allMessages.length > 0
      ? allMessages[allMessages.length - 1].id
      : null
    const recentMessageIds = allMessages.slice(-MAX_SYNC_HELLO_IDS).map(m => m.id)

    const hello: SyncHello = {
      lastMessageId,
      knownMessageIds: recentMessageIds,
      knownChannelIds: chans.map(c => c.id),
      roomCreatedAt: room?.createdAt ?? Date.now(),
    }
    console.log('Sending sync-hello to peer:', peerId, {
      lastMessageId,
      knownMessages: allMessages.length,
      knownChannels: chans.length,
    })
    manager.sendSyncHello(peerId, hello)
  }, [channelsRef, currentRoomRef])

  const handleSyncHello = useCallback(async (
    manager: WebRTCManager,
    peerId: string,
    peerHello: SyncHello
  ) => {
    const room = currentRoomRef.current
    const chans = channelsRef.current
    const allMessages = await getRoomMessages(chans)
    const key = roomKeyRef.current

    const peerChannelIdSet = new Set(peerHello.knownChannelIds)
    const peerKnownMessageIdSet = new Set(peerHello.knownMessageIds)
    const missingMessagesById = peerHello.lastMessageId
      ? allMessages.filter(m => m.id > peerHello.lastMessageId!)
      : allMessages.filter(m => !peerKnownMessageIdSet.has(m.id))
    const missingMessages = getRecentMessages(missingMessagesById, MAX_SYNC_RESPONSE_MESSAGES)
    const missingChannels = chans.filter(c => !peerChannelIdSet.has(c.id))

    if (missingMessages.length > 0 || missingChannels.length > 0 || (room && room.name !== `Room ${room.id}`)) {
      // Encrypt message contents for transmission
      let wireMessages = missingMessages
      if (key) {
        wireMessages = await Promise.all(missingMessages.map(async (m) => ({
          ...m,
          content: await encryptText(m.content, key),
        })))
      }

      const payloadRoom = room ? { ...room, channels: chans } : null
      const payload: SyncPayload = {
        room: payloadRoom,
        channels: missingChannels,
        messages: wireMessages,
      }
      console.log('Sending diff to peer:', peerId, {
        missingMessages: missingMessages.length,
        missingChannels: missingChannels.length,
      })
      manager.sendSyncResponse(peerId, payload)
    }
  }, [currentRoomRef, channelsRef, roomKeyRef])

  const handleSyncReceived = useCallback(async (payload: SyncPayload) => {
    console.log('[sync] Processing incoming sync payload:', {
      hasRoom: !!payload.room,
      roomName: payload.room?.name,
      channels: payload.channels?.length ?? 0,
      messages: payload.messages?.length ?? 0,
    })

    if (payload.room) {
      setCurrentRoom(prev => {
        if (!prev || prev.name.startsWith('Room ')) {
          return { ...payload.room!, channels: prev?.channels || payload.room!.channels || [] }
        }
        return prev
      })
    }

    const incomingChannels = payload.channels?.length
      ? payload.channels
      : (payload.room?.channels || [])

    if (incomingChannels.length > 0) {
      setChannels(prev => {
        const channelMap = new Map<string, Channel>()
        for (const ch of prev) channelMap.set(ch.id, ch)
        let newCount = 0
        for (const ch of incomingChannels) {
          if (!channelMap.has(ch.id)) {
            newCount++
            saveChannel(ch)
          }
          channelMap.set(ch.id, ch)
        }
        if (newCount === 0) return prev
      console.log(`[sync] Merged ${newCount} new channels from sync`)
        const merged = Array.from(channelMap.values())
        if (!currentChannelRef.current) {
          const firstText = merged.find(c => c.type === 'text')
          if (firstText) {
            setCurrentChannel(firstText)
            getMessagesByChannel(firstText.id).then(msgs => setMessages(msgs.slice(-MAX_IN_MEMORY_MESSAGES)))
          }
        }
        return merged
      })
    }

    if (payload.messages?.length) {
      const key = roomKeyRef.current
      for (const msg of payload.messages) {
        // Decrypt if we have a key and content looks encrypted (contains iv:ct separator)
        let decryptedMsg = msg
        if (key && msg.content.includes(':')) {
          const plaintext = await decryptText(msg.content, key)
          if (plaintext !== null) {
            decryptedMsg = { ...msg, content: plaintext }
          }
        }
        await saveMessage(decryptedMsg)
      }
      console.log(`[sync] Processed ${payload.messages.length} messages from sync`)
      console.log('[sync] Sync processing complete ✓')
      const chanId = currentChannelRef.current?.id
      if (chanId) {
        const channelMessages = await getMessagesByChannel(chanId)
        setMessages(channelMessages.slice(-MAX_IN_MEMORY_MESSAGES))
      }
    }
  }, [setCurrentRoom, setChannels, setCurrentChannel, setMessages, currentChannelRef])

  const handleRemoteMessage = useCallback(async (message: Message) => {
    // Decrypt if we have a key and content looks encrypted
    const key = roomKeyRef.current
    let decryptedMessage = message
    if (key && message.content.includes(':')) {
      const plaintext = await decryptText(message.content, key)
      if (plaintext !== null) {
        decryptedMessage = { ...message, content: plaintext }
      }
    }

    await saveMessage(decryptedMessage)
    setMessages(prev => {
      if (prev.some(m => m.id === decryptedMessage.id)) return prev
      if (decryptedMessage.channelId === currentChannelRef.current?.id) {
        return [...prev, decryptedMessage].slice(-MAX_IN_MEMORY_MESSAGES)
      }
      return prev
    })

    // Fire notification (sound blip + desktop notification)
    const userId = currentUserIdRef.current
    if (userId) {
      notifyIncomingMessage(
        decryptedMessage,
        userId,
        currentChannelRef.current?.id ?? null,
        currentRoomRef.current?.name,
      )
    }
  }, [setMessages, currentChannelRef, currentUserIdRef, currentRoomRef, roomKeyRef])

  const handleHistoryRequested = useCallback(async (
    manager: WebRTCManager,
    peerId: string,
    request: HistoryRequest
  ) => {
    const channelMessages = await getMessagesByChannel(request.channelId)
    const sorted = [...channelMessages].sort((a, b) => a.id.localeCompare(b.id))
    const before = request.beforeMessageId
      ? sorted.filter((message) => message.id < request.beforeMessageId!)
      : sorted
    const limit = Math.max(1, Math.min(request.limit || HISTORY_PAGE_SIZE, HISTORY_PAGE_SIZE))
    const page = before.slice(-limit)
    const hasMore = before.length > page.length

    const key = roomKeyRef.current
    let wireMessages = page
    if (key) {
      wireMessages = await Promise.all(page.map(async (message) => ({
        ...message,
        content: await encryptText(message.content, key),
      })))
    }

    const response: HistoryResponse = {
      requestId: request.requestId,
      channelId: request.channelId,
      messages: wireMessages,
      hasMore,
    }

    manager.sendHistoryResponse(peerId, response)
  }, [roomKeyRef])

  const handleHistoryReceived = useCallback(async (response: HistoryResponse) => {
    const key = roomKeyRef.current
    const decodedMessages: Message[] = []

    for (const incomingMessage of response.messages) {
      let decodedMessage = incomingMessage
      if (key && incomingMessage.content.includes(':')) {
        const plaintext = await decryptText(incomingMessage.content, key)
        if (plaintext !== null) decodedMessage = { ...incomingMessage, content: plaintext }
      }
      decodedMessages.push(decodedMessage)
      await saveMessage(decodedMessage)
    }

    if (response.channelId === currentChannelRef.current?.id && decodedMessages.length > 0) {
      setMessages((prev) => {
        const dedupe = new Map<string, Message>()
        for (const message of decodedMessages) dedupe.set(message.id, message)
        for (const message of prev) dedupe.set(message.id, message)
        const merged = Array.from(dedupe.values()).sort((a, b) => a.id.localeCompare(b.id))
        return merged.slice(-MAX_IN_MEMORY_MESSAGES)
      })
    }

    const pending = pendingHistoryRequestsRef.current.get(response.requestId)
    if (pending) {
      clearTimeout(pending.timeoutId)
      pendingHistoryRequestsRef.current.delete(response.requestId)
      pending.resolve(decodedMessages.length)
    }
  }, [currentChannelRef, roomKeyRef, setMessages])

  const requestOlderMessages = useCallback(async (
    manager: WebRTCManager,
    channelId: string,
    beforeMessageId: string | null
  ): Promise<number> => {
    const requestId = `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const request: HistoryRequest = {
      requestId,
      channelId,
      beforeMessageId,
      limit: HISTORY_PAGE_SIZE,
    }

    return new Promise<number>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        pendingHistoryRequestsRef.current.delete(requestId)
        resolve(0)
      }, HISTORY_REQUEST_TIMEOUT_MS)

      pendingHistoryRequestsRef.current.set(requestId, { resolve, timeoutId })

      const sent = manager.requestHistory(request)
      if (!sent) {
        clearTimeout(timeoutId)
        pendingHistoryRequestsRef.current.delete(requestId)
        resolve(0)
      }
    })
  }, [])

  return {
    handleSyncRequested,
    handleDataChannelReady,
    handleSyncHello,
    handleSyncReceived,
    handleRemoteMessage,
    handleHistoryRequested,
    handleHistoryReceived,
    requestOlderMessages,
  }
}
