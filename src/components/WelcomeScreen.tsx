import React, { Component } from 'react'
import { P2PContext } from '@/lib/P2PContext'
import { UsernameForm } from '@/components/UsernameForm'
import { RoomForm } from '@/components/RoomForm'

interface WelcomeScreenProps {
  p2p: ReturnType<typeof useP2P>
}

class WelcomeScreenClass extends Component<WelcomeScreenProps> {
  private get p2p() { return this.componentProps.p2p }

  render() {
    const currentUser = this.p2p.currentUser
    const setUsername = this.p2p.setUsername
    const createRoom = this.p2p.createRoom
    const joinRoom = this.p2p.joinRoom

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
}

export class WelcomeScreen extends Component {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <WelcomeScreenClass p2p={this.context as ReturnType<typeof useP2P>} />
  }
}
