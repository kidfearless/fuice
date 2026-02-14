import { useState, useCallback } from 'react'
import { Peer } from '@/lib/types'

export function usePeers() {
  const [peers, setPeers] = useState<Peer[]>([])
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map())
  const [remoteCameraStreams, setRemoteCameraStreams] = useState<Map<string, MediaStream>>(new Map())
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())

  const handlePeerConnected = useCallback((peer: Peer) => {
    setPeers(prev => {
      const filtered = prev.filter(p => p.id !== peer.id)
      return [...filtered, peer]
    })
  }, [])

  const handlePeerDisconnected = useCallback((peerId: string) => {
    setPeers(prev => prev.filter(p => p.id !== peerId))
    setRemoteStreams(prev => {
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })
    setRemoteScreenStreams(prev => {
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })
    setRemoteCameraStreams(prev => {
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  const handleRemoteStream = useCallback((peerId: string, stream: MediaStream) => {
    setRemoteStreams(prev => {
      const next = new Map(prev)
      next.set(peerId, stream)
      return next
    })
  }, [])

  const handleRemoteScreenStream = useCallback((peerId: string, stream: MediaStream) => {
    setRemoteScreenStreams(prev => {
      const next = new Map(prev)
      next.set(peerId, stream)
      return next
    })
  }, [])

  const handleRemoteCameraStream = useCallback((peerId: string, stream: MediaStream) => {
    setRemoteCameraStreams(prev => {
      const next = new Map(prev)
      next.set(peerId, stream)
      return next
    })
  }, [])

  const handleVoiceStateChanged = useCallback((peerId: string, voiceChannelId: string | null) => {
    setPeers(prev => prev.map(peer =>
      peer.id === peerId
        ? { ...peer, voiceChannelId: voiceChannelId ?? undefined }
        : peer
    ))
  }, [])

  const handlePeerSpeaking = useCallback((peerId: string, speaking: boolean) => {
    setPeers(prev => prev.map(peer =>
      peer.id === peerId
        ? { ...peer, isSpeaking: speaking }
        : peer
    ))
    setSpeakingUsers(prev => {
      const next = new Set(prev)
      if (speaking) next.add(peerId)
      else next.delete(peerId)
      return next
    })
  }, [])

  const handlePeerUserInfo = useCallback((peerId: string, username: string) => {
    setPeers(prev => prev.map(peer =>
      peer.id === peerId ? { ...peer, username } : peer
    ))
  }, [])

  const handlePeerScreenShareStateChanged = useCallback((peerId: string, voiceChannelId: string | null) => {
    setPeers(prev => prev.map(peer =>
      peer.id === peerId
        ? {
          ...peer,
          isScreenSharing: voiceChannelId !== null,
          screenShareChannelId: voiceChannelId ?? undefined,
        }
        : peer
    ))

    if (voiceChannelId === null) {
      setRemoteScreenStreams(prev => {
        const next = new Map(prev)
        next.delete(peerId)
        return next
      })
    }
  }, [])

  const handlePeerCameraStateChanged = useCallback((peerId: string, cameraOn: boolean) => {
    setPeers(prev => prev.map(peer =>
      peer.id === peerId
        ? { ...peer, isCameraOn: cameraOn }
        : peer
    ))
    if (!cameraOn) {
      setRemoteCameraStreams(prev => {
        const next = new Map(prev)
        next.delete(peerId)
        return next
      })
    }
  }, [])

  return {
    peers,
    setPeers,
    remoteStreams,
    remoteScreenStreams,
    remoteCameraStreams,
    setRemoteStreams,
    setRemoteScreenStreams,
    setRemoteCameraStreams,
    speakingUsers,
    setSpeakingUsers,
    handlePeerConnected,
    handlePeerDisconnected,
    handleRemoteStream,
    handleRemoteScreenStream,
    handleRemoteCameraStream,
    handleVoiceStateChanged,
    handlePeerSpeaking,
    handlePeerUserInfo,
    handlePeerScreenShareStateChanged,
    handlePeerCameraStateChanged,
  }
}
