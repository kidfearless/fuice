import { useState, useCallback, useRef, MutableRefObject } from 'react'
import { User } from '@/lib/types'
import { WebRTCManager } from '@/lib/webrtc'
import { loadSettings } from '@/lib/settings'
import {
  playJoinSound, playLeaveSound,
  playMuteSound, playUnmuteSound,
  playDeafenSound, playUndeafenSound,
  playStreamEndedSound,
} from '@/lib/voiceSounds'

interface UseVoiceOptions {
  currentUserRef: MutableRefObject<User | null>
  webrtcManager: WebRTCManager | null
  setSpeakingUsers: React.Dispatch<React.SetStateAction<Set<string>>>
}

export function useVoice({ currentUserRef, webrtcManager, setSpeakingUsers }: UseVoiceOptions) {
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null)
  const [watchedScreenShares, setWatchedScreenShares] = useState<Set<string>>(new Set())
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null)
  const audioAnalyser = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const activityFrameRef = useRef<number | null>(null)
  const lastSpeakingChangeRef = useRef(0)
  const localSpeakingRef = useRef(false)
  const isMutedRef = useRef(isMuted)
  isMutedRef.current = isMuted

  const setupVoiceActivityDetection = useCallback((stream: MediaStream) => {
    if (activityFrameRef.current !== null) {
      cancelAnimationFrame(activityFrameRef.current)
      activityFrameRef.current = null
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close() } catch (error) { console.debug('Failed to close audio context:', error) }
    }
    const audioContext = new AudioContext()
    audioContextRef.current = audioContext
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)
    audioAnalyser.current = analyser

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    let speaking = false
    let smoothedAverage = 0
    let lastDetectedSpeechAt = 0
    const START_SPEAKING_THRESHOLD = 10
    const STOP_SPEAKING_THRESHOLD = 24
    const SPEAKING_RELEASE_MS = 150
    const MIN_SPEAKING_TOGGLE_MS = 120

    const updateSpeakingState = (nextSpeaking: boolean) => {
      speaking = nextSpeaking
      localSpeakingRef.current = nextSpeaking
      lastSpeakingChangeRef.current = performance.now()
      webrtcManager?.broadcastSpeakingState(nextSpeaking)
      setSpeakingUsers(prev => {
        const next = new Set(prev)
        const userId = currentUserRef.current?.id
        if (userId) {
          if (nextSpeaking) next.add(userId)
          else next.delete(userId)
        }
        return next
      })
    }

    const checkAudioLevel = () => {
      if (!audioAnalyser.current) return
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
      smoothedAverage = (smoothedAverage * 0.8) + (average * 0.2)

      const now = performance.now()
      const canStartSpeaking = smoothedAverage >= START_SPEAKING_THRESHOLD
      if (canStartSpeaking) {
        lastDetectedSpeechAt = now
      }
      const withinReleaseWindow = now - lastDetectedSpeechAt <= SPEAKING_RELEASE_MS
      const isSpeaking = !isMutedRef.current && (
        speaking
          ? smoothedAverage >= STOP_SPEAKING_THRESHOLD || withinReleaseWindow
          : canStartSpeaking
      )

      if (isSpeaking !== speaking) {
        if (now - lastSpeakingChangeRef.current >= MIN_SPEAKING_TOGGLE_MS) {
          updateSpeakingState(isSpeaking)
        }
      }
      activityFrameRef.current = requestAnimationFrame(checkAudioLevel)
    }
    checkAudioLevel()
  }, [webrtcManager, setSpeakingUsers, currentUserRef])

  const joinVoiceChannel = useCallback(async (channelId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setLocalStream(stream)
      setActiveVoiceChannel(channelId)
      if (webrtcManager) {
        await webrtcManager.addAudioStream(stream)
        webrtcManager.broadcastVoiceState(channelId)
        setupVoiceActivityDetection(stream)
      }
      playJoinSound()
    } catch (error) {
      console.error('Failed to get audio stream:', error)
    }
  }, [webrtcManager, setupVoiceActivityDetection])

  const stopScreenShare = useCallback(() => {
    const wasSharing = !!screenShareStream
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop())
      setScreenShareStream(null)
    }
    webrtcManager?.setLocalScreenShareStream(null)
    webrtcManager?.broadcastScreenShareState(null)
    setIsScreenSharing(false)
    if (wasSharing) playStreamEndedSound()
  }, [screenShareStream, webrtcManager])

  const startCamera = useCallback(async () => {
    if (!activeVoiceChannel || !webrtcManager) return
    try {
      const { streaming } = loadSettings()
      const videoConstraints: MediaTrackConstraints = {
        frameRate: { ideal: streaming.cameraFrameRate },
      }
      if (streaming.cameraResolution > 0) {
        videoConstraints.height = { ideal: streaming.cameraResolution }
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false })
      const [videoTrack] = stream.getVideoTracks()
      if (!videoTrack) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      setLocalCameraStream(stream)
      webrtcManager.broadcastCameraState(true)
      // Small delay so peers receive camera-state before the track arrives
      await new Promise(r => setTimeout(r, 100))
      webrtcManager.addCameraStream(stream)
      setIsCameraOn(true)
      videoTrack.onended = () => stopCamera()
    } catch (error) {
      console.error('Failed to start camera:', error)
    }
  }, [activeVoiceChannel, webrtcManager])

  const stopCamera = useCallback(() => {
    if (localCameraStream) {
      localCameraStream.getTracks().forEach(track => track.stop())
      setLocalCameraStream(null)
    }
    webrtcManager?.removeCameraStream()
    webrtcManager?.broadcastCameraState(false)
    setIsCameraOn(false)
  }, [localCameraStream, webrtcManager])

  const startScreenShare = useCallback(async () => {
    if (!activeVoiceChannel || !webrtcManager) return
    try {
      const { streaming } = loadSettings()
      const videoConstraints: MediaTrackConstraints = {
        frameRate: { ideal: streaming.screenShareFrameRate },
      }
      if (streaming.screenShareResolution > 0) {
        videoConstraints.height = { ideal: streaming.screenShareResolution }
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: videoConstraints, audio: false })
      const [videoTrack] = stream.getVideoTracks()
      if (!videoTrack) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      setScreenShareStream(stream)
      webrtcManager.setLocalScreenShareStream(stream)
      webrtcManager.broadcastScreenShareState(activeVoiceChannel)
      setIsScreenSharing(true)

      videoTrack.onended = () => {
        stopScreenShare()
      }
    } catch (error) {
      console.error('Failed to start screen share:', error)
    }
  }, [activeVoiceChannel, webrtcManager, stopScreenShare])

  const watchScreenShare = useCallback((peerId: string) => {
    const sent = webrtcManager?.sendScreenWatchRequest(peerId, true)
    if (sent) {
      setWatchedScreenShares(prev => {
        const next = new Set(prev)
        next.add(peerId)
        return next
      })
    }
  }, [webrtcManager])

  const stopWatchingScreenShare = useCallback((peerId: string) => {
    webrtcManager?.sendScreenWatchRequest(peerId, false)
    setWatchedScreenShares(prev => {
      const next = new Set(prev)
      next.delete(peerId)
      return next
    })
  }, [webrtcManager])

  const handlePeerScreenShareStateChanged = useCallback((peerId: string, voiceChannelId: string | null) => {
    if (voiceChannelId !== null) return
    setWatchedScreenShares(prev => {
      if (!prev.has(peerId)) return prev
      const next = new Set(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  const leaveVoiceChannel = useCallback(() => {
    stopScreenShare()
    stopCamera()
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
      if (webrtcManager) {
        webrtcManager.removeAudioStream(localStream)
        webrtcManager.broadcastVoiceState(null)
      }
      if (audioAnalyser.current) {
        audioAnalyser.current = null
      }
      if (activityFrameRef.current !== null) {
        cancelAnimationFrame(activityFrameRef.current)
        activityFrameRef.current = null
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close() } catch (error) { console.debug('Failed to close audio context:', error) }
        audioContextRef.current = null
      }
    }
    localSpeakingRef.current = false
    setActiveVoiceChannel(null)
    setSpeakingUsers(prev => {
      const next = new Set(prev)
      const userId = currentUserRef.current?.id
      if (userId) next.delete(userId)
      return next
    })
    playLeaveSound()
  }, [localStream, webrtcManager, setSpeakingUsers, currentUserRef, stopScreenShare, stopCamera])

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      const nextMuted = !isMuted
      setIsMuted(nextMuted)
      if (nextMuted) playMuteSound(); else playUnmuteSound()

      if (nextMuted && localSpeakingRef.current) {
        localSpeakingRef.current = false
        webrtcManager?.broadcastSpeakingState(false)
        setSpeakingUsers(prev => {
          const next = new Set(prev)
          const userId = currentUserRef.current?.id
          if (userId) next.delete(userId)
          return next
        })
      }
    }
  }, [localStream, isMuted, webrtcManager, setSpeakingUsers, currentUserRef])

  const toggleDeafen = useCallback(() => {
    setIsDeafened(prev => {
      if (prev) playUndeafenSound(); else playDeafenSound()
      return !prev
    })
  }, [])

  const cleanupVoice = useCallback(() => {
    stopScreenShare()
    stopCamera()
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    if (audioAnalyser.current) {
      audioAnalyser.current = null
    }
    if (activityFrameRef.current !== null) {
      cancelAnimationFrame(activityFrameRef.current)
      activityFrameRef.current = null
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close() } catch (error) { console.debug('Failed to close audio context:', error) }
      audioContextRef.current = null
    }
    localSpeakingRef.current = false
    setActiveVoiceChannel(null)
    setSpeakingUsers(new Set())
    setWatchedScreenShares(new Set())
  }, [localStream, setSpeakingUsers, stopScreenShare, stopCamera])

  return {
    activeVoiceChannel,
    setActiveVoiceChannel,
    isMuted,
    isDeafened,
    isScreenSharing,
    isCameraOn,
    watchedScreenShares,
    screenShareStream,
    localCameraStream,
    localStream,
    setLocalStream,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    startCamera,
    stopCamera,
    watchScreenShare,
    stopWatchingScreenShare,
    handlePeerScreenShareStateChanged,
    cleanupVoice,
  }
}
