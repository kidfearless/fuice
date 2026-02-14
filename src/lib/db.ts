import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Message, Channel, Room, User, RoomHistory } from './types'

export interface StoredFile {
  id: string
  transferId: string
  name: string
  size: number
  type: string
  blob: Blob
  isPreview: boolean // true if only preview, false if full file
  storedAt: number
}

interface P2PChatDB extends DBSchema {
  messages: {
    key: string
    value: Message
    indexes: { 'by-channel': string; 'by-timestamp': number }
  }
  channels: {
    key: string
    value: Channel
  }
  rooms: {
    key: string
    value: Room
  }
  users: {
    key: string
    value: User
  }
  roomHistory: {
    key: string
    value: RoomHistory
    indexes: { 'by-last-accessed': number }
  }
  files: {
    key: string
    value: StoredFile
    indexes: { 'by-transfer-id': string; 'by-stored-at': number }
  }
  roomKeys: {
    key: string
    value: { roomId: string; key: string }
  }
}

let dbInstance: IDBPDatabase<P2PChatDB> | null = null

export async function getDB(): Promise<IDBPDatabase<P2PChatDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<P2PChatDB>('p2p-chat-db', 4, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' })
          messageStore.createIndex('by-channel', 'channelId')
          messageStore.createIndex('by-timestamp', 'timestamp')
        }

        if (!db.objectStoreNames.contains('channels')) {
          db.createObjectStore('channels', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('rooms')) {
          db.createObjectStore('rooms', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' })
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('roomHistory')) {
          const roomHistoryStore = db.createObjectStore('roomHistory', { keyPath: 'roomId' })
          roomHistoryStore.createIndex('by-last-accessed', 'lastAccessed')
        }
      }

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' })
          filesStore.createIndex('by-transfer-id', 'transferId')
          filesStore.createIndex('by-stored-at', 'storedAt')
        }
      }

      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('roomKeys')) {
          db.createObjectStore('roomKeys', { keyPath: 'roomId' })
        }
      }
    },
  })

  return dbInstance
}

export async function saveMessage(message: Message): Promise<void> {
  const db = await getDB()
  await db.put('messages', message)
}

export async function getMessagesByChannel(channelId: string): Promise<Message[]> {
  const db = await getDB()
  return db.getAllFromIndex('messages', 'by-channel', channelId)
}

export async function getAllMessages(): Promise<Message[]> {
  const db = await getDB()
  return db.getAll('messages')
}

export async function saveChannel(channel: Channel): Promise<void> {
  const db = await getDB()
  await db.put('channels', channel)
}

export async function getAllChannels(): Promise<Channel[]> {
  const db = await getDB()
  return db.getAll('channels')
}

export async function saveRoom(room: Room): Promise<void> {
  const db = await getDB()
  await db.put('rooms', room)
}

export async function getRoom(id: string): Promise<Room | undefined> {
  const db = await getDB()
  return db.get('rooms', id)
}

export async function saveUser(user: User): Promise<void> {
  const db = await getDB()
  await db.put('users', user)
}

export async function getUser(id: string): Promise<User | undefined> {
  const db = await getDB()
  return db.get('users', id)
}

export async function saveRoomHistory(roomHistory: RoomHistory): Promise<void> {
  const db = await getDB()
  await db.put('roomHistory', roomHistory)
}

export async function getAllRoomHistory(): Promise<RoomHistory[]> {
  const db = await getDB()
  const history = await db.getAll('roomHistory')
  // Sort by user-defined order
  return history.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function getRoomHistory(roomId: string): Promise<RoomHistory | undefined> {
  const db = await getDB()
  return db.get('roomHistory', roomId)
}

export async function deleteRoomHistory(roomId: string): Promise<void> {
  const db = await getDB()
  await db.delete('roomHistory', roomId)
}

export async function updateRoomOrder(rooms: RoomHistory[]): Promise<void> {
  const db = await getDB()
  for (const room of rooms) {
    await db.put('roomHistory', room)
  }
}

export async function saveFile(file: StoredFile): Promise<void> {
  const db = await getDB()
  await db.put('files', file)
}

export async function getFile(fileId: string): Promise<StoredFile | undefined> {
  const db = await getDB()
  return db.get('files', fileId)
}

export async function getFileByTransferId(transferId: string): Promise<StoredFile | undefined> {
  const db = await getDB()
  const files = await db.getAllFromIndex('files', 'by-transfer-id', transferId)
  return files[0]
}

export async function deleteFile(fileId: string): Promise<void> {
  const db = await getDB()
  await db.delete('files', fileId)
}

export async function getFileUrl(fileId: string): Promise<string | undefined> {
  try {
    const file = await getFile(fileId)
    if (file && file.blob) {
      return URL.createObjectURL(file.blob)
    }
  } catch (error) {
    console.error('Failed to get file URL:', error)
  }
  return undefined
}
