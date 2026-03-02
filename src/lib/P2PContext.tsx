import { createContext, useContext, useState, ReactNode, useRef, Component } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
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

export const P2PContext = createContext<P2PContextType | null>(null)
const INITIAL_HISTORY_MESSAGES = 100

export function useP2P()
{
	const context = useContext(P2PContext)
	if (!context) throw new Error('useP2P must be used within P2PProvider')
	return context
}

// ── Props passed from the wrapper to the class ──

interface P2PProviderProps
{
	children: ReactNode
	user: ReturnType<typeof useUser>
	currentRoom: Room | null
	setCurrentRoom: Dispatch<SetStateAction<Room | null>>
	webrtcManager: WebRTCManager | null
	setWebrtcManager: Dispatch<SetStateAction<WebRTCManager | null>>
	isSignalingConnected: boolean
	setIsSignalingConnected: Dispatch<SetStateAction<boolean>>
	currentRoomRef: MutableRefObject<Room | null>
	currentUserRef: MutableRefObject<User | null>
	currentUserIdRef: MutableRefObject<string | null>
	roomKeyRef: MutableRefObject<string | null>
	channelState: ReturnType<typeof useChannels>
	peerState: ReturnType<typeof usePeers>
	voice: ReturnType<typeof useVoice>
	fileTransfer: ReturnType<typeof useFileTransfer>
	sync: ReturnType<typeof useSync>
}

// ── Thin wrapper: calls hooks, renders the class ──

export function P2PProviderBridge({ children }: { children: ReactNode })
{
	const user = useUser()
	const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
	const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null)
	const [isSignalingConnected, setIsSignalingConnected] = useState(false)

	const currentRoomRef = useRef(currentRoom)
	const currentUserRef = useRef(user.currentUser)
	const currentUserIdRef = useRef<string | null>(user.currentUser?.id ?? null)
	const roomKeyRef = useRef<string | null>(null)
	currentRoomRef.current = currentRoom
	currentUserRef.current = user.currentUser
	currentUserIdRef.current = user.currentUser?.id ?? null

	const channelState = useChannels()
	const peerState = usePeers()
	const voice = useVoice({ currentUserRef, webrtcManager, setSpeakingUsers: peerState.setSpeakingUsers })
	const fileTransfer = useFileTransfer({ currentChannelRef: channelState.currentChannelRef })
	const sync = useSync({
		currentRoomRef, channelsRef: channelState.channelsRef,
		currentChannelRef: channelState.currentChannelRef,
		currentUserIdRef, roomKeyRef,
		setCurrentRoom, setChannels: channelState.setChannels,
		setCurrentChannel: channelState.setCurrentChannel,
		setMessages: channelState.setMessages,
	})

	return (
		<P2PProvider
			user={user}
			currentRoom={currentRoom} setCurrentRoom={setCurrentRoom}
			webrtcManager={webrtcManager} setWebrtcManager={setWebrtcManager}
			isSignalingConnected={isSignalingConnected} setIsSignalingConnected={setIsSignalingConnected}
			currentRoomRef={currentRoomRef} currentUserRef={currentUserRef}
			currentUserIdRef={currentUserIdRef} roomKeyRef={roomKeyRef}
			channelState={channelState} peerState={peerState}
			voice={voice} fileTransfer={fileTransfer} sync={sync}
		>
			{children}
		</P2PProvider>
	)
}

// ── Class: all business logic ──

export class P2PProvider extends Component<P2PProviderProps>
{
	// ── Instance properties (replacing useRef) ──

	private autoJoinAttempted = false
	private missingKeyNoticePending = false
	private requestedRoomKeyPeerIds = new Set<string>()
	private peerPresenceState = new Map<string, 'joined' | 'left'>()
	private peerNames = new Map<string, string>()
	private pendingJoinAnnouncement: string | null = null

	// ── Props accessors: User ──

	private get currentUser() { return this.componentProps.user.currentUser }
	private get setUsername() { return this.componentProps.user.setUsername }
	private get getDefaultUsername() { return this.componentProps.user.getDefaultUsername }
	private get getUserForRoom() { return this.componentProps.user.getUserForRoom }
	private get setRoomUsername() { return this.componentProps.user.setRoomUsername }

	// ── Props accessors: Direct state ──

	private get currentRoom() { return this.componentProps.currentRoom }
	private get setCurrentRoom() { return this.componentProps.setCurrentRoom }
	private get webrtcManager() { return this.componentProps.webrtcManager }
	private get setWebrtcManager() { return this.componentProps.setWebrtcManager }
	private get isSignalingConnected() { return this.componentProps.isSignalingConnected }
	private get setIsSignalingConnected() { return this.componentProps.setIsSignalingConnected }

