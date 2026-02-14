import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react'
import { WebRTCManager } from '@/lib/webrtc'
import { saveMessage, saveRoom, getAllRoomHistory, deleteRoomHistory, getMessagesByChannel } from '@/lib/db'
import type { Room, Message, User, ReactionEvent } from '@/lib/types'
import { generateMessageId } from '@/lib/helpers'
import { createNewRoom, loadRoomForJoin } from '@/lib/roomActions'
import { P2PContextType } from '@/lib/P2PContextTypes'
import { useUser } from '@/hooks/useUser'
import { useChannels } from '@/hooks/useChannels'
import { usePeers } from '@/hooks/usePeers'
import { useVoice } from '@/hooks/useVoice'
import { useFileTransfer } from '@/hooks/useFileTransfer'
import { useSync } from '@/hooks/useSync'
import { subscribeToPush, getPushEndpoint } from '@/lib/pushSubscription'
import { getRoomKey, saveRoomKey, encryptText, decryptText, extractKeyFromFragment, deleteRoomKey } from '@/lib/crypto'

const MAX_IN_MEMORY_MESSAGES = 500

const P2PContext = createContext<P2PContextType | null>(null)
const INITIAL_HISTORY_MESSAGES = 100

export function useP2P() {
  const context = useContext(P2PContext)
  if (!context) throw new Error('useP2P must be used within P2PProvider')
  return context
}

