import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PeerList } from './PeerList'
import type { Peer } from '@/lib/types'

function makePeer(id: string, overrides: Partial<Peer> = {}): Peer {
  return { id, username: `User-${id}`, connected: true, ...overrides }
}

describe('PeerList', () => {
  it('shows empty state when no peers', () => {
    render(<PeerList peers={[]} />)
    expect(screen.getByText(/no peers connected/i)).toBeInTheDocument()
  })

  it('renders peer names', () => {
    render(<PeerList peers={[makePeer('p1', { username: 'Alice' }), makePeer('p2', { username: 'Bob' })]} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows connected indicator for connected peers', () => {
    const { container } = render(<PeerList peers={[makePeer('p1', { connected: true })]} />)
    const dot = container.querySelector('.bg-success')
    expect(dot).toBeInTheDocument()
  })

  it('shows disconnected indicator for disconnected peers', () => {
    const { container } = render(<PeerList peers={[makePeer('p1', { connected: false })]} />)
    const dot = container.querySelector('.bg-muted')
    expect(dot).toBeInTheDocument()
  })
})