	// ── Props accessors: Shared refs ──

	private get currentRoomRef() { return this.componentProps.currentRoomRef }
	private get currentUserRef() { return this.componentProps.currentUserRef }
	private get currentUserIdRef() { return this.componentProps.currentUserIdRef }
	private get roomKeyRef() { return this.componentProps.roomKeyRef }

	// ── Props accessors: Channel state ──

	private get channels() { return this.componentProps.channelState.channels }
	private get setChannels() { return this.componentProps.channelState.setChannels }
	private get currentChannel() { return this.componentProps.channelState.currentChannel }
	private get setCurrentChannel() { return this.componentProps.channelState.setCurrentChannel }
	private get messages() { return this.componentProps.channelState.messages }
	private get setMessages() { return this.componentProps.channelState.setMessages }
	private get channelsRef() { return this.componentProps.channelState.channelsRef }
	private get currentChannelRef() { return this.componentProps.channelState.currentChannelRef }
	private get createChannelAction() { return this.componentProps.channelState.createChannel }
	private get selectChannelAction() { return this.componentProps.channelState.selectChannel }
	private get handleChannelReceived() { return this.componentProps.channelState.handleChannelReceived }

	// ── Props accessors: Peer state ──

	private get peers() { return this.componentProps.peerState.peers }
	private get setPeers() { return this.componentProps.peerState.setPeers }
	private get remoteStreams() { return this.componentProps.peerState.remoteStreams }
	private get remoteScreenStreams() { return this.componentProps.peerState.remoteScreenStreams }
	private get remoteCameraStreams() { return this.componentProps.peerState.remoteCameraStreams }
	private get speakingUsers() { return this.componentProps.peerState.speakingUsers }
	private get handlePeerConnected() { return this.componentProps.peerState.handlePeerConnected }
	private get handlePeerDisconnected() { return this.componentProps.peerState.handlePeerDisconnected }
	private get handleRemoteStream() { return this.componentProps.peerState.handleRemoteStream }
	private get handleRemoteScreenStream() { return this.componentProps.peerState.handleRemoteScreenStream }
	private get handleRemoteCameraStream() { return this.componentProps.peerState.handleRemoteCameraStream }
	private get handleVoiceStateChanged() { return this.componentProps.peerState.handleVoiceStateChanged }
	private get handlePeerSpeaking() { return this.componentProps.peerState.handlePeerSpeaking }
	private get handlePeerUserInfo() { return this.componentProps.peerState.handlePeerUserInfo }
	private get handlePeerScreenShareStateChanged() { return this.componentProps.peerState.handlePeerScreenShareStateChanged }
	private get handlePeerCameraStateChanged() { return this.componentProps.peerState.handlePeerCameraStateChanged }

	// ── Props accessors: Voice ──

	private get voice() { return this.componentProps.voice }

	// ── Props accessors: File transfer ──

	private get fileTransfers() { return this.componentProps.fileTransfer.fileTransfers }
	private get handleFileTransferProgress() { return this.componentProps.fileTransfer.handleFileTransferProgress }
	private get handleFileReceived() { return this.componentProps.fileTransfer.handleFileReceived }
	private get sendFileAction() { return this.componentProps.fileTransfer.sendFile }

	// ── Props accessors: Sync ──

	private get handleSyncRequested() { return this.componentProps.sync.handleSyncRequested }
	private get handleDataChannelReady() { return this.componentProps.sync.handleDataChannelReady }
	private get handleSyncHello() { return this.componentProps.sync.handleSyncHello }
	private get handleSyncReceived() { return this.componentProps.sync.handleSyncReceived }
	private get handleRemoteMessage() { return this.componentProps.sync.handleRemoteMessage }
	private get handleHistoryRequested() { return this.componentProps.sync.handleHistoryRequested }
	private get handleHistoryReceived() { return this.componentProps.sync.handleHistoryReceived }
	private get requestOlderMessages() { return this.componentProps.sync.requestOlderMessages }

	// ── Computed properties ──

	private get voiceState()
	{
		return {
			activeVoiceChannel: this.voice.activeVoiceChannel,
			isScreenSharing: this.voice.isScreenSharing,
			isCameraOn: this.voice.isCameraOn,
		}
	}

	// ── Lifecycle ──

	componentDidMount()
	{
		this.checkAutoJoin()
		this.checkMissingKeyNotice()

		if ('serviceWorker' in navigator)
		{
			navigator.serviceWorker.addEventListener('message', this.handleSWMessage)
		}
		document.addEventListener('visibilitychange', this.handleVisibility)
	}

