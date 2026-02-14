import { useEffect, useRef, useState } from 'react'
import { useP2P } from '@/lib/P2PContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMicrophone,
  faMicrophoneSlash,
  faVolumeHigh,
  faVolumeXmark,
  faPhoneSlash,
  faDesktop,
  faVideo,
  faVideoSlash,
  faExpand,
  faCompress,
  faSignal,
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

export function VoiceChannel() {
  const {
    currentChannel,
    currentUser,
    activeVoiceChannel,
    joinVoiceChannel,
    leaveVoiceChannel,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    startCamera,
    stopCamera,
    isScreenSharing,
    isCameraOn,
    localScreenShareStream,
    localCameraStream,
    watchedScreenShares,
    watchScreenShare,
    peers,
    remoteScreenStreams,
    remoteCameraStreams,
    speakingUsers,
  } = useP2P()

  const [focusedStream, setFocusedStream] = useState<{ peerId: string; type: 'screen' | 'camera'; stream: MediaStream } | null>(null)

  if (!currentChannel || currentChannel.type !== 'voice') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338]">
        <div className="text-center space-y-2">
          <FontAwesomeIcon icon={faSignal} className="text-[40px] text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Select a voice channel to get started</p>
        </div>
      </div>
    )
  }

  const isInChannel = activeVoiceChannel === currentChannel.id

  // Users in this voice channel
  const channelPeers = peers.filter(
    p => p.connected && p.voiceChannelId === currentChannel.id
  )
  const activeScreenSharers = peers.filter(
    p => p.connected && p.isScreenSharing && p.screenShareChannelId === currentChannel.id
  )

  // Auto-watch screen shares when they start (Discord-like behavior)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isInChannel) return
    activeScreenSharers.forEach(peer => {
      if (!watchedScreenShares.has(peer.id)) {
        watchScreenShare(peer.id)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreenSharers.length, isInChannel])

  if (!isInChannel) {
    // Not connected - show join prompt (Discord-style)
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#313338]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#2b2d31] flex items-center justify-center mx-auto">
            <FontAwesomeIcon icon={faMicrophone} className="text-[32px] text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{currentChannel.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {channelPeers.length > 0
                ? `${channelPeers.length} user${channelPeers.length !== 1 ? 's' : ''} connected`
                : 'No one is currently in this channel'}
            </p>
          </div>
          <button
            onClick={() => joinVoiceChannel(currentChannel.id)}
            className="px-6 py-2.5 bg-[#248046] hover:bg-[#1a6334] text-white rounded-md font-medium text-sm transition-colors"
          >
            Join Voice
          </button>
        </div>
      </div>
    )
  }

  // Check if there's a focused/fullscreen stream
  if (focusedStream) {
    return (
      <div className="flex-1 flex flex-col bg-[#1e1f22] relative">
        {/* Focused stream view */}
        <div className="flex-1 relative flex items-center justify-center p-2">
          <VideoTile
            stream={focusedStream.stream}
            muted={focusedStream.type === 'screen'}
            className="w-full h-full max-h-full object-contain"
          />
          <button
            onClick={() => setFocusedStream(null)}
            className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-md text-white transition-colors"
          >
            <FontAwesomeIcon icon={faCompress} />
          </button>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 rounded-md text-white text-sm">
            {focusedStream.peerId === currentUser?.id ? 'You' :
              peers.find(p => p.id === focusedStream.peerId)?.username || 'Unknown'} — {focusedStream.type === 'screen' ? 'Screen' : 'Camera'}
          </div>
        </div>
        {/* Control bar */}
        <VoiceControlBar
          isMuted={isMuted}
          isDeafened={isDeafened}
          isScreenSharing={isScreenSharing}
          isCameraOn={isCameraOn}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onToggleScreen={isScreenSharing ? stopScreenShare : startScreenShare}
          onToggleCamera={isCameraOn ? stopCamera : startCamera}
          onDisconnect={leaveVoiceChannel}
        />
      </div>
    )
  }

  // Check if anyone is screen sharing — show split view
  const hasScreenShares = activeScreenSharers.some(p =>
    watchedScreenShares.has(p.id) && remoteScreenStreams.has(p.id)
  ) || (isScreenSharing && localScreenShareStream)

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-h-0">
      {hasScreenShares ? (
        // Screen share focused layout (like Discord)
        <div className="flex-1 flex flex-col min-h-0">
          {/* Main screen share area */}
          <div className="flex-1 min-h-0 p-2">
            <div className="h-full grid gap-2" style={{
              gridTemplateColumns: getScreenShareGridCols(
                activeScreenSharers.filter(p => watchedScreenShares.has(p.id) && remoteScreenStreams.has(p.id)).length +
                (isScreenSharing && localScreenShareStream ? 1 : 0)
              )
            }}>
              {activeScreenSharers
                .filter(p => watchedScreenShares.has(p.id))
                .map(peer => {
                  const stream = remoteScreenStreams.get(peer.id)
                  if (!stream) return null
                  return (
                    <div key={peer.id} className="relative rounded-lg overflow-hidden bg-[#1e1f22] min-h-0">
                      <VideoTile stream={stream} className="w-full h-full object-contain" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <span className="px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
                          {peer.username || 'Anonymous'}'s screen
                        </span>
                      </div>
                      <button
                        onClick={() => setFocusedStream({ peerId: peer.id, type: 'screen', stream })}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded text-white text-xs transition-colors"
                      >
                        <FontAwesomeIcon icon={faExpand} />
                      </button>
                    </div>
                  )
                })}

              {isScreenSharing && localScreenShareStream && (
                <div className="relative rounded-lg overflow-hidden bg-[#1e1f22] min-h-0">
                  <VideoTile stream={localScreenShareStream} muted className="w-full h-full object-contain" />
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
                      Your screen
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User tiles strip at bottom */}
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
            {/* Current user tile */}
            <UserVoiceTile
              username={currentUser?.username || 'You'}
              isSpeaking={speakingUsers.has(currentUser?.id || '')}
              isMuted={isMuted}
              isDeafened={isDeafened}
              isSelf
              cameraStream={localCameraStream}
              onFocusCamera={localCameraStream ? () => setFocusedStream({ peerId: currentUser?.id || '', type: 'camera', stream: localCameraStream }) : undefined}
            />
            {channelPeers.map(peer => (
              <UserVoiceTile
                key={peer.id}
                username={peer.username || 'Anonymous'}
                isSpeaking={peer.isSpeaking ?? false}
                isMuted={false}
                isDeafened={false}
                cameraStream={remoteCameraStreams.get(peer.id)}
                onFocusCamera={remoteCameraStreams.has(peer.id) ? () => setFocusedStream({ peerId: peer.id, type: 'camera', stream: remoteCameraStreams.get(peer.id)! }) : undefined}
              />
            ))}
          </div>
        </div>
      ) : (
        // No screen shares — grid of user tiles (like Discord)
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <div className="grid gap-2 w-full max-w-4xl" style={{
            gridTemplateColumns: getUserGridCols(channelPeers.length + 1),
          }}>
            {/* Current user */}
            <UserVoiceTile
              username={currentUser?.username || 'You'}
              isSpeaking={speakingUsers.has(currentUser?.id || '')}
              isMuted={isMuted}
              isDeafened={isDeafened}
              isSelf
              cameraStream={localCameraStream}
              large
              onFocusCamera={localCameraStream ? () => setFocusedStream({ peerId: currentUser?.id || '', type: 'camera', stream: localCameraStream }) : undefined}
            />
            {/* Peers in channel */}
            {channelPeers.map(peer => (
              <UserVoiceTile
                key={peer.id}
                username={peer.username || 'Anonymous'}
                isSpeaking={peer.isSpeaking ?? false}
                isMuted={false}
                isDeafened={false}
                isScreenSharing={peer.isScreenSharing}
                cameraStream={remoteCameraStreams.get(peer.id)}
                large
                onFocusCamera={remoteCameraStreams.has(peer.id) ? () => setFocusedStream({ peerId: peer.id, type: 'camera', stream: remoteCameraStreams.get(peer.id)! }) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Voice control bar */}
      <VoiceControlBar
        isMuted={isMuted}
        isDeafened={isDeafened}
        isScreenSharing={isScreenSharing}
        isCameraOn={isCameraOn}
        onToggleMute={toggleMute}
        onToggleDeafen={toggleDeafen}
        onToggleScreen={isScreenSharing ? stopScreenShare : startScreenShare}
        onToggleCamera={isCameraOn ? stopCamera : startCamera}
        onDisconnect={leaveVoiceChannel}
      />
    </div>
  )
}

// ── Discord-style Voice Control Bar ──────────────────────────────────

interface VoiceControlBarProps {
  isMuted: boolean
  isDeafened: boolean
  isScreenSharing: boolean
  isCameraOn: boolean
  onToggleMute: () => void
  onToggleDeafen: () => void
  onToggleScreen: () => void
  onToggleCamera: () => void
  onDisconnect: () => void
}

function VoiceControlBar({
  isMuted, isDeafened, isScreenSharing, isCameraOn,
  onToggleMute, onToggleDeafen, onToggleScreen, onToggleCamera, onDisconnect,
}: VoiceControlBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1e1f22]">
      <ControlButton
        icon={isMuted ? faMicrophoneSlash : faMicrophone}
        active={!isMuted}
        danger={isMuted}
        label={isMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMute}
        crossed={isMuted}
      />
      <ControlButton
        icon={isDeafened ? faVolumeXmark : faVolumeHigh}
        active={!isDeafened}
        danger={isDeafened}
        label={isDeafened ? 'Undeafen' : 'Deafen'}
        onClick={onToggleDeafen}
        crossed={isDeafened}
      />
      <ControlButton
        icon={isCameraOn ? faVideo : faVideoSlash}
        active={isCameraOn}
        label={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        onClick={onToggleCamera}
      />
      <ControlButton
        icon={faDesktop}
        active={isScreenSharing}
        label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        onClick={onToggleScreen}
      />
      <div className="w-px h-8 bg-[#3f4147] mx-1" />
      <button
        onClick={onDisconnect}
        className="w-12 h-12 rounded-full bg-[#ed4245] hover:bg-[#d83c3e] flex items-center justify-center text-white transition-colors"
        title="Disconnect"
      >
        <FontAwesomeIcon icon={faPhoneSlash} className="text-[18px]" />
      </button>
    </div>
  )
}

function ControlButton({
  icon, active, danger, label, onClick, crossed,
}: {
  icon: typeof faMicrophone
  active?: boolean
  danger?: boolean
  label: string
  onClick: () => void
  crossed?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-12 h-12 rounded-full flex items-center justify-center transition-colors',
        danger
          ? 'bg-[#ed4245]/20 text-[#ed4245] hover:bg-[#ed4245]/30'
          : active
            ? 'bg-[#3f4147] text-white hover:bg-[#4e5058]'
            : 'bg-[#3f4147] text-[#b5bac1] hover:bg-[#4e5058] hover:text-white'
      )}
      title={label}
    >
      <FontAwesomeIcon icon={icon} className="text-[18px]" />
      {crossed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[2px] h-7 bg-[#ed4245] rotate-45 rounded-full" />
        </div>
      )}
    </button>
  )
}

// ── User Voice Tile (Discord-style) ──────────────────────────────────

interface UserVoiceTileProps {
  username: string
  isSpeaking: boolean
  isMuted: boolean
  isDeafened: boolean
  isSelf?: boolean
  isScreenSharing?: boolean
  cameraStream?: MediaStream | null
  large?: boolean
  onFocusCamera?: () => void
}

function UserVoiceTile({
  username, isSpeaking, isMuted, isDeafened, isSelf, isScreenSharing,
  cameraStream, large, onFocusCamera,
}: UserVoiceTileProps) {
  const initials = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  // Generate a consistent color from username
  const hue = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div
      className={cn(
        'relative rounded-xl bg-[#2b2d31] flex flex-col items-center justify-center overflow-hidden transition-all',
        large ? 'min-h-[140px] p-4' : 'min-h-[80px] min-w-[100px] p-2',
        isSpeaking && 'ring-2 ring-[#23a55a] shadow-[0_0_8px_rgba(35,165,90,0.3)]',
      )}
    >
      {cameraStream ? (
        // Show camera feed
        <div className="absolute inset-0">
          <VideoTile stream={cameraStream} className="w-full h-full object-cover" mirror={isSelf} />
          {onFocusCamera && (
            <button
              onClick={onFocusCamera}
              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded text-white text-[10px] transition-colors opacity-0 hover:opacity-100"
            >
              <FontAwesomeIcon icon={faExpand} />
            </button>
          )}
        </div>
      ) : (
        // Show avatar
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white',
            large ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
          )}
          style={{ backgroundColor: `hsl(${hue}, 50%, 45%)` }}
        >
          {initials}
        </div>
      )}

      {/* Username */}
      <div className={cn(
        'mt-2 text-center truncate w-full px-1 relative z-10',
        cameraStream ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 mt-0' : '',
        large ? 'text-sm' : 'text-xs'
      )}>
        <span className={cn(
          'font-medium',
          cameraStream ? 'text-white' : 'text-[#b5bac1]'
        )}>
          {username}
          {isSelf && <span className="text-[#b5bac1] text-[10px] ml-1">(you)</span>}
        </span>
      </div>

      {/* Status icons */}
      <div className="absolute top-1 left-1 flex gap-0.5">
        {isMuted && (
          <div className="w-5 h-5 rounded-full bg-[#1e1f22] flex items-center justify-center">
            <FontAwesomeIcon icon={faMicrophoneSlash} className="text-[10px] text-[#ed4245]" />
          </div>
        )}
        {isDeafened && (
          <div className="w-5 h-5 rounded-full bg-[#1e1f22] flex items-center justify-center">
            <FontAwesomeIcon icon={faVolumeXmark} className="text-[10px] text-[#ed4245]" />
          </div>
        )}
        {isScreenSharing && (
          <div className="w-5 h-5 rounded-full bg-[#1e1f22] flex items-center justify-center">
            <FontAwesomeIcon icon={faDesktop} className="text-[10px] text-[#5865f2]" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Video tile component ─────────────────────────────────────────────

function VideoTile({ stream, muted = false, className, mirror }: {
  stream: MediaStream
  muted?: boolean
  className?: string
  mirror?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
      video.play().catch(err => console.warn('Video playback failed:', err))
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      className={cn('bg-[#1e1f22]', mirror && 'scale-x-[-1]', className)}
      autoPlay
      playsInline
      muted={muted}
    />
  )
}

// ── Grid layout helpers ──────────────────────────────────────────────

function getUserGridCols(count: number): string {
  if (count <= 1) return 'repeat(1, 1fr)'
  if (count <= 2) return 'repeat(2, 1fr)'
  if (count <= 4) return 'repeat(2, 1fr)'
  if (count <= 9) return 'repeat(3, 1fr)'
  return 'repeat(4, 1fr)'
}

function getScreenShareGridCols(count: number): string {
  if (count <= 1) return '1fr'
  return 'repeat(2, 1fr)'
}
