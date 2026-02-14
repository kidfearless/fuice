import { useLayoutEffect, useState } from 'react'
import { useP2P } from '@/lib/P2PContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faBell, faShieldHalved, faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import {
  loadNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  playNotificationSound,
} from '@/lib/notifications'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/pushSubscription'
import { toast } from 'sonner'

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
  /** If true, skip the username step (user already has one) */
  hasUser: boolean
  /** Pre-filled join code from a share URL — skips the room selection step */
  initialJoinCode?: string
  /** Encryption key extracted from the share URL fragment */
  encryptionKey?: string
}

type RoomAction = { type: 'create'; name: string } | { type: 'join'; code: string; encryptionKey?: string }

function getOnboardingNotificationDefaults(settings: ReturnType<typeof loadNotificationSettings>) {
  return {
    ...settings,
    soundEnabled: true,
    desktopEnabled: false,
  }
}

export function OnboardingModal({ open, onClose, hasUser, initialJoinCode, encryptionKey }: OnboardingModalProps) {
  const { currentUser, createRoom, joinRoom } = useP2P()

  const hasPrefilledJoin = !!initialJoinCode
  // If we have a pre-filled join code, skip the room step entirely
  // Steps: 0 = join/create (skipped if pre-filled), 1 = username (skipped if hasUser), 2 = privacy
  const skipRoom = hasPrefilledJoin
  const skipUsername = hasUser
  const steps: ('room' | 'username' | 'privacy')[] = []
  if (!skipRoom) steps.push('room')
  if (!skipUsername) steps.push('username')
  steps.push('privacy')
  const totalSteps = steps.length
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step — Room action
  const [roomAction, setRoomAction] = useState<RoomAction | null>(
    initialJoinCode ? { type: 'join', code: initialJoinCode, encryptionKey } : null
  )
  const [roomTab, setRoomTab] = useState<'create' | 'join'>('join')
  const [roomName, setRoomName] = useState('')
  const [roomCode, setRoomCode] = useState(initialJoinCode ?? '')

  // Step 1 — Username
  const [username, setUsernameValue] = useState(currentUser?.username ?? '')

  // Step 2 — Privacy / Notifications
  const [notifSettings, setNotifSettings] = useState(() =>
    getOnboardingNotificationDefaults(loadNotificationSettings())
  )

  const currentStepType = steps[step] ?? 'privacy'

  useLayoutEffect(() => {
    if (!open) return

    setStep(0)
    setIsSubmitting(false)
    setNotifSettings(prev => getOnboardingNotificationDefaults(prev))

    if (initialJoinCode) {
      const normalizedCode = initialJoinCode.toUpperCase()
      setRoomTab('join')
      setRoomCode(normalizedCode)
      setRoomName('')
      setRoomAction({ type: 'join', code: normalizedCode, encryptionKey })
      setUsernameValue(currentUser?.username ?? '')
      return
    }

    setRoomTab('join')
    setRoomName('')
    setRoomCode('')
    setRoomAction(null)
    setUsernameValue(currentUser?.username ?? '')
  }, [open, initialJoinCode, encryptionKey, currentUser?.username])

  // ── Handlers ──────────────────────────────────────────────────────

  const handleRoomNext = () => {
    if (roomTab === 'create') {
      if (!roomName.trim()) return
      setRoomAction({ type: 'create', name: roomName.trim() })
    } else {
      if (!roomCode.trim()) return
      setRoomAction({ type: 'join', code: roomCode.trim().toUpperCase(), encryptionKey })
      setNotifSettings(prev => getOnboardingNotificationDefaults(prev))
    }
    setStep(step + 1)
  }

  const handleUsernameNext = () => {
    if (!username.trim()) return
    setStep(step + 1)
  }

  const handleSoundToggle = (checked: boolean) => {
    const next = { ...notifSettings, soundEnabled: checked }
    setNotifSettings(next)
    saveNotificationSettings(next)
    if (checked) playNotificationSound(next.volume)
  }

  const handleVolumeChange = (value: number[]) => {
    const next = { ...notifSettings, volume: value[0] }
    setNotifSettings(next)
    saveNotificationSettings(next)
  }

  const handleDesktopToggle = async (checked: boolean) => {
    if (checked) {
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') {
        toast.error('Notification permission was denied by your browser.')
        return
      }
      const sub = await subscribeToPush()
      if (sub) {
        toast.success('Push notifications enabled.')
      }
    } else {
      await unsubscribeFromPush()
    }
    const next = { ...notifSettings, desktopEnabled: checked }
    setNotifSettings(next)
    saveNotificationSettings(next)
  }

  const handleFinish = async () => {
    if (!roomAction) return
    const trimmedUsername = username.trim()
    if (!trimmedUsername) return

    setIsSubmitting(true)
    try {
      saveNotificationSettings(notifSettings)

      if (roomAction.type === 'create') {
        await createRoom(roomAction.name, trimmedUsername, true)
      } else {
        await joinRoom(roomAction.code, roomAction.encryptionKey, trimmedUsername, true)
      }

      onClose()
    } catch (e) {
      console.error('Onboarding failed:', e)
      toast.error('Failed to ' + (roomAction.type === 'create' ? 'create' : 'join') + ' room. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const canProceedRoom = roomTab === 'create' ? roomName.trim().length > 0 : roomCode.trim().length > 0
  const canProceedUsername = username.trim().length > 0
  // ── Step content renderers ────────────────────────────────────────

  const renderRoomStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faUsers} className="text-accent" />
          Join or Create a Server
        </DialogTitle>
        <DialogDescription>
          Create a new room or join an existing one with a code.
        </DialogDescription>
      </DialogHeader>

      <Tabs value={roomTab} onValueChange={(v) => setRoomTab(v as 'create' | 'join')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Room</TabsTrigger>
          <TabsTrigger value="join">Join Room</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="onboard-room-name">Room Name</Label>
            <Input
              id="onboard-room-name"
              placeholder="My Awesome Room"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canProceedRoom && handleRoomNext()}
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You'll receive a code to share with others.
          </p>
        </TabsContent>

        <TabsContent value="join" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="onboard-room-code">Room Code</Label>
            <Input
              id="onboard-room-code"
              placeholder="ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && canProceedRoom && handleRoomNext()}
              className="uppercase font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the 6-character code from your friend.
          </p>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-2">
        <Button onClick={handleRoomNext} disabled={!canProceedRoom}>
          Next
          <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Button>
      </div>
    </>
  )

  const renderUsernameStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faUsers} className="text-accent" />
          Choose Your Username
        </DialogTitle>
        <DialogDescription>
          This is how other people in the room will see you.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="onboard-username">Username</Label>
          <Input
            id="onboard-username"
            placeholder="Enter username..."
            value={username}
            onChange={(e) => setUsernameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canProceedUsername && handleUsernameNext()}
            autoFocus
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back
        </Button>
        <Button onClick={handleUsernameNext} disabled={!canProceedUsername}>
          Next
          <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Button>
      </div>
    </>
  )

  const renderPrivacyStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faShieldHalved} className="text-accent" />
          Privacy & Notifications
        </DialogTitle>
        <DialogDescription>
          Choose what you'd like to receive. You can change these later in Settings.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* Sound notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Message sounds</Label>
            <p className="text-xs text-muted-foreground">Play a sound when you receive a message</p>
          </div>
          <Switch checked={notifSettings.soundEnabled} onCheckedChange={handleSoundToggle} />
        </div>

        {notifSettings.soundEnabled && (
          <div className="space-y-2 pl-1">
            <Label className="text-xs text-muted-foreground">Volume</Label>
            <Slider
              value={[notifSettings.volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>
        )}

        {/* Desktop / Push notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <FontAwesomeIcon icon={faBell} className="text-muted-foreground text-xs" />
              Desktop & push notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Get notified even when the app is closed or in the background
            </p>
          </div>
          <Switch checked={notifSettings.desktopEnabled} onCheckedChange={handleDesktopToggle} />
        </div>

        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <FontAwesomeIcon icon={faShieldHalved} className="mr-1.5" />
            Your messages are always peer-to-peer. The server only relays encrypted push payloads
            and never reads or stores your messages.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back
        </Button>
        <Button onClick={handleFinish} disabled={isSubmitting}>
          {isSubmitting ? 'Setting up...' : 'Get Started'}
        </Button>
      </div>
    </>
  )

  // ── Render ────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStepType) {
      case 'room': return renderRoomStep()
      case 'username': return renderUsernameStep()
      case 'privacy': return renderPrivacyStep()
      default: return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        {/* Progress indicator */}
        <div className="flex gap-1.5 mb-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {renderStep()}
      </DialogContent>
    </Dialog>
  )
}
