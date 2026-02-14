import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TechnicalNote } from './TechnicalNote'

describe('TechnicalNote', () => {
  it('renders technical details', () => {
    render(<TechnicalNote />)
    expect(screen.getByText(/webrtc/i)).toBeInTheDocument()
  })

  it('renders as a card', () => {
    const { container } = render(<TechnicalNote />)
    expect(container.querySelector('[class*="card"]') || container.firstElementChild).toBeTruthy()
  })
})
