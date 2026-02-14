import type { Peer } from './types'
import type { Message, Channel, ReactionEvent, FileMetadata } from './types'
import type { WebRTCCallbacks, SyncHello, SyncPayload, HistoryRequest, HistoryResponse } from './webrtcTypes'
import { FileTransferManager } from './fileTransfer'

/** Route an incoming data-channel JSON message to the appropriate callback. */
export function handleDataMessage(
	data: Record<string, unknown>,
	peer: Peer,
	_peers: Map<string, Peer>,
	cb: WebRTCCallbacks,
	fileTransferManager: FileTransferManager
) {
	const type = typeof data.type === 'string' ? data.type : ''
	switch (type) {
		case 'user-info': {
			if (typeof data.username === 'string') {
				cb.onPeerUserInfo?.(peer.id, data.username)
				peer.username = data.username
			}
			break
		}
		case 'message': if (data.message) cb.onMessageReceived?.(data.message as Message); break
		case 'file-metadata': if (data.metadata) fileTransferManager.initializeTransfer(data.metadata as FileMetadata); break
		case 'sync-request': cb.onSyncRequested?.(peer.id); break
		case 'sync-response': {
			const payload = data.payload as SyncPayload | undefined
			console.log('[sync] Received sync-response from', peer.id, '|', payload?.messages?.length ?? 0, 'msgs |', payload?.channels?.length ?? 0, 'channels')
			if (payload) cb.onSyncReceived?.(payload)
			break
		}
		case 'sync-hello': {
			console.log('[sync] Received sync-hello from', peer.id)
			const hello: SyncHello = {
				lastMessageId: typeof data.lastMessageId === 'string' ? data.lastMessageId : null,
				knownMessageIds: Array.isArray(data.knownMessageIds) ? (data.knownMessageIds as string[]) : [],
				knownChannelIds: Array.isArray(data.knownChannelIds) ? (data.knownChannelIds as string[]) : [],
				roomCreatedAt: typeof data.roomCreatedAt === 'number' ? data.roomCreatedAt : 0,
			}
			cb.onSyncHello?.(peer.id, hello)
			break
		}
		case 'history-request':
			if (data.request) cb.onHistoryRequested?.(peer.id, data.request as HistoryRequest)
			break
		case 'history-response':
			if (data.response) cb.onHistoryReceived?.(peer.id, data.response as HistoryResponse)
			break
		case 'room-key-request':
			cb.onRoomKeyRequested?.(peer.id, (typeof data.requesterUsername === 'string' ? data.requesterUsername : peer.username) ?? 'Unknown')
			break
		case 'room-key-share':
			if (typeof data.roomKey === 'string' && data.roomKey) {
				cb.onRoomKeyShared?.(peer.id, data.roomKey, (typeof data.sharedByUsername === 'string' ? data.sharedByUsername : peer.username) ?? 'Unknown')
			}
			break
		case 'presence-event':
			if (data.event && typeof data.event === 'object') {
				const event = data.event as { action?: string; username?: string }
				if ((event.action === 'join' || event.action === 'leave') && typeof event.username === 'string') {
					cb.onPresenceEvent?.(peer.id, { action: event.action, username: event.username })
				}
			}
			break
		case 'channel-created': if (data.channel) cb.onChannelReceived?.(data.channel as Channel); break
		case 'voice-state': {
			const voiceChannelId = typeof data.voiceChannelId === 'string' || data.voiceChannelId === null ? data.voiceChannelId : null
			peer.voiceChannelId = voiceChannelId ?? undefined
			cb.onVoiceStateChanged?.(peer.id, voiceChannelId)
			break
		}
		case 'speaking-state': {
			if (typeof data.speaking === 'boolean') {
				peer.isSpeaking = data.speaking
				cb.onPeerSpeaking?.(peer.id, data.speaking)
			}
			break
		}
		case 'screen-share-state': {
			const voiceChannelId = typeof data.voiceChannelId === 'string' || data.voiceChannelId === null ? data.voiceChannelId : null
			peer.isScreenSharing = voiceChannelId !== null
			peer.screenShareChannelId = voiceChannelId ?? undefined
			cb.onScreenShareStateChanged?.(peer.id, voiceChannelId)
			break
		}
		case 'camera-state': {
			if (typeof data.cameraOn === 'boolean') {
				peer.isCameraOn = data.cameraOn
				cb.onCameraStateChanged?.(peer.id, data.cameraOn)
			}
			break
		}
		case 'screen-watch': {
			if (typeof data.watch === 'boolean') {
				cb.onScreenWatchRequested?.(peer.id, data.watch)
			}
			break
		}
		case 'reaction': if (data.reaction) cb.onReactionReceived?.(peer.id, data.reaction as ReactionEvent); break
	}
}

/** Wire up a data channel's event handlers. */
export function setupDataChannel(
	peer: Peer,
	dataChannel: RTCDataChannel,
	localUsername: string,
	localUserId: string,
	peers: Map<string, Peer>,
	cb: WebRTCCallbacks,
	fileTransferManager: FileTransferManager
) {
	peer.dataChannel = dataChannel
	dataChannel.binaryType = 'arraybuffer'
	let pendingChunkMeta: { transferId: string; chunkIndex: number } | null = null
	let hasOpened = false

	const handleOpen = () => {
		if (hasOpened) return
		hasOpened = true
		dataChannel.send(JSON.stringify({ type: 'user-info', username: localUsername, userId: localUserId }))
		setTimeout(() => { if (dataChannel.readyState === 'open') cb.onDataChannelReady?.(peer.id) }, 300)
	}

	dataChannel.onopen = handleOpen
	if (dataChannel.readyState === 'open') {
		handleOpen()
	}

	dataChannel.onmessage = (event) => {
		if (event.data instanceof ArrayBuffer) {
			if (pendingChunkMeta) {
				fileTransferManager.receiveChunk(pendingChunkMeta.transferId, pendingChunkMeta.chunkIndex, event.data)
				pendingChunkMeta = null
			}
			return
		}
		try {
			const data = JSON.parse(event.data) as unknown
			if (data && typeof data === 'object' && (data as { type?: unknown }).type === 'file-chunk-meta') {
				const parsed = data as { type: string; transferId?: string; chunkIndex?: number }
				if (typeof parsed.transferId === 'string' && typeof parsed.chunkIndex === 'number') {
					pendingChunkMeta = { transferId: parsed.transferId, chunkIndex: parsed.chunkIndex }
				}
				return
			}
			if (data && typeof data === 'object') {
				handleDataMessage(data as Record<string, unknown>, peer, peers, cb, fileTransferManager)
			}
		} catch (error) {
			console.error('Error parsing message:', error)
		}
	}

	dataChannel.onerror = (e) => console.error('Data channel error:', e)
}