	componentDidUpdate(prevProps: P2PProviderProps)
	{
		// Keep room.channels in sync with channels state
		if (this.componentProps.channelState.channels !== prevProps.channelState.channels ||
			this.componentProps.currentRoom !== prevProps.currentRoom)
		{
			if (this.componentProps.currentRoom)
			{
				saveRoom({ ...this.componentProps.currentRoom, channels: this.componentProps.channelState.channels })
			}
		}

		// Missing key notice
		this.checkMissingKeyNotice()

		// Auto-join check
		if (this.componentProps.user.currentUser !== prevProps.user.currentUser ||
			this.componentProps.currentRoom !== prevProps.currentRoom)
		{
			this.checkAutoJoin()
		}
	}

	componentWillUnmount()
	{
		this.webrtcManager?.disconnect()
		this.voice.cleanupVoice()

		if ('serviceWorker' in navigator)
		{
			navigator.serviceWorker.removeEventListener('message', this.handleSWMessage)
		}
		document.removeEventListener('visibilitychange', this.handleVisibility)
	}

	// ── Effect logic ──

	private checkAutoJoin = () =>
	{
		if (!this.currentUser || this.currentRoom || this.autoJoinAttempted) return
		const lastRoomId = localStorage.getItem('p2p-last-room')
		if (lastRoomId)
		{
			this.autoJoinAttempted = true
			this.joinRoom(lastRoomId).catch(e => console.error('Failed to auto-join:', e))
		}
	}

	private checkMissingKeyNotice = () =>
	{
		if (!this.missingKeyNoticePending) return
		if (!this.currentRoom || !this.currentChannel || this.currentChannel.type !== 'text') return

		const id = `system-missing-key-${this.currentRoom.id}`
		const notice: Message = {
			id,
			channelId: this.currentChannel.id,
			userId: 'system',
			username: 'Security Notice',
			content: 'You joined without an encryption key. Messages may appear encrypted. Would you like to share it? Ask a room member to share the full invite link (includes #ek=...).',
			timestamp: Date.now(),
			synced: true,
		}

		this.missingKeyNoticePending = false

		void saveMessage(notice)
			.then(() =>
			{
				this.setMessages(prev =>
				{
					if (prev.some(m => m.id === notice.id)) return prev
					if (notice.channelId !== this.currentChannelRef.current?.id) return prev
					return [...prev, notice].slice(-MAX_IN_MEMORY_MESSAGES)
				})
			})
			.catch((error) =>
			{
				console.error('Failed to save missing-key notice:', error)
			})
	}

	private handleSWMessage = (event: MessageEvent) =>
	{
		if (event.data?.type === 'push-message-received' && event.data.message)
		{
			const msg = event.data.message as Message
			this.setMessages(prev =>
			{
				if (prev.some(m => m.id === msg.id)) return prev
				if (msg.channelId === this.currentChannelRef.current?.id)
				{
					return [...prev, msg].slice(-MAX_IN_MEMORY_MESSAGES)
				}
				return prev
			})
		}
		if (event.data?.type === 'background-poll-complete' && event.data.newMessages > 0)
		{
			const chanId = this.currentChannelRef.current?.id
			if (chanId)
			{
				getMessagesByChannel(chanId).then(msgs => this.setMessages(msgs.slice(-MAX_IN_MEMORY_MESSAGES)))
			}
		}
	}

	private handleVisibility = () =>
	{
		if (document.visibilityState === 'visible')
		{
			const chanId = this.currentChannelRef.current?.id
			if (chanId)
			{
				getMessagesByChannel(chanId).then(msgs => this.setMessages(msgs.slice(-MAX_IN_MEMORY_MESSAGES)))
			}

			if ('serviceWorker' in navigator)
			{
				if (navigator.serviceWorker.controller)
				{
					navigator.serviceWorker.controller.postMessage({ type: 'poll-now' })
				} else
				{
					navigator.serviceWorker.getRegistration().then((registration) =>
					{
						registration?.active?.postMessage({ type: 'poll-now' })
						registration?.waiting?.postMessage({ type: 'poll-now' })
					}).catch(() =>
					{
						// no-op: best effort
					})
				}
			}

			const mgr = this.webrtcManager
			if (mgr)
			{
				const peers = mgr.getPeers()
				for (const peer of peers)
				{
					if (peer.dataChannel?.readyState === 'open')
					{
						this.handleDataChannelReady(mgr, peer.id)
					}
				}
			}
		}
	}

	// ── Business methods ──

