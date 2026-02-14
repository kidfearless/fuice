import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UsernameForm } from './UsernameForm'

vi.mock('@/lib/sw-register', () => ({
  clearCacheAndUpdate: vi.fn().mockResolvedValue(undefined),
}))

describe('UsernameForm', () => {
  it('renders username input and submit button', () => {
    render(<UsernameForm onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set username|continue/i })).toBeInTheDocument()
  })

  it('submit button is disabled when input is empty', () => {
    render(<UsernameForm onSubmit={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    const submitBtn = buttons.find(b => b.textContent?.match(/set username|continue/i))
    expect(submitBtn).toBeDisabled()
  })

  it('calls onSubmit with trimmed username', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UsernameForm onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText(/username/i), '  Bob  ')
    const buttons = screen.getAllByRole('button')
    const submitBtn = buttons.find(b => b.textContent?.match(/set username|continue/i))!
    await user.click(submitBtn)

    expect(onSubmit).toHaveBeenCalledWith('Bob')
  })

  it('submits on Enter key', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UsernameForm onSubmit={onSubmit} />)

    const input = screen.getByPlaceholderText(/username/i)
    await user.type(input, 'Carol{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('Carol')
  })
})
