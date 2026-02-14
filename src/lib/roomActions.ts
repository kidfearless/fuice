import { Channel, Room } from '@/lib/types'
import { saveRoom, getRoom, saveChannel, getMessagesByChannel, getRoomHistory, getAllRoomHistory, saveRoomHistory } from '@/lib/db'
import { generateChannelId } from '@/lib/helpers'
import { generateRoomKey, saveRoomKey } from '@/lib/crypto'

/** Save or update a room's history entry. */
export async function upsertRoomHistory(
  roomId: string,
  roomName: string,
  lastChannelId?: string
) {
  const existing = await getRoomHistory(roomId)
  let order = existing?.order ?? 0
  if (!existing) {
    const all = await getAllRoomHistory()
    order = Math.max(...all.map(h => h.order ?? 0), 0) + 1
  }
  await saveRoomHistory({
    roomId,
    roomName,
    lastAccessed: Date.now(),
    createdAt: existing?.createdAt ?? Date.now(),
    order,
    lastChannelId,
  })
}

/** Create a new room with default channels, persist, and return the result. */
export async function createNewRoom(roomName: string) {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  const defaultText: Channel = { id: generateChannelId(), name: 'general', type: 'text', createdAt: Date.now() }
  const defaultVoice: Channel = { id: generateChannelId(), name: 'Voice Chat', type: 'voice', createdAt: Date.now() }
  const room: Room = { id: roomCode, name: roomName, channels: [defaultText, defaultVoice], createdAt: Date.now() }

  // Generate E2E encryption key for this room
  const roomKey = await generateRoomKey()
  await saveRoomKey(roomCode, roomKey)

  await saveRoom(room)
  await saveChannel(defaultText)
  await saveChannel(defaultVoice)
  await upsertRoomHistory(roomCode, roomName, defaultText.id)

  return { room, channels: [defaultText, defaultVoice], defaultChannel: defaultText, roomKey }
}

/** Load or create a room for joining, returning its channels and best channel to select. */
export async function loadRoomForJoin(roomCode: string) {
  let room = await getRoom(roomCode)
  if (!room) {
    room = { id: roomCode, name: `Room ${roomCode}`, channels: [], createdAt: Date.now() }
    await saveRoom(room)
  }

  const channels = room.channels || []
  const history = await getRoomHistory(roomCode)
  let channelToSelect = channels[0] || null
  if (history?.lastChannelId) {
    const last = channels.find(c => c.id === history.lastChannelId)
    if (last) channelToSelect = last
  }

  const messages = channelToSelect?.type === 'text'
    ? await getMessagesByChannel(channelToSelect.id)
    : []

  await upsertRoomHistory(roomCode, room.name, channelToSelect?.id)

  return { room, channels, channelToSelect, messages }
}