	private postSystemMessage = (content: string) =>
	{
		const room = this.currentRoomRef.current
		if (!room) return

		const targetChannel = this.currentChannelRef.current?.type === 'text'
			? this.currentChannelRef.current
			: this.channelsRef.current.find(channel => channel.type === 'text') ?? null
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
			.then(() =>
			{
				this.setMessages(prev =>
				{
					if (prev.some(message => message.id === notice.id)) return prev
					if (notice.channelId !== this.currentChannelRef.current?.id) return prev
					return [...prev, notice].slice(-MAX_IN_MEMORY_MESSAGES)
				})
			})
			.catch(error => console.error('Failed to save system message:', error))
	}

	private announcePresenceIntent = async (
		manager: WebRTCManager | null,
		action: 'join' | 'leave',
		username?: string
	): Promise<boolean> =>
	{
		const trimmed = username?.trim() || ''
		if (!manager || !trimmed) return false
		const sent = manager.broadcastPresenceEvent(action, trimmed)
		if (!sent) return false
		await new Promise(resolve => setTimeout(resolve, 100))
		return true
	}

	private applyReaction = (reaction: ReactionEvent) =>
	{
		this.setMessages(prev => prev.map(msg =>
		{
			if (msg.id !== reaction.messageId) return msg
			const reactions = { ...(msg.reactions ?? {}) }
			const list = [...(reactions[reaction.emoji] ?? [])]
			if (reaction.action === 'add')
			{
				if (!list.some(r => r.userId === reaction.userId))
				{
					list.push({ userId: reaction.userId, username: reaction.username })
				}
			} else
			{
				const idx = list.findIndex(r => r.userId === reaction.userId)
				if (idx !== -1) list.splice(idx, 1)
			}
			if (list.length > 0)
			{
				reactions[reaction.emoji] = list
			} else
			{
				delete reactions[reaction.emoji]
			}
			const updated = { ...msg, reactions: Object.keys(reactions).length > 0 ? reactions : undefined }
			void saveMessage(updated)
			return updated
		}))
	}

