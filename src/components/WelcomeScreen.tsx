import { useP2P } from '@/lib/P2PContext'
import { UsernameForm } from '@/components/UsernameForm'
import { RoomForm } from '@/components/RoomForm'

export function WelcomeScreen() {
  const { currentUser, setUsername, createRoom, joinRoom } = useP2P()

  if (!currentUser) {
    return <UsernameForm onSubmit={setUsername} />
  }

  return (
    <RoomForm
      username={currentUser.username}
      onCreateRoom={async (name) => { await createRoom(name) }}
      onJoinRoom={joinRoom}
    />
  )
}