export function P2PProvider({ children }: { children: ReactNode }) {
  const { currentUser, setUsername, getDefaultUsername, getUserForRoom, setRoomUsername } = useUser()
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null)
  const [isSignalingConnected, setIsSignalingConnected] = useState(false)
  const autoJoinAttempted = useRef(false)
  const missingKeyNoticePendingRef = useRef(false)
  const requestedRoomKeyPeerIdsRef = useRef<Set<string>>(new Set())
  const peerPresenceStateRef = useRef<Map<string, 'joined' | 'left'>>(new Map())
  const peerNamesRef = useRef<Map<string, string>>(new Map())
  const pendingJoinAnnouncementRef = useRef<string | null>(null)
  const voiceStateRef = useRef<{ activeVoiceChannel: string | null; isScreenSharing: boolean; isCameraOn: boolean }>({ activeVoiceChannel: null, isScreenSharing: false, isCameraOn: false })

  const currentRoomRef = useRef(currentRoom)
  const currentUserRef = useRef(currentUser)
  const currentUserIdRef = useRef<string | null>(currentUser?.id ?? null)
  const roomKeyRef = useRef<string | null>(null)
  currentRoomRef.current = currentRoom
  currentUserRef.current = currentUser
  currentUserIdRef.current = currentUser?.id ?? null

  const {
    channels, setChannels, currentChannel, setCurrentChannel,
    messages, setMessages, channelsRef, currentChannelRef,
    createChannel: createChannelAction, selectChannel: selectChannelAction,
    handleChannelReceived,
  } = useChannels()

  const {
    peers, setPeers, remoteStreams, remoteScreenStreams, remoteCameraStreams, speakingUsers, setSpeakingUsers,
    handlePeerConnected, handlePeerDisconnected, handleRemoteStream,
    handleRemoteScreenStream, handleRemoteCameraStream, handleVoiceStateChanged, handlePeerSpeaking, handlePeerUserInfo,
    handlePeerScreenShareStateChanged, handlePeerCameraStateChanged,
  } = usePeers()

  const voice = useVoice({
    currentUserRef,
    webrtcManager,
    setSpeakingUsers,
  })
  voiceStateRef.current = { activeVoiceChannel: voice.activeVoiceChannel, isScreenSharing: voice.isScreenSharing, isCameraOn: voice.isCameraOn }

  const { fileTransfers, handleFileTransferProgress, handleFileReceived, sendFile: sendFileAction } = useFileTransfer({ currentChannelRef })

  const {
    handleSyncRequested, handleDataChannelReady, handleSyncHello,
    handleSyncReceived, handleRemoteMessage,
    handleHistoryRequested, handleHistoryReceived, requestOlderMessages,
  } = useSync({
    currentRoomRef, channelsRef, currentChannelRef, currentUserIdRef, roomKeyRef,
    setCurrentRoom, setChannels, setCurrentChannel, setMessages,
  })

  // Keep room.channels in sync with channels state
  useEffect(() => {
    if (currentRoom) {
      saveRoom({ ...currentRoom, channels })
    }
  }, [channels, currentRoom])

  const postSystemMessage = useCallback((content: string) => {
    const room = currentRoomRef.current
    if (!room) return

    const targetChannel = currentChannelRef.current?.type === 'text'
      ? currentChannelRef.current
      : channelsRef.current.find(channel => channel.type === 'text') ?? null
    if (!targetChannel) return

    const notice: Message = {
      id: `system-${generateMessageId()}`,
      channelId: targetChannel.id,
      userId: 'system',
      username: 'Room Access',
      content,
      timestamp: Date.now(),
      synced: true,
    }

    void saveMessage(notice)
      .then(() => {
        setMessages(prev => {
          if (prev.some(message => message.id === notice.id)) return prev
          if (notice.channelId !== currentChannelRef.current?.id) return prev
          return [...prev, notice].slice(-MAX_IN_MEMORY_MESSAGES)
        })
      })
      .catch(error => console.error('Failed to save system message:', error))
  }, [channelsRef, currentChannelRef, setMessages])

  const announcePresenceIntent = useCallback(async (
    manager: WebRTCManager | null,
    action: 'join' | 'leave',
    username?: string
  ): Promise<boolean> => {
    const trimmed = username?.trim() || ''
    if (!manager || !trimmed) return false
    const sent = manager.broadcastPresenceEvent(action, trimmed)
    if (!sent) return false
    await new Promise(resolve => setTimeout(resolve, 100))
    return true
  }, [])

  const applyReaction = useCallback((reaction: ReactionEvent) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== reaction.messageId) return msg
      const reactions = { ...(msg.reactions ?? {}) }
      const list = [...(reactions[reaction.emoji] ?? [])]
      if (reaction.action === 'add') {
        if (!list.some(r => r.userId === reaction.userId)) {
          list.push({ userId: reaction.userId, username: reaction.username })
        }
      } else {
        const idx = list.findIndex(r => r.userId === reaction.userId)
        if (idx !== -1) list.splice(idx, 1)
      }
      if (list.length > 0) {
        reactions[reaction.emoji] = list
      } else {
        delete reactions[reaction.emoji]
      }
      const updated = { ...msg, reactions: Object.keys(reactions).length > 0 ? reactions : undefined }
      void saveMessage(updated)
      return updated
    }))
  }, [setMessages])

  const setupManager = useCallback((manager: WebRTCManager) => {
    manager.setCallbacks({
      onMessageReceived: handleRemoteMessage,
      onPeerConnected: (peer) => {
        handlePeerConnected(peer)
        const connectedUsername = peer.username?.trim() || ''
        if (connectedUsername) peerNamesRef.current.set(peer.id, connectedUsername)
      },
      onPeerDisconnected: (peerId) => {
        handlePeerDisconnected(peerId)
        peerNamesRef.current.delete(peerId)
        peerPresenceStateRef.current.delete(peerId)
      },
      onRemoteAudioStream: handleRemoteStream,
      onRemoteScreenStream: handleRemoteScreenStream,
      onRemoteCameraStream: handleRemoteCameraStream,
      onSignalingConnected: () => {
        setIsSignalingConnected(true)
        // Re-register push subscription on every reconnect so the server
        // always has our subscription (survives server restarts).
        registerPush(manager)
      },
      onSignalingDisconnected: () => setIsSignalingConnected(false),
      onFileTransferProgress: handleFileTransferProgress,
      onFileReceived: (id, blob, meta) => handleFileReceived(id, blob, meta, setMessages),
      onSyncRequested: (peerId) => handleSyncRequested(manager, peerId),
      onSyncReceived: handleSyncReceived,
      onChannelReceived: handleChannelReceived,
      onVoiceStateChanged: handleVoiceStateChanged,
      onPeerSpeaking: handlePeerSpeaking,
      onPeerUserInfo: (peerId, username) => {
        handlePeerUserInfo(peerId, username)
        const trimmed = username.trim()
        if (trimmed) {
          peerNamesRef.current.set(peerId, trimmed)
        }
      },
      onDataChannelReady: async (peerId) => {
        await handleDataChannelReady(manager, peerId)
        if (!roomKeyRef.current && !requestedRoomKeyPeerIdsRef.current.has(peerId)) {
          const requested = manager.requestRoomKey(peerId)
          if (requested) requestedRoomKeyPeerIdsRef.current.add(peerId)
        }

        const pendingJoinUsername = pendingJoinAnnouncementRef.current
        if (pendingJoinUsername) {
          const sent = await announcePresenceIntent(manager, 'join', pendingJoinUsername)
          if (sent) pendingJoinAnnouncementRef.current = null
        }

        // Re-send our voice / screen-share / camera state so the
        // reconnecting peer can see us in the voice channel.
        const vs = voiceStateRef.current
        if (vs.activeVoiceChannel) {
          manager.sendVoiceStateToPeer(
            peerId,
            vs.activeVoiceChannel,
            vs.isScreenSharing,
            vs.isScreenSharing ? vs.activeVoiceChannel : null,
            vs.isCameraOn,
          )
        }
      },
      onSyncHello: (peerId, hello) => handleSyncHello(manager, peerId, hello),
      onHistoryRequested: (peerId, request) => handleHistoryRequested(manager, peerId, request),
      onHistoryReceived: (_peerId, response) => { void handleHistoryReceived(response) },
      onRoomKeyRequested: (peerId, requesterUsername) => {
        const room = currentRoomRef.current
        const key = roomKeyRef.current
        if (!room || !key) return
        const targetChannel = currentChannelRef.current?.type === 'text'
          ? currentChannelRef.current
          : channelsRef.current.find(channel => channel.type === 'text') ?? null
        if (!targetChannel) return

        const requestMessage: Message = {
          id: `system-room-key-request-${room.id}-${peerId}`,
          channelId: targetChannel.id,
          userId: 'system',
          username: 'Room Access',
          content: `${requesterUsername} joined without the room key.`,
          timestamp: Date.now(),
          synced: true,
          systemAction: 'authorize-room-key',
          systemActionTargetPeerId: peerId,
          systemActionTargetUsername: requesterUsername,
          systemActionResolved: false,
        }

        void saveMessage(requestMessage)
          .then(() => {
            setMessages(prev => {
              if (prev.some(message => message.id === requestMessage.id)) return prev
              if (requestMessage.channelId !== currentChannelRef.current?.id) return prev
              return [...prev, requestMessage].slice(-MAX_IN_MEMORY_MESSAGES)
            })
          })
          .catch(error => console.error('Failed to save room-key request message:', error))
      },
      onRoomKeyShared: (peerId, roomKey, sharedByUsername) => {
        const room = currentRoomRef.current
        if (!room) return
        roomKeyRef.current = roomKey
        requestedRoomKeyPeerIdsRef.current.clear()

        void saveRoomKey(room.id, roomKey)
          .then(async () => {
            const targetChannel = currentChannelRef.current?.type === 'text'
              ? currentChannelRef.current
              : channelsRef.current.find(channel => channel.type === 'text') ?? null

            if (targetChannel) {
              const channelMessages = await getMessagesByChannel(targetChannel.id)
              const decryptedMessages = await Promise.all(channelMessages.map(async (message) => {
                if (!message.content.includes(':')) return message
                const plaintext = await decryptText(message.content, roomKey)
                if (plaintext === null) return message
                const decoded = { ...message, content: plaintext }
                await saveMessage(decoded)
                return decoded
              }))
              setMessages(decryptedMessages.slice(-MAX_IN_MEMORY_MESSAGES))

              const notice: Message = {
                id: `system-room-key-shared-${room.id}-${peerId}`,
                channelId: targetChannel.id,
                userId: 'system',
                username: 'Room Access',
                content: `${sharedByUsername} authorized you and shared the room key.`,
                timestamp: Date.now(),
                synced: true,
              }

              await saveMessage(notice)
              setMessages(prev => {
                if (prev.some(message => message.id === notice.id)) return prev
                if (notice.channelId !== currentChannelRef.current?.id) return prev
                return [...prev, notice].slice(-MAX_IN_MEMORY_MESSAGES)
              })
            }

            await handleDataChannelReady(manager, peerId)
          })
          .catch(error => console.error('Failed to apply shared room key:', error))
      },
      onPresenceEvent: (peerId, event) => {
        const username = event.username?.trim() || peerNamesRef.current.get(peerId)?.trim() || ''
        if (!username) return

        peerNamesRef.current.set(peerId, username)

        const lastState = peerPresenceStateRef.current.get(peerId)
        if (event.action === 'join') {
          if (lastState === 'joined') return
          peerPresenceStateRef.current.set(peerId, 'joined')
          postSystemMessage(`${username} joined the room.`)
          return
        }

        if (lastState === 'left') return
        peerPresenceStateRef.current.set(peerId, 'left')
        postSystemMessage(`${username} left the room.`)
      },
      onScreenShareStateChanged: (peerId, voiceChannelId) => {
        handlePeerScreenShareStateChanged(peerId, voiceChannelId)
        voice.handlePeerScreenShareStateChanged(peerId, voiceChannelId)
        // Play stream-ended sound for viewers when a peer stops sharing
        if (voiceChannelId === null) {
          import('@/lib/voiceSounds').then(s => s.playStreamEndedSound())
        }
      },
      onScreenWatchRequested: (peerId, watch) => {
        manager.setScreenShareSubscription(peerId, watch)
        // Play viewer join/leave sound for the streamer
        if (voiceStateRef.current.isScreenSharing) {
          if (watch) {
            import('@/lib/voiceSounds').then(s => s.playViewerJoinSound())
          } else {
            import('@/lib/voiceSounds').then(s => s.playViewerLeaveSound())
          }
        }
      },
      onCameraStateChanged: (peerId, cameraOn) => {
        handlePeerCameraStateChanged(peerId, cameraOn)
      },
      onReactionReceived: (_peerId, reaction) => {
        applyReaction(reaction)
      },
      onPushRenew: async () => {
        console.log('[push] Server requested subscription renewal')
        import('@/lib/pushSubscription').then(async (m) => {
           await m.unsubscribeFromPush()
           registerPush(manager)
        })
      },
      onSyncPoll: async (pollId, lastMessageId, _roomId) => {
        // An offline client's service worker asked the signaling server for
        // missed messages. We are the online peer chosen to answer.
        // Gather messages from IDB, encrypt if needed, and respond.
        try {
          const chans = channelsRef.current
          const key = roomKeyRef.current
          const textChannels = chans.filter(c => c.type === 'text')
          const perChannel = await Promise.all(textChannels.map(c => getMessagesByChannel(c.id)))
          let allMsgs = perChannel.flat().sort((a, b) => a.id.localeCompare(b.id))
          if (lastMessageId) {
            allMsgs = allMsgs.filter(m => m.id > lastMessageId)
          }
          // Cap to 200 messages
          allMsgs = allMsgs.slice(-200)
          // Encrypt for transit if we have a room key
          let wireMsgs = allMsgs
          if (key) {
            const { encryptText: enc } = await import('@/lib/crypto')
            wireMsgs = await Promise.all(allMsgs.map(async m => ({
              ...m,
              content: await enc(m.content, key),
            })))
          }
          manager.respondToSyncPoll(pollId, wireMsgs)
          console.log(`[sync-poll] Responded with ${wireMsgs.length} messages for poll ${pollId}`)
        } catch (err) {
          console.error('[sync-poll] Failed to respond:', err)
          manager.respondToSyncPoll(pollId, [])
        }
      },
    })
    setWebrtcManager(manager)
  }, [
    handleRemoteMessage, handlePeerConnected, handlePeerDisconnected,
    handleRemoteStream, handleRemoteScreenStream, handleRemoteCameraStream, handleFileTransferProgress, handleFileReceived,
    handleSyncRequested, handleSyncReceived, handleChannelReceived,
    handleVoiceStateChanged, handlePeerSpeaking, handlePeerUserInfo,
    handlePeerScreenShareStateChanged, handlePeerCameraStateChanged,
    handleDataChannelReady, handleSyncHello,
    handleHistoryRequested, handleHistoryReceived, setMessages,
    channelsRef, currentChannelRef,
    postSystemMessage,
    announcePresenceIntent,
    applyReaction,
    voice.handlePeerScreenShareStateChanged,
  ])

  /** Subscribe to Web Push and register with the signaling server.
   *  Called on room create/join AND on every signaling reconnect so the
   *  server always has a fresh subscription (survives server restarts). */
  const registerPush = useCallback(async (manager: WebRTCManager, existingSub?: PushSubscriptionJSON) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    try {
      const sub = existingSub ?? await subscribeToPush()
      if (sub) manager.registerPushSubscription(sub)
    } catch (e) {
      console.warn('[push] Could not register push subscription:', e)
    }
  }, [])

  const registerPushForCurrentRoom = useCallback(async (subscription?: PushSubscriptionJSON) => {
    if (!webrtcManager) return
    await registerPush(webrtcManager, subscription)
  }, [webrtcManager, registerPush])

  const resolveRoomUser = useCallback((roomId: string, usernameOverride?: string): User | null => {
    const preferredUsername = usernameOverride?.trim()
    if (preferredUsername) return setRoomUsername(roomId, preferredUsername)

    const roomUser = getUserForRoom(roomId)
    if (roomUser) return roomUser

    const defaultUsername = getDefaultUsername()?.trim()
    if (defaultUsername) return setRoomUsername(roomId, defaultUsername)

    return null
  }, [getDefaultUsername, getUserForRoom, setRoomUsername])

  const createRoom = async (roomName: string, usernameOverride?: string, announceJoin = false): Promise<string> => {
    const preferredUsername = usernameOverride?.trim() || getDefaultUsername()?.trim() || null
    if (!preferredUsername) throw new Error('No user set')

    const { room, channels: chs, defaultChannel, roomKey } = await createNewRoom(roomName)
    const activeUser = resolveRoomUser(room.id, preferredUsername)
    if (!activeUser) throw new Error('No user set')

    roomKeyRef.current = roomKey
    currentUserIdRef.current = activeUser.id
    setCurrentRoom(room)
    setChannels(chs)
    setCurrentChannel(defaultChannel)
    setMessages([])
    setPeers([])
    requestedRoomKeyPeerIdsRef.current.clear()
    missingKeyNoticePendingRef.current = false
    peerNamesRef.current.clear()
    pendingJoinAnnouncementRef.current = null
    localStorage.setItem('p2p-last-room', room.id)

    try { webrtcManager?.disconnect() } catch (disconnectError) { console.debug('Disconnect before room creation failed:', disconnectError) }
    const mgr = new WebRTCManager(activeUser.id, activeUser.username, room.id)
    setupManager(mgr)
    registerPush(mgr)
    if (announceJoin) {
      pendingJoinAnnouncementRef.current = activeUser.username
      const sent = await announcePresenceIntent(mgr, 'join', activeUser.username)
      if (sent) pendingJoinAnnouncementRef.current = null
    }
    return room.id
  }

  const joinRoom = async (roomCode: string, encryptionKey?: string, usernameOverride?: string, announceJoin = false) => {
    const activeUser = resolveRoomUser(roomCode, usernameOverride)
    if (!activeUser) throw new Error('No user set')

    const key = encryptionKey ?? extractKeyFromFragment() ?? await getRoomKey(roomCode)
    const joinedWithoutKey = !key

    try { webrtcManager?.disconnect() } catch (disconnectError) { console.debug('Disconnect before room join failed:', disconnectError) }
    const { room, channels: chs, channelToSelect, messages: msgs } = await loadRoomForJoin(roomCode)

    if (key) {
      await saveRoomKey(roomCode, key)
    }
    roomKeyRef.current = key
    requestedRoomKeyPeerIdsRef.current.clear()
    missingKeyNoticePendingRef.current = joinedWithoutKey
    peerNamesRef.current.clear()
    pendingJoinAnnouncementRef.current = null

    currentUserIdRef.current = activeUser.id
    setCurrentRoom(room)
    setChannels(chs)
    setCurrentChannel(channelToSelect)
    setMessages(msgs.slice(-INITIAL_HISTORY_MESSAGES))
    localStorage.setItem('p2p-last-room', roomCode)

    const mgr = new WebRTCManager(activeUser.id, activeUser.username, roomCode)
    setupManager(mgr)
    registerPush(mgr)
    if (announceJoin) {
      pendingJoinAnnouncementRef.current = activeUser.username
      const sent = await announcePresenceIntent(mgr, 'join', activeUser.username)
      if (sent) pendingJoinAnnouncementRef.current = null
    }
  }

  useEffect(() => {
    if (!missingKeyNoticePendingRef.current) return
    if (!currentRoom || !currentChannel || currentChannel.type !== 'text') return

    const id = `system-missing-key-${currentRoom.id}`
    const notice: Message = {
      id,
      channelId: currentChannel.id,
      userId: 'system',
      username: 'Security Notice',
      content: 'You joined without an encryption key. Messages may appear encrypted. Would you like to share it? Ask a room member to share the full invite link (includes #ek=...).',
      timestamp: Date.now(),
      synced: true,
    }

    missingKeyNoticePendingRef.current = false

    void saveMessage(notice)
      .then(() => {
        setMessages(prev => {
          if (prev.some(m => m.id === notice.id)) return prev
          if (notice.channelId !== currentChannelRef.current?.id) return prev
          return [...prev, notice].slice(-MAX_IN_MEMORY_MESSAGES)
        })
      })
      .catch((error) => {
        console.error('Failed to save missing-key notice:', error)
      })
  }, [currentRoom, currentChannel, setMessages, currentChannelRef])

  const leaveRoom = async (autoSwitchToOtherRoom = true, announceLeave = false) => {
    const leavingRoomId = currentRoomRef.current?.id
    const leavingUsername = currentUserRef.current?.username

    if (announceLeave) {
      await announcePresenceIntent(webrtcManager, 'leave', leavingUsername)
    }

    localStorage.removeItem('p2p-last-room')
    try { webrtcManager?.disconnect() } catch (e) { console.warn('Disconnect error (ignored):', e) }
    setWebrtcManager(null)
    setCurrentRoom(null)
    setChannels([])
    setCurrentChannel(null)
    setMessages([])
    setPeers([])
    voice.cleanupVoice()
    roomKeyRef.current = null
    requestedRoomKeyPeerIdsRef.current.clear()
    peerPresenceStateRef.current.clear()
    peerNamesRef.current.clear()
    pendingJoinAnnouncementRef.current = null

    // Remove the room from local IndexedDB history
    if (leavingRoomId) {
      await deleteRoomHistory(leavingRoomId)
      await deleteRoomKey(leavingRoomId)
    }

    if (autoSwitchToOtherRoom && leavingRoomId) {
      const allHistory = await getAllRoomHistory()
      if (allHistory.length > 0) {
        const sorted = allHistory.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        try { await joinRoom(sorted[0].roomId) } catch (e) { console.error('Failed to auto-switch:', e) }
      }
    }
  }

  // Auto-join last room
  useEffect(() => {
    if (!currentUser || currentRoom || autoJoinAttempted.current) return
    const lastRoomId = localStorage.getItem('p2p-last-room')
    if (lastRoomId) {
      autoJoinAttempted.current = true
      joinRoom(lastRoomId).catch(e => console.error('Failed to auto-join:', e))
    }
  }, [currentUser, currentRoom])

  const sendMessage = async (content: string) => {
    if (!currentUser || !currentChannel || currentChannel.type !== 'text') return
    const message: Message = {
      id: generateMessageId(), channelId: currentChannel.id,
      userId: currentUser.id, username: currentUser.username,
      content, timestamp: Date.now(), synced: false,
    }
    // Save plaintext locally
    await saveMessage(message)
    setMessages(prev => [...prev, message].slice(-MAX_IN_MEMORY_MESSAGES))

    // Encrypt content for transmission if we have a room key
    const key = roomKeyRef.current
    let wireMessage = message
    if (key) {
      const encrypted = await encryptText(content, key)
      wireMessage = { ...message, content: encrypted }
    }

    webrtcManager?.sendMessage(wireMessage)

    // Push the full message to offline peers via the signaling server.
    // Always send — the sender's local notification pref is irrelevant for
    // receivers who may have push enabled.
    {
      const preview = message.fileMetadata ? `📎 ${message.fileMetadata.name}` : content
      // Truncate preview to keep the push payload under the 4 KB Web Push limit
      const truncatedPreview = preview.length > 200 ? preview.slice(0, 197) + '…' : preview
      const encryptedPreview = key ? await encryptText(truncatedPreview, key) : truncatedPreview
      // Strip large fields (fileMetadata) from the push message to stay under 4KB
      const pushMessage = { ...wireMessage }
      delete pushMessage.fileMetadata
      const pushPayload = JSON.stringify({
        title: currentUser.username,
        body: encryptedPreview,
        roomId: currentRoom?.id,
        encrypted: !!key,
        message: pushMessage,  // encrypted message object — SW decrypts before saving
      })
      // Pass our own endpoint so the server can skip sending to us
      getPushEndpoint().then(endpoint => {
        webrtcManager?.pushToOfflinePeers(pushPayload, endpoint ?? undefined)
      })
    }
  }

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return
    const existing = msg.reactions?.[emoji]?.find(r => r.userId === currentUser.id)
    const action: 'add' | 'remove' = existing ? 'remove' : 'add'
    const reaction: ReactionEvent = {
      messageId, emoji,
      userId: currentUser.id,
      username: currentUser.username,
      action,
    }
    applyReaction(reaction)
    webrtcManager?.sendReaction(reaction)
  }

  const sendGifMessage = async (gifUrl: string, searchQuery: string) => {
    if (!currentUser || !currentChannel || currentChannel.type !== 'text') return
    const message: Message = {
      id: generateMessageId(), channelId: currentChannel.id,
      userId: currentUser.id, username: currentUser.username,
      content: searchQuery, timestamp: Date.now(), synced: false,
      gifUrl,
    }
    await saveMessage(message)
    setMessages(prev => [...prev, message].slice(-MAX_IN_MEMORY_MESSAGES))

    const key = roomKeyRef.current
    let wireMessage = message
    if (key) {
      const encrypted = await encryptText(searchQuery, key)
      wireMessage = { ...message, content: encrypted }
    }

    webrtcManager?.sendMessage(wireMessage)

    {
      const preview = `🎬 GIF: ${searchQuery}`
      const encryptedPreview = key ? await encryptText(preview, key) : preview
      const pushPayload = JSON.stringify({
        title: currentUser.username,
        body: encryptedPreview,
        roomId: currentRoom?.id,
        encrypted: !!key,
        message: wireMessage,
      })
      getPushEndpoint().then(endpoint => {
        webrtcManager?.pushToOfflinePeers(pushPayload, endpoint ?? undefined)
      })
    }
  }

  const authorizePeerAccess = async (messageId: string, peerId: string) => {
    const roomKey = roomKeyRef.current
    if (!webrtcManager || !roomKey) return

    const shared = webrtcManager.shareRoomKey(peerId, roomKey)
    if (!shared) return

    const authorizedBy = currentUserRef.current?.username ?? 'A room member'
    const original = messages.find(message => message.id === messageId)
    if (!original) return

    const updated: Message = {
      ...original,
      content: `${original.systemActionTargetUsername ?? 'This user'} was authorized by ${authorizedBy}.`,
      systemActionResolved: true,
      systemActionResolvedBy: authorizedBy,
      timestamp: Date.now(),
    }

    await saveMessage(updated)
    setMessages(prev => prev.map(message => message.id === messageId ? updated : message))
  }

  // Cleanup on unmount
  const webrtcManagerRef = useRef(webrtcManager)
  webrtcManagerRef.current = webrtcManager
  useEffect(() => () => { webrtcManagerRef.current?.disconnect(); voice.cleanupVoice() }, [])

  // ── Listen for messages delivered by the service worker via push ───
  // When the SW receives a push and saves the message to IndexedDB, it posts
  // a message to all open client windows so they can refresh the view.
  // Also handles background-poll-complete from periodic polling.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'push-message-received' && event.data.message) {
        const msg = event.data.message as Message
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          if (msg.channelId === currentChannelRef.current?.id) {
            return [...prev, msg].slice(-MAX_IN_MEMORY_MESSAGES)
          }
          return prev
        })
      }
      // SW finished a background poll and saved new messages to IDB
      if (event.data?.type === 'background-poll-complete' && event.data.newMessages > 0) {
        const chanId = currentChannelRef.current?.id
        if (chanId) {
          getMessagesByChannel(chanId).then(msgs => setMessages(msgs.slice(-MAX_IN_MEMORY_MESSAGES)))
        }
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [setMessages, currentChannelRef])

  // ── Visibility-based P2P resync ────────────────────────────────────
  // When the user switches back to the tab (or opens the PWA), reload
  // messages from IndexedDB (which may have been written by the SW from
  // push or background poll), trigger an immediate SW poll for any
  // remaining gaps, and the existing P2P sync will fill the rest.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const chanId = currentChannelRef.current?.id
        if (chanId) {
          getMessagesByChannel(chanId).then(msgs => setMessages(msgs.slice(-MAX_IN_MEMORY_MESSAGES)))
        }

        // Ask the SW to do an immediate poll for missed messages
        if ('serviceWorker' in navigator) {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'poll-now' })
          } else {
            navigator.serviceWorker.getRegistration().then((registration) => {
              registration?.active?.postMessage({ type: 'poll-now' })
              registration?.waiting?.postMessage({ type: 'poll-now' })
            }).catch(() => {
              // no-op: best effort
            })
          }
        }

        // If we have a WebRTC manager, trigger P2P re-sync with all
        // connected peers (in case the data channel is still open but
        // we missed messages while the tab was hidden).
        const mgr = webrtcManagerRef.current
        if (mgr) {
          const peers = mgr.getPeers()
          for (const peer of peers) {
            if (peer.dataChannel?.readyState === 'open') {
              handleDataChannelReady(mgr, peer.id)
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [setMessages, currentChannelRef, handleDataChannelReady])

  return (
    <P2PContext.Provider value={{
      currentUser, currentRoom, channels, currentChannel, messages, peers,
      activeVoiceChannel: voice.activeVoiceChannel,
      isMuted: voice.isMuted, isDeafened: voice.isDeafened,
      isScreenSharing: voice.isScreenSharing,
      isCameraOn: voice.isCameraOn,
      localScreenShareStream: voice.screenShareStream,
      localCameraStream: voice.localCameraStream,
      watchedScreenShares: voice.watchedScreenShares,
      localStream: voice.localStream,
      remoteStreams,
      remoteScreenStreams,
      remoteCameraStreams,
      isSignalingConnected, hasRoomKey: !!roomKeyRef.current, fileTransfers, speakingUsers,
      setUsername, createRoom, joinRoom, leaveRoom,
      createChannel: (name, type) => createChannelAction(name, type, currentRoom?.id ?? null, webrtcManager),
      selectChannel: (id) => selectChannelAction(id, currentRoom?.id, currentRoom?.name),
      sendMessage,
      sendGifMessage,
      toggleReaction,
      authorizePeerAccess,
      loadOlderMessages: async () => {
        if (!webrtcManager || !currentChannel || currentChannel.type !== 'text') return 0
        const beforeMessageId = messages.length > 0 ? messages[0].id : null
        return requestOlderMessages(webrtcManager, currentChannel.id, beforeMessageId)
      },
      sendFile: (file) => sendFileAction(file, currentUser?.id ?? '', currentUser?.username ?? '', currentChannel?.id ?? '', currentChannel?.type ?? '', webrtcManager, setMessages),
      registerPushForCurrentRoom,
      joinVoiceChannel: voice.joinVoiceChannel,
      leaveVoiceChannel: voice.leaveVoiceChannel,
      toggleMute: voice.toggleMute, toggleDeafen: voice.toggleDeafen,
      startScreenShare: voice.startScreenShare, stopScreenShare: voice.stopScreenShare,
      startCamera: voice.startCamera, stopCamera: voice.stopCamera,
      watchScreenShare: voice.watchScreenShare,
      stopWatchingScreenShare: voice.stopWatchingScreenShare,
    }}>
      {children}
    </P2PContext.Provider>
  )
}