	private setupManager = (manager: WebRTCManager) =>
	{
		manager.setCallbacks({
			onMessageReceived: (msg) => this.handleRemoteMessage(msg),
			onPeerConnected: (peer) =>
			{
				this.handlePeerConnected(peer)
				const connectedUsername = peer.username?.trim() || ''
				if (connectedUsername) this.peerNames.set(peer.id, connectedUsername)
			},
			onPeerDisconnected: (peerId) =>
			{
				this.handlePeerDisconnected(peerId)
				this.peerNames.delete(peerId)
				this.peerPresenceState.delete(peerId)
			},
			onRemoteAudioStream: (peerId, stream) => this.handleRemoteStream(peerId, stream),
			onRemoteScreenStream: (peerId, stream) => this.handleRemoteScreenStream(peerId, stream),
			onRemoteCameraStream: (peerId, stream) => this.handleRemoteCameraStream(peerId, stream),
			onSignalingConnected: () =>
			{
				this.setIsSignalingConnected(true)
				this.registerPush(manager)
			},
			onSignalingDisconnected: () => this.setIsSignalingConnected(false),
			onFileTransferProgress: (id, progress) => this.handleFileTransferProgress(id, progress),
			onFileReceived: (id, blob, meta) => this.handleFileReceived(id, blob, meta, this.setMessages),
			onSyncRequested: (peerId) => this.handleSyncRequested(manager, peerId),
			onSyncReceived: (payload) => this.handleSyncReceived(payload),
			onChannelReceived: (channel) => this.handleChannelReceived(channel),
			onVoiceStateChanged: (peerId, channelId) => this.handleVoiceStateChanged(peerId, channelId),
			onPeerSpeaking: (peerId, speaking) => this.handlePeerSpeaking(peerId, speaking),
			onPeerUserInfo: (peerId, username) =>
			{
				this.handlePeerUserInfo(peerId, username)
				const trimmed = username.trim()
				if (trimmed)
				{
					this.peerNames.set(peerId, trimmed)
				}
			},
			onDataChannelReady: async (peerId) =>
			{
				await this.handleDataChannelReady(manager, peerId)
				if (!this.roomKeyRef.current && !this.requestedRoomKeyPeerIds.has(peerId))
				{
					const requested = manager.requestRoomKey(peerId)
					if (requested) this.requestedRoomKeyPeerIds.add(peerId)
				}

				const pendingJoinUsername = this.pendingJoinAnnouncement
				if (pendingJoinUsername)
				{
					const sent = await this.announcePresenceIntent(manager, 'join', pendingJoinUsername)
					if (sent) this.pendingJoinAnnouncement = null
				}

				const vs = this.voiceState
				if (vs.activeVoiceChannel)
				{
					manager.sendVoiceStateToPeer(
						peerId,
						vs.activeVoiceChannel,
						vs.isScreenSharing,
						vs.isScreenSharing ? vs.activeVoiceChannel : null,
						vs.isCameraOn,
					)
				}
			},
			onSyncHello: (peerId, hello) => this.handleSyncHello(manager, peerId, hello),
			onHistoryRequested: (peerId, request) => this.handleHistoryRequested(manager, peerId, request),
			onHistoryReceived: (_peerId, response) => { void this.handleHistoryReceived(response) },
			onRoomKeyRequested: (peerId, requesterUsername) =>
			{
				const room = this.currentRoomRef.current
				const key = this.roomKeyRef.current
				if (!room || !key) return
				const targetChannel = this.currentChannelRef.current?.type === 'text'
					? this.currentChannelRef.current
					: this.channelsRef.current.find(channel => channel.type === 'text') ?? null
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
					.then(() =>
					{
						this.setMessages(prev =>
						{
							if (prev.some(message => message.id === requestMessage.id)) return prev
							if (requestMessage.channelId !== this.currentChannelRef.current?.id) return prev
							return [...prev, requestMessage].slice(-MAX_IN_MEMORY_MESSAGES)
						})
					})
					.catch(error => console.error('Failed to save room-key request message:', error))
			},
			onRoomKeyShared: (peerId, roomKey, sharedByUsername) =>
			{
				const room = this.currentRoomRef.current
				if (!room) return
				this.roomKeyRef.current = roomKey
				this.requestedRoomKeyPeerIds.clear()

				void saveRoomKey(room.id, roomKey)
					.then(async () =>
					{
						const targetChannel = this.currentChannelRef.current?.type === 'text'
							? this.currentChannelRef.current
							: this.channelsRef.current.find(channel => channel.type === 'text') ?? null

						if (targetChannel)
						{
							const channelMessages = await getMessagesByChannel(targetChannel.id)
							const decryptedMessages = await Promise.all(channelMessages.map(async (message) =>
							{
								if (!message.content.includes(':')) return message
								const plaintext = await decryptText(message.content, roomKey)
								if (plaintext === null) return message
								const decoded = { ...message, content: plaintext }
								await saveMessage(decoded)
								return decoded
							}))
							this.setMessages(decryptedMessages.slice(-MAX_IN_MEMORY_MESSAGES))

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
							this.setMessages(prev =>
							{
								if (prev.some(message => message.id === notice.id)) return prev
								if (notice.channelId !== this.currentChannelRef.current?.id) return prev
								return [...prev, notice].slice(-MAX_IN_MEMORY_MESSAGES)
							})
						}

						await this.handleDataChannelReady(manager, peerId)
					})
					.catch(error => console.error('Failed to apply shared room key:', error))
			},
			onPresenceEvent: (peerId, event) =>
			{
				const username = event.username?.trim() || this.peerNames.get(peerId)?.trim() || ''
				if (!username) return

				this.peerNames.set(peerId, username)

				const lastState = this.peerPresenceState.get(peerId)
				if (event.action === 'join')
				{
					if (lastState === 'joined') return
					this.peerPresenceState.set(peerId, 'joined')
					this.postSystemMessage(`${username} joined the room.`)
					return
				}

				if (lastState === 'left') return
				this.peerPresenceState.set(peerId, 'left')
				this.postSystemMessage(`${username} left the room.`)
			},
			onScreenShareStateChanged: (peerId, voiceChannelId) =>
			{
				this.handlePeerScreenShareStateChanged(peerId, voiceChannelId)
				this.voice.handlePeerScreenShareStateChanged(peerId, voiceChannelId)
				if (voiceChannelId === null)
				{
					import('@/lib/voiceSounds').then(s => s.playStreamEndedSound())
				}
			},
			onScreenWatchRequested: (peerId, watch) =>
			{
				manager.setScreenShareSubscription(peerId, watch)
				if (this.voiceState.isScreenSharing)
				{
					if (watch)
					{
						import('@/lib/voiceSounds').then(s => s.playViewerJoinSound())
					} else
					{
						import('@/lib/voiceSounds').then(s => s.playViewerLeaveSound())
					}
				}
			},
			onCameraStateChanged: (peerId, cameraOn) =>
			{
				this.handlePeerCameraStateChanged(peerId, cameraOn)
			},
			onReactionReceived: (_peerId, reaction) =>
			{
				this.applyReaction(reaction)
			},
			onPushRenew: async () =>
			{
				console.log('[push] Server requested subscription renewal')
				import('@/lib/pushSubscription').then(async (m) =>
				{
					await m.unsubscribeFromPush()
					this.registerPush(manager)
				})
			},
			onSyncPoll: async (pollId, lastMessageId, _roomId) =>
			{
				try
				{
					const chans = this.channelsRef.current
					const key = this.roomKeyRef.current
					const textChannels = chans.filter(c => c.type === 'text')
					const perChannel = await Promise.all(textChannels.map(c => getMessagesByChannel(c.id)))
					let allMsgs = perChannel.flat().sort((a, b) => a.id.localeCompare(b.id))
					if (lastMessageId)
					{
						allMsgs = allMsgs.filter(m => m.id > lastMessageId)
					}
					allMsgs = allMsgs.slice(-200)
					let wireMsgs = allMsgs
					if (key)
					{
						const { encryptText: enc } = await import('@/lib/crypto')
						wireMsgs = await Promise.all(allMsgs.map(async m => ({
							...m,
							content: await enc(m.content, key),
						})))
					}
					manager.respondToSyncPoll(pollId, wireMsgs)
					console.log(`[sync-poll] Responded with ${wireMsgs.length} messages for poll ${pollId}`)
				} catch (err)
				{
					console.error('[sync-poll] Failed to respond:', err)
					manager.respondToSyncPoll(pollId, [])
				}
			},
		})
		this.setWebrtcManager(manager)
	}

