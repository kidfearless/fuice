import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUser } from './useUser'

describe('useUser', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null currentUser initially', () => {
    const { result } = renderHook(() => useUser())
    expect(result.current.currentUser).toBeNull()
  })

  it('restores currentUser from localStorage', () => {
    const user = { id: 'u1', username: 'Alice', color: '#abc' }
    localStorage.setItem('p2p-current-user', JSON.stringify(user))
    const { result } = renderHook(() => useUser())
    expect(result.current.currentUser).toEqual(user)
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('p2p-current-user', 'bad json')
    const { result } = renderHook(() => useUser())
    expect(result.current.currentUser).toBeNull()
  })

  it('setUsername sets currentUser and persists', () => {
    const { result } = renderHook(() => useUser())
    act(() => { result.current.setUsername('  Bob  ') })
    expect(result.current.currentUser?.username).toBe('Bob')
    expect(localStorage.getItem('p2p-default-username')).toBe('Bob')
    expect(JSON.parse(localStorage.getItem('p2p-current-user')!).username).toBe('Bob')
  })

  it('setUsername ignores empty string', () => {
    const { result } = renderHook(() => useUser())
    act(() => { result.current.setUsername('   ') })
    expect(result.current.currentUser).toBeNull()
  })

  it('getDefaultUsername returns stored default name', () => {
    localStorage.setItem('p2p-default-username', 'Alice')
    const { result } = renderHook(() => useUser())
    expect(result.current.getDefaultUsername()).toBe('Alice')
  })

  it('getDefaultUsername falls back to currentUser username', () => {
    const user = { id: 'u1', username: 'Eve', color: '#abc' }
    localStorage.setItem('p2p-current-user', JSON.stringify(user))
    const { result } = renderHook(() => useUser())
    expect(result.current.getDefaultUsername()).toBe('Eve')
  })

  it('getDefaultUsername returns null when nothing set', () => {
    const { result } = renderHook(() => useUser())
    expect(result.current.getDefaultUsername()).toBeNull()
  })

  it('getDefaultUsername handles corrupt localStorage', () => {
    localStorage.setItem('p2p-default-username', '  ')
    const { result } = renderHook(() => useUser())
    expect(result.current.getDefaultUsername()).toBeNull()
  })

  it('getUserForRoom returns null for unknown room', () => {
    const { result } = renderHook(() => useUser())
    expect(result.current.getUserForRoom('room-x')).toBeNull()
  })

  it('setRoomUsername stores user for room and returns it', () => {
    const { result } = renderHook(() => useUser())
    let user: ReturnType<typeof result.current.setRoomUsername>
    act(() => { user = result.current.setRoomUsername('room-1', 'Alice') })
    expect(user!.username).toBe('Alice')
    expect(user!.id).toBeDefined()

    // Can retrieve it now
    expect(result.current.getUserForRoom('room-1')?.username).toBe('Alice')
  })

  it('setRoomUsername preserves existing user id for same room', () => {
    const { result } = renderHook(() => useUser())
    let first: ReturnType<typeof result.current.setRoomUsername>
    act(() => { first = result.current.setRoomUsername('room-1', 'Alice') })
    let second: ReturnType<typeof result.current.setRoomUsername>
    act(() => { second = result.current.setRoomUsername('room-1', 'Alice2') })
    expect(second!.id).toBe(first!.id)
    expect(second!.username).toBe('Alice2')
  })

  it('getUserForRoom returns null when user data is incomplete', () => {
    localStorage.setItem('p2p-room-users', JSON.stringify({ 'room-1': { id: 'u1' } }))
    const { result } = renderHook(() => useUser())
    expect(result.current.getUserForRoom('room-1')).toBeNull()
  })

  it('handles corrupt room users localStorage', () => {
    localStorage.setItem('p2p-room-users', 'bad')
    const { result } = renderHook(() => useUser())
    expect(result.current.getUserForRoom('r1')).toBeNull()
  })
})
