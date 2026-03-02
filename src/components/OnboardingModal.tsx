import React, { Component } from 'react'
import { P2PContext } from '@/lib/P2PContext'
import type { P2PContextType } from '@/lib/P2PContextTypes'
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
  p2p: P2PContextType
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

interface OnboardingModalState {
  step: number
  isSubmitting: boolean
  roomAction: RoomAction | null
  roomTab: 'create' | 'join'
  roomName: string
  roomCode: string
  username: string
  notifSettings: ReturnType<typeof loadNotificationSettings>
}

class OnboardingModalBase extends Component<OnboardingModalProps, OnboardingModalState> {
  constructor(props: OnboardingModalProps) {
    super(props)
    this.state = {
      step: 0,
      isSubmitting: false,
      roomAction: props.initialJoinCode ? { type: 'join', code: props.initialJoinCode, encryptionKey: props.encryptionKey } : null,
      roomTab: props.initialJoinCode ? 'join' : 'join',
      roomName: '',
      roomCode: props.initialJoinCode ?? '',
      username: props.p2p.currentUser?.username ?? '',
      notifSettings: getOnboardingNotificationDefaults(loadNotificationSettings()),
    }
  }

  private get p2p() { return this.componentProps.p2p }
  private get open() { return this.componentProps.open }
  private get onClose() { return this.componentProps.onClose }
  private get hasUser() { return this.componentProps.hasUser }
  private get initialJoinCode() { return this.componentProps.initialJoinCode }
  private get encryptionKey() { return this.componentProps.encryptionKey }
  private get step() { return this.state.step }
  private set step(step: number) { this.setState({ step }) }
  private get isSubmitting() { return this.state.isSubmitting }
  private set isSubmitting(isSubmitting: boolean) { this.setState({ isSubmitting }) }
  private get roomAction() { return this.state.roomAction }
  private set roomAction(roomAction: RoomAction | null) { this.setState({ roomAction }) }
  private get roomTab() { return this.state.roomTab }
  private set roomTab(roomTab: 'create' | 'join') { this.setState({ roomTab }) }
  private get roomName() { return this.state.roomName }
  private set roomName(roomName: string) { this.setState({ roomName }) }
  private get roomCode() { return this.state.roomCode }
  private set roomCode(roomCode: string) { this.setState({ roomCode }) }
  private get username() { return this.state.username }
  private set username(username: string) { this.setState({ username }) }
  private get notifSettings() { return this.state.notifSettings }
  private set notifSettings(notifSettings: ReturnType<typeof loadNotificationSettings>) { this.setState({ notifSettings }) }

  componentDidUpdate(prevProps: OnboardingModalProps) {
    if (this.open && !prevProps.open) {
      this.step = 0
      this.isSubmitting = false
      this.notifSettings = getOnboardingNotificationDefaults(loadNotificationSettings())
      this.roomTab = 'join'
      this.roomName = ''
      this.roomCode = this.initialJoinCode ?? ''
      this.roomAction = this.initialJoinCode ? { type: 'join', code: this.initialJoinCode, encryptionKey: this.encryptionKey } : null
      this.username = this.p2p.currentUser?.username ?? ''
    }
  }

  private handleRoomNext = () => {
    const roomTab = this.roomTab
    const roomName = this.roomName
    const roomCode = this.roomCode
    const encryptionKey = this.encryptionKey
    if (roomTab === 'create') {
      if (!roomName.trim()) return
      this.roomAction = { type: 'create', name: roomName.trim() }
      this.step = this.step + 1
    } else {
      if (!roomCode.trim()) return
      this.roomAction = { type: 'join', code: roomCode.trim().toUpperCase(), encryptionKey }
      this.notifSettings = getOnboardingNotificationDefaults(this.notifSettings)
      this.step = this.step + 1
    }
  }

  private handleUsernameNext = () => {
    if (!this.username.trim()) return
    this.step = this.step + 1
  }

  private handleSoundToggle = (checked: boolean) => {
    const next = { ...this.notifSettings, soundEnabled: checked }
    this.notifSettings = next
    saveNotificationSettings(next)
    if (checked) playNotificationSound(next.volume)
  }

  private handleVolumeChange = (value: number[]) => {
    const next = { ...this.notifSettings, volume: value[0] }
    this.notifSettings = next
    saveNotificationSettings(next)
  }

