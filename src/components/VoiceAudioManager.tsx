import React, { Component } from 'react'
import { P2PContext } from '@/lib/P2PContext'

interface VoiceAudioManagerProps {
  p2p: ReturnType<typeof useP2P>
}

class VoiceAudioManagerClass extends Component<VoiceAudioManagerProps> {
  private audioRefs = new Map<string, HTMLAudioElement>()
  private get p2p() { return this.componentProps.p2p }

  componentDidMount() {
    this.updateAudio()
  }

  componentDidUpdate() {
    this.updateAudio()
  }

  componentWillUnmount() {
    this.cleanupAudio()
  }

  updateAudio = () => {
    const activeVoiceChannel = this.p2p.activeVoiceChannel
    const remoteStreams = this.p2p.remoteStreams
    const isDeafened = this.p2p.isDeafened

    if (!activeVoiceChannel) {
      this.cleanupAudio()
      return
    }

    // Add/update audio elements for current streams
    remoteStreams.forEach((stream, peerId) => {
      let audio = this.audioRefs.get(peerId)
      if (!audio) {
        audio = new Audio()
        audio.autoplay = true
        this.audioRefs.set(peerId, audio)
      }
      
      audio.muted = isDeafened

      if (audio.srcObject !== stream) {
        audio.srcObject = stream
        audio.play().catch(err =>
          console.warn('Audio play failed for peer:', peerId, err)
        )
      }
    })

    // Remove audio elements for disconnected peers
    this.audioRefs.forEach((audio, peerId) => {
      if (!remoteStreams.has(peerId)) {
        audio.pause()
        audio.srcObject = null
        this.audioRefs.delete(peerId)
      }
    })
  }

  cleanupAudio = () => {
    this.audioRefs.forEach(audio => {
      audio.pause()
      audio.srcObject = null
    })
    this.audioRefs.clear()
  }

  render() {
    return null
  }
}

export class VoiceAudioManager extends Component {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <VoiceAudioManagerClass p2p={this.context as ReturnType<typeof useP2P>} />
  }
}