	private registerPush = async (manager: WebRTCManager, existingSub?: PushSubscriptionJSON) =>
	{
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
		if (Notification.permission === 'denied') return

		try
		{
			const sub = existingSub ?? await subscribeToPush()
			if (sub) manager.registerPushSubscription(sub)
		} catch (e)
		{
			console.warn('[push] Could not register push subscription:', e)
		}
	}

	private registerPushForCurrentRoom = async (subscription?: PushSubscriptionJSON) =>
	{
		if (!this.webrtcManager) return
		await this.registerPush(this.webrtcManager, subscription)
	}

	private resolveRoomUser = (roomId: string, usernameOverride?: string): User | null =>
	{
		const preferredUsername = usernameOverride?.trim()
		if (preferredUsername) return this.setRoomUsername(roomId, preferredUsername)

		const roomUser = this.getUserForRoom(roomId)
		if (roomUser) return roomUser

		const defaultUsername = this.getDefaultUsername()?.trim()
		if (defaultUsername) return this.setRoomUsername(roomId, defaultUsername)

		return null
	}

	private createRoom = async (roomName: string, usernameOverride?: string, announceJoin = false): Promise<string> =>
	{
		const preferredUsername = usernameOverride?.trim() || this.getDefaultUsername()?.trim() || null
		if (!preferredUsername) throw new Error('No user set')

		const { room, channels: chs, defaultChannel, roomKey } = await createNewRoom(roomName)
		const activeUser = this.resolveRoomUser(room.id, preferredUsername)
		if (!activeUser) throw new Error('No user set')

		this.roomKeyRef.current = roomKey
		this.currentUserIdRef.current = activeUser.id
		this.setCurrentRoom(room)
		this.setChannels(chs)
		this.setCurrentChannel(defaultChannel)
		this.setMessages([])
		this.setPeers([])
		this.requestedRoomKeyPeerIds.clear()
		this.missingKeyNoticePending = false
		this.peerNames.clear()
		this.pendingJoinAnnouncement = null
		localStorage.setItem('p2p-last-room', room.id)

		try { this.webrtcManager?.disconnect() } catch (disconnectError) { console.debug('Disconnect before room creation failed:', disconnectError) }
		const mgr = new WebRTCManager(activeUser.id, activeUser.username, room.id)
		this.setupManager(mgr)
		this.registerPush(mgr)
		if (announceJoin)
		{
			this.pendingJoinAnnouncement = activeUser.username
			const sent = await this.announcePresenceIntent(mgr, 'join', activeUser.username)
			if (sent) this.pendingJoinAnnouncement = null
		}
		return room.id
	}

	private joinRoom = async (roomCode: string, encryptionKey?: string, usernameOverride?: string, announceJoin = false) =>
	{
		const activeUser = this.resolveRoomUser(roomCode, usernameOverride)
		if (!activeUser) throw new Error('No user set')

		const key = encryptionKey ?? extractKeyFromFragment() ?? await getRoomKey(roomCode)
		const joinedWithoutKey = !key

		try { this.webrtcManager?.disconnect() } catch (disconnectError) { console.debug('Disconnect before room join failed:', disconnectError) }
		const { room, channels: chs, channelToSelect, messages: msgs } = await loadRoomForJoin(roomCode)

		if (key)
		{
			await saveRoomKey(roomCode, key)
		}
		this.roomKeyRef.current = key
		this.requestedRoomKeyPeerIds.clear()
		this.missingKeyNoticePending = joinedWithoutKey
		this.peerNames.clear()
		this.pendingJoinAnnouncement = null

		this.currentUserIdRef.current = activeUser.id
		this.setCurrentRoom(room)
		this.setChannels(chs)
		this.setCurrentChannel(channelToSelect)
		this.setMessages(msgs.slice(-INITIAL_HISTORY_MESSAGES))
		localStorage.setItem('p2p-last-room', roomCode)

		const mgr = new WebRTCManager(activeUser.id, activeUser.username, roomCode)
		this.setupManager(mgr)
		this.registerPush(mgr)
		if (announceJoin)
		{
			this.pendingJoinAnnouncement = activeUser.username
			const sent = await this.announcePresenceIntent(mgr, 'join', activeUser.username)
			if (sent) this.pendingJoinAnnouncement = null
		}
	}

