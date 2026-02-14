import { useState } from 'react'
import { User } from '@/lib/types'
import { generateUserId, getUserColor } from '@/lib/helpers'

const CURRENT_USER_KEY = 'p2p-current-user'
const DEFAULT_USERNAME_KEY = 'p2p-default-username'
const ROOM_USERS_KEY = 'p2p-room-users'

type RoomUsers = Record<string, User>

function loadRoomUsers(): RoomUsers {
  try {
    const stored = localStorage.getItem(ROOM_USERS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveRoomUsers(roomUsers: RoomUsers) {
  localStorage.setItem(ROOM_USERS_KEY, JSON.stringify(roomUsers))
}

export function useUser() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const persistCurrentUser = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  }

  const getDefaultUsername = (): string | null => {
    try {
      const stored = localStorage.getItem(DEFAULT_USERNAME_KEY)
      const trimmed = stored?.trim() ?? ''
      if (trimmed) return trimmed
      const fallback = currentUser?.username?.trim() ?? ''
      return fallback || null
    } catch {
      return currentUser?.username?.trim() || null
    }
  }

  const getUserForRoom = (roomId: string): User | null => {
    const roomUsers = loadRoomUsers()
    const user = roomUsers[roomId]
    if (!user?.id || !user?.username) return null
    return user
  }

  const setRoomUsername = (roomId: string, username: string): User => {
    const trimmed = username.trim()
    const roomUsers = loadRoomUsers()
    const existing = roomUsers[roomId]
    const user: User = {
      id: existing?.id ?? generateUserId(),
      username: trimmed,
      color: getUserColor(trimmed),
    }
    roomUsers[roomId] = user
    saveRoomUsers(roomUsers)
    persistCurrentUser(user)
    return user
  }

  const setUsername = (username: string) => {
    const trimmed = username.trim()
    if (!trimmed) return
    const user: User = {
      id: generateUserId(),
      username: trimmed,
      color: getUserColor(trimmed),
    }
    persistCurrentUser(user)
    localStorage.setItem(DEFAULT_USERNAME_KEY, trimmed)
  }

  return { currentUser, setUsername, getDefaultUsername, getUserForRoom, setRoomUsername }
}
