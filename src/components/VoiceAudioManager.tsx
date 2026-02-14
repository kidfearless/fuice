import { useP2P } from '@/lib/P2PContext'
import { useEffect, useRef } from 'react'

/**
 * Invisible component that manages audio playback for voice channels.
 * Stays mounted as long as the user is in a room, so audio persists
 * even when navigating away from the voice channel view.
 */
export function VoiceAudioManager() {
  const { activeVoiceChannel, remoteStreams, isDeafened } = useP2P()
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Attach remote streams to Audio elements and play
  useEffect(() => {
    if (!activeVoiceChannel) {
      // Not in a voice channel — tear down any lingering audio
      audioRefs.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      audioRefs.current.clear()
      return
    }

    // Add/update audio elements for current streams
    remoteStreams.forEach((stream, peerId) => {
      let audio = audioRefs.current.get(peerId)
      if (!audio) {
        audio = new Audio()
        audio.autoplay = true
        audioRefs.current.set(peerId, audio)
      }
      if (audio.srcObject !== stream) {
        audio.srcObject = stream
        audio.play().catch(err =>
          console.warn('Audio play failed for peer:', peerId, err)
        )
      }
    })

    // Remove audio elements for disconnected peers
    audioRefs.current.forEach((audio, peerId) => {
      if (!remoteStreams.has(peerId)) {
        audio.pause()
        audio.srcObject = null
        audioRefs.current.delete(peerId)
      }
    })
  }, [activeVoiceChannel, remoteStreams])

  // Handle deafen state without recreating audio elements
  useEffect(() => {
    audioRefs.current.forEach(audio => {
      audio.muted = isDeafened
    })
  }, [isDeafened])

  // Cleanup on unmount (user leaves the room entirely)
  useEffect(() => {
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      audioRefs.current.clear()
    }
  }, [])

  // This component renders nothing — it only manages audio
  return null
}