	private leaveRoom = async (autoSwitchToOtherRoom = true, announceLeave = false) =>
	{
		const leavingRoomId = this.currentRoomRef.current?.id
		const leavingUsername = this.currentUserRef.current?.username

		if (announceLeave)
		{
			await this.announcePresenceIntent(this.webrtcManager, 'leave', leavingUsername)
		}

		localStorage.removeItem('p2p-last-room')
		try { this.webrtcManager?.disconnect() } catch (e) { console.warn('Disconnect error (ignored):', e) }
		this.setWebrtcManager(null)
		this.setCurrentRoom(null)
		this.setChannels([])
		this.setCurrentChannel(null)
		this.setMessages([])
		this.setPeers([])
		this.voice.cleanupVoice()
		this.roomKeyRef.current = null
		this.requestedRoomKeyPeerIds.clear()
		this.peerPresenceState.clear()
		this.peerNames.clear()
		this.pendingJoinAnnouncement = null

		if (leavingRoomId)
		{
			await deleteRoomHistory(leavingRoomId)
			await deleteRoomKey(leavingRoomId)
		}

		if (autoSwitchToOtherRoom && leavingRoomId)
		{
			const allHistory = await getAllRoomHistory()
			if (allHistory.length > 0)
			{
				const sorted = allHistory.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
				try { await this.joinRoom(sorted[0].roomId) } catch (e) { console.error('Failed to auto-switch:', e) }
			}
		}
	}

	private sendMessage = async (content: string) =>
	{
		if (!this.currentUser || !this.currentChannel || this.currentChannel.type !== 'text') return
		const message: Message = {
			id: generateMessageId(), channelId: this.currentChannel.id,
			userId: this.currentUser.id, username: this.currentUser.username,
			content, timestamp: Date.now(), synced: false,
		}
		await saveMessage(message)
		this.setMessages(prev => [...prev, message].slice(-MAX_IN_MEMORY_MESSAGES))

		const key = this.roomKeyRef.current
		let wireMessage = message
		if (key)
		{
			const encrypted = await encryptText(content, key)
			wireMessage = { ...message, content: encrypted }
		}

		this.webrtcManager?.sendMessage(wireMessage)

		{
			const preview = message.fileMetadata ? `📎 ${message.fileMetadata.name}` : content
			const truncatedPreview = preview.length > 200 ? preview.slice(0, 197) + '…' : preview
			const encryptedPreview = key ? await encryptText(truncatedPreview, key) : truncatedPreview
			const pushMessage = { ...wireMessage }
			delete pushMessage.fileMetadata
			const pushPayload = JSON.stringify({
				title: this.currentUser.username,
				body: encryptedPreview,
				roomId: this.currentRoom?.id,
				encrypted: !!key,
				message: pushMessage,
			})
			getPushEndpoint().then(endpoint =>
			{
				this.webrtcManager?.pushToOfflinePeers(pushPayload, endpoint ?? undefined)
			})
		}
	}

	private toggleReaction = async (messageId: string, emoji: string) =>
	{
		if (!this.currentUser) return
		const msg = this.messages.find(m => m.id === messageId)
		if (!msg) return
		const existing = msg.reactions?.[emoji]?.find(r => r.userId === this.currentUser!.id)
		const action: 'add' | 'remove' = existing ? 'remove' : 'add'
		const reaction: ReactionEvent = {
			messageId, emoji,
			userId: this.currentUser.id,
			username: this.currentUser.username,
			action,
		}
		this.applyReaction(reaction)
		this.webrtcManager?.sendReaction(reaction)
	}

