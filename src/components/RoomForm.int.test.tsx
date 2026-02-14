import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RoomForm } from './RoomForm'

describe('RoomForm integration', () => {
  it('submits trimmed room name in create flow', async () => {
    const user = userEvent.setup()
    const onCreateRoom = vi.fn().mockResolvedValue(undefined)
    const onJoinRoom = vi.fn().mockResolvedValue(undefined)

    render(
      <RoomForm
        username="alice"
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
      />, 
    )

    const roomNameInput = screen.getByLabelText(/room name/i)
    await user.type(roomNameInput, '  Team Sync  ')
    await user.click(screen.getByRole('button', { name: /create room/i }))

    expect(onCreateRoom).toHaveBeenCalledTimes(1)
    expect(onCreateRoom).toHaveBeenCalledWith('Team Sync')
  })

  it('submits uppercase code in join flow', async () => {
    const user = userEvent.setup()
    const onCreateRoom = vi.fn().mockResolvedValue(undefined)
    const onJoinRoom = vi.fn().mockResolvedValue(undefined)

    render(
      <RoomForm
        username="alice"
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /join room/i }))
    const roomCodeInput = screen.getByLabelText(/room code/i)
    await user.type(roomCodeInput, 'ab c123')
    await user.click(screen.getByRole('button', { name: /^join room$/i }))

    expect(onJoinRoom).toHaveBeenCalledTimes(1)
    expect(onJoinRoom).toHaveBeenCalledWith('AB C123')
  })
})
