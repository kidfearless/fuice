import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HelpPanel } from './HelpPanel'

describe('HelpPanel', () => {
  it('renders information cards', () => {
    render(<HelpPanel />)
    expect(screen.getByText(/text channels/i)).toBeInTheDocument()
  })

  it('mentions GIF commands', () => {
    render(<HelpPanel />)
    expect(screen.getAllByText(/\/gif/i).length).toBeGreaterThan(0)
  })

  it('mentions voice channels', () => {
    render(<HelpPanel />)
    expect(screen.getAllByText(/voice/i).length).toBeGreaterThan(0)
  })

  it('mentions privacy', () => {
    render(<HelpPanel />)
    expect(screen.getAllByText(/peer-to-peer|privacy|encrypted/i).length).toBeGreaterThan(0)
  })
})