	private sendGifMessage = async (gifUrl: string, searchQuery: string) =>
	{
		if (!this.currentUser || !this.currentChannel || this.currentChannel.type !== 'text') return
		const message: Message = {
			id: generateMessageId(), channelId: this.currentChannel.id,
			userId: this.currentUser.id, username: this.currentUser.username,
			content: searchQuery, timestamp: Date.now(), synced: false,
			gifUrl,
		}
		await saveMessage(message)
		this.setMessages(prev => [...prev, message].slice(-MAX_IN_MEMORY_MESSAGES))

		const key = this.roomKeyRef.current
		let wireMessage = message
		if (key)
		{
			const encrypted = await encryptText(searchQuery, key)
			wireMessage = { ...message, content: encrypted }
		}

		this.webrtcManager?.sendMessage(wireMessage)

		{
			const preview = `🎬 GIF: ${searchQuery}`
			const encryptedPreview = key ? await encryptText(preview, key) : preview
			const pushPayload = JSON.stringify({
				title: this.currentUser.username,
				body: encryptedPreview,
				roomId: this.currentRoom?.id,
				encrypted: !!key,
				message: wireMessage,
			})
			getPushEndpoint().then(endpoint =>
			{
				this.webrtcManager?.pushToOfflinePeers(pushPayload, endpoint ?? undefined)
			})
		}
	}

	private authorizePeerAccess = async (messageId: string, peerId: string) =>
	{
		const roomKey = this.roomKeyRef.current
		if (!this.webrtcManager || !roomKey) return

		const shared = this.webrtcManager.shareRoomKey(peerId, roomKey)
		if (!shared) return

		const authorizedBy = this.currentUserRef.current?.username ?? 'A room member'
		const original = this.messages.find(message => message.id === messageId)
		if (!original) return

		const updated: Message = {
			...original,
			content: `${original.systemActionTargetUsername ?? 'This user'} was authorized by ${authorizedBy}.`,
			systemActionResolved: true,
			systemActionResolvedBy: authorizedBy,
			timestamp: Date.now(),
		}

		await saveMessage(updated)
		this.setMessages(prev => prev.map(message => message.id === messageId ? updated : message))
	}

	// ── Render ──

	render()
	{
		return (
			<P2PContext.Provider value={{
				currentUser: this.currentUser, currentRoom: this.currentRoom,
				channels: this.channels, currentChannel: this.currentChannel,
				messages: this.messages, peers: this.peers,
				activeVoiceChannel: this.voice.activeVoiceChannel,
				isMuted: this.voice.isMuted, isDeafened: this.voice.isDeafened,
				isScreenSharing: this.voice.isScreenSharing,
				isCameraOn: this.voice.isCameraOn,
				localScreenShareStream: this.voice.screenShareStream,
				localCameraStream: this.voice.localCameraStream,
				watchedScreenShares: this.voice.watchedScreenShares,
				localStream: this.voice.localStream,
				remoteStreams: this.remoteStreams,
				remoteScreenStreams: this.remoteScreenStreams,
				remoteCameraStreams: this.remoteCameraStreams,
				isSignalingConnected: this.isSignalingConnected,
				hasRoomKey: !!this.roomKeyRef.current,
				fileTransfers: this.fileTransfers,
				speakingUsers: this.speakingUsers,
				setUsername: this.setUsername,
				createRoom: this.createRoom,
				joinRoom: this.joinRoom,
				leaveRoom: this.leaveRoom,
				createChannel: (name, type) => this.createChannelAction(name, type, this.currentRoom?.id ?? null, this.webrtcManager),
				selectChannel: (id) => this.selectChannelAction(id, this.currentRoom?.id, this.currentRoom?.name),
				sendMessage: this.sendMessage,
				sendGifMessage: this.sendGifMessage,
				toggleReaction: this.toggleReaction,
				authorizePeerAccess: this.authorizePeerAccess,
				loadOlderMessages: async () =>
				{
					if (!this.webrtcManager || !this.currentChannel || this.currentChannel.type !== 'text') return 0
					const beforeMessageId = this.messages.length > 0 ? this.messages[0].id : null
					return this.requestOlderMessages(this.webrtcManager, this.currentChannel.id, beforeMessageId)
				},
				sendFile: (file) => this.sendFileAction(file, this.currentUser?.id ?? '', this.currentUser?.username ?? '', this.currentChannel?.id ?? '', this.currentChannel?.type ?? '', this.webrtcManager, this.setMessages),
				registerPushForCurrentRoom: this.registerPushForCurrentRoom,
				joinVoiceChannel: this.voice.joinVoiceChannel,
				leaveVoiceChannel: this.voice.leaveVoiceChannel,
				toggleMute: this.voice.toggleMute, toggleDeafen: this.voice.toggleDeafen,
				startScreenShare: this.voice.startScreenShare, stopScreenShare: this.voice.stopScreenShare,
				startCamera: this.voice.startCamera, stopCamera: this.voice.stopCamera,
				watchScreenShare: this.voice.watchScreenShare,
				stopWatchingScreenShare: this.voice.stopWatchingScreenShare,
			}}>
				{this.componentProps.children}
			</P2PContext.Provider>
		)
	}
}
