import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { SignalingNotice } from './SignalingNotice'

describe('SignalingNotice', () => {
  it('renders notice with setup instructions', () => {
    render(<SignalingNotice />)
    expect(screen.getByText('Signaling Server Required')).toBeInTheDocument()
  })

  it('dismiss button hides the notice', async () => {
    const user = userEvent.setup()
    const { container } = render(<SignalingNotice />)
    
    const dismissBtn = screen.getByText('Dismiss')
    await user.click(dismissBtn)
    
    // After dismissing, the component should return null / be empty
    expect(container.innerHTML).toBe('')
  })
})
