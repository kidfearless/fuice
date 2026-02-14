import { useState, useRef, useCallback } from 'react'
import { Channel, Message } from '@/lib/types'
import { getMessagesByChannel, saveChannel, getRoomHistory, getAllRoomHistory, saveRoomHistory } from '@/lib/db'
import { generateChannelId } from '@/lib/helpers'
import { WebRTCManager } from '@/lib/webrtc'

const MAX_IN_MEMORY_MESSAGES = 500

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const channelsRef = useRef(channels)
  const currentChannelRef = useRef(currentChannel)

  // Keep refs in sync
  channelsRef.current = channels
  currentChannelRef.current = currentChannel

  const createChannel = useCallback(async (
    name: string,
    type: 'text' | 'voice',
    roomId: string | null,
    webrtcManager: WebRTCManager | null
  ) => {
    if (!roomId) return

    const channel: Channel = {
      id: generateChannelId(),
      name,
      type,
      createdAt: Date.now(),
    }

    await saveChannel(channel)
    setChannels(prev => [...prev, channel])
    webrtcManager?.broadcastChannel(channel)
  }, [])

  const selectChannel = useCallback(async (channelId: string, roomId?: string, roomName?: string) => {
    const channel = channelsRef.current.find(c => c.id === channelId)
    if (!channel) return

    setCurrentChannel(channel)
    if (channel.type === 'text') {
      const channelMessages = await getMessagesByChannel(channelId)
      setMessages(channelMessages.slice(-MAX_IN_MEMORY_MESSAGES))
    }

    // Update room history with last channel
    if (roomId) {
      const existingHistory = await getRoomHistory(roomId)
      let order = existingHistory?.order ?? 0
      if (!existingHistory) {
        const allHistory = await getAllRoomHistory()
        order = Math.max(...allHistory.map(h => h.order ?? 0), 0) + 1
      }
      await saveRoomHistory({
        roomId,
        roomName: roomName || roomId,
        lastAccessed: Date.now(),
        createdAt: existingHistory?.createdAt ?? Date.now(),
        order,
        lastChannelId: channelId,
      })
    }
  }, [])

  const handleChannelReceived = useCallback(async (channel: Channel) => {
    setChannels(prev => {
      if (prev.some(c => c.id === channel.id)) return prev
      saveChannel(channel)
      const updated = [...prev, channel]
      if (!currentChannelRef.current && channel.type === 'text') {
        setCurrentChannel(channel)
        getMessagesByChannel(channel.id).then(msgs => setMessages(msgs.slice(-MAX_IN_MEMORY_MESSAGES)))
      }
      return updated
    })
  }, [])

  return {
    channels,
    setChannels,
    currentChannel,
    setCurrentChannel,
    messages,
    setMessages,
    channelsRef,
    currentChannelRef,
    createChannel,
    selectChannel,
    handleChannelReceived,
  }
}