  private handleDesktopToggle = async (checked: boolean) => {
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
    const next = { ...this.notifSettings, desktopEnabled: checked }
    this.notifSettings = next
    saveNotificationSettings(next)
  }

  private handleFinish = async () => {
    const roomAction = this.roomAction
    const username = this.username
    const notifSettings = this.notifSettings
    const createRoom = this.p2p.createRoom
    const joinRoom = this.p2p.joinRoom
    const onClose = this.onClose
    if (!roomAction) return
    const trimmedUsername = username.trim()
    if (!trimmedUsername) return

    this.isSubmitting = true
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
      this.isSubmitting = false
    }
  }

  private handleBack = () => {
    if (this.step > 0) this.step = this.step - 1
  }

  private renderRoomStep = (canProceed: boolean) => (
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

      <Tabs value={this.roomTab} onValueChange={(v) => { this.roomTab = v as 'create' | 'join' }} className="w-full">
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
              value={this.roomName}
              onChange={(e) => { this.roomName = e.target.value }}
              onKeyDown={(e) => e.key === 'Enter' && canProceed && this.handleRoomNext()}
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
              value={this.roomCode}
              onChange={(e) => { this.roomCode = e.target.value.toUpperCase() }}
              onKeyDown={(e) => e.key === 'Enter' && canProceed && this.handleRoomNext()}
              className="uppercase font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the 6-character code from your friend.
          </p>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-2">
        <Button onClick={this.handleRoomNext} disabled={!canProceed}>
          Next
          <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Button>
      </div>
    </>
  )

  private renderUsernameStep = (canProceed: boolean) => (
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
            value={this.username}
            onChange={(e) => { this.username = e.target.value }}
            onKeyDown={(e) => e.key === 'Enter' && canProceed && this.handleUsernameNext()}
            autoFocus
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={this.handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back
        </Button>
        <Button onClick={this.handleUsernameNext} disabled={!canProceed}>
          Next
          <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </Button>
      </div>
    </>
  )

  private renderPrivacyStep = () => {
    const notifSettings = this.notifSettings
    const isSubmitting = this.isSubmitting
    return (
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
            <Switch checked={notifSettings.soundEnabled} onCheckedChange={this.handleSoundToggle} />
          </div>

          {notifSettings.soundEnabled && (
            <div className="space-y-2 pl-1">
              <Label className="text-xs text-muted-foreground">Volume</Label>
              <Slider
                value={[notifSettings.volume]}
                onValueChange={this.handleVolumeChange}
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
            <Switch checked={notifSettings.desktopEnabled} onCheckedChange={this.handleDesktopToggle} />
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
          <Button variant="ghost" onClick={this.handleBack}>
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back
          </Button>
          <Button onClick={this.handleFinish} disabled={isSubmitting}>
            {isSubmitting ? 'Setting up...' : 'Get Started'}
          </Button>
        </div>
      </>
    )
  }

  render() {
    const open = this.open
    const onClose = this.onClose
    const hasUser = this.hasUser
    const initialJoinCode = this.initialJoinCode
    const step = this.step
    const roomTab = this.roomTab
    const roomName = this.roomName
    const roomCode = this.roomCode
    const username = this.username

    const hasPrefilledJoin = !!initialJoinCode
    const skipRoom = hasPrefilledJoin
    const skipUsername = hasUser
    const steps: ('room' | 'username' | 'privacy')[] = []
    if (!skipRoom) steps.push('room')
    if (!skipUsername) steps.push('username')
    steps.push('privacy')
    const totalSteps = steps.length

    const currentStepType = steps[step] ?? 'privacy'
    const canProceedRoom = roomTab === 'create' ? roomName.trim().length > 0 : roomCode.trim().length > 0
    const canProceedUsername = username.trim().length > 0

    const renderStep = () => {
      switch (currentStepType) {
        case 'room': return this.renderRoomStep(canProceedRoom)
        case 'username': return this.renderUsernameStep(canProceedUsername)
        case 'privacy': return this.renderPrivacyStep()
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
}

export class OnboardingModal extends Component<Omit<OnboardingModalProps, 'p2p'>> {
  static contextType = P2PContext
  private get propsWithoutContext() { return this.componentProps }

  render() {
    if (!this.context) return null
    return <OnboardingModalBase {...this.propsWithoutContext} p2p={this.context as P2PContextType} />
  }
}
