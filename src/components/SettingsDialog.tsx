import React, { Component } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import { P2PContext } from '@/lib/P2PContext'
import { loadSettings, resetSettings, updateSettings, type StreamingSettings } from '@/lib/settings'
import {
  loadNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  getNotificationPermission,
  playNotificationSound,
  showDesktopNotification,
  NotificationSettings,
} from '@/lib/notifications'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/pushSubscription'
import { toast } from 'sonner'

const FONT_SIZES = [
  { label: 'Small', value: 0.9375 },
  { label: 'Default', value: 1 },
  { label: 'Large', value: 1.0625 },
]

const FRAME_RATE_OPTIONS = [
  { label: '5 fps', value: 5 },
  { label: '10 fps', value: 10 },
  { label: '15 fps', value: 15 },
  { label: '24 fps', value: 24 },
  { label: '30 fps', value: 30 },
  { label: '60 fps', value: 60 },
]

const SCREEN_RESOLUTION_OPTIONS = [
  { label: '480p', value: 480 },
  { label: '720p', value: 720 },
  { label: '1080p', value: 1080 },
  { label: 'Native', value: 0 },
]

const CAMERA_RESOLUTION_OPTIONS = [
  { label: '360p', value: 360 },
  { label: '480p', value: 480 },
  { label: '720p', value: 720 },
  { label: '1080p', value: 1080 },
]

interface SettingsDialogState {
  open: boolean
  displayName: string
  settings: ReturnType<typeof loadSettings>
  notifSettings: NotificationSettings
  notifPermission: NotificationPermission
  streamingSettings: StreamingSettings
}

class SettingsDialogClass extends Component<{ p2p: ReturnType<typeof useP2P> }, SettingsDialogState> {
  constructor(props: { p2p: ReturnType<typeof useP2P> }) {
    super(props)
    const initialSettings = loadSettings()
    this.state = {
      open: false,
      displayName: props.p2p.currentUser?.username ?? '',
      settings: initialSettings,
      notifSettings: loadNotificationSettings(),
      notifPermission: getNotificationPermission(),
      streamingSettings: initialSettings.streaming,
    }
  }

  private get p2p() { return this.componentProps.p2p }
  private get open() { return this.state.open }
  private set open(open: boolean) { this.setState({ open }) }
  private get displayName() { return this.state.displayName }
  private set displayName(displayName: string) { this.setState({ displayName }) }
  private get settings() { return this.state.settings }
  private set settings(settings: ReturnType<typeof loadSettings>) { this.setState({ settings }) }
  private get notifSettings() { return this.state.notifSettings }
  private set notifSettings(notifSettings: NotificationSettings) { this.setState({ notifSettings }) }
  private get notifPermission() { return this.state.notifPermission }
  private set notifPermission(notifPermission: NotificationPermission) { this.setState({ notifPermission }) }
  private get streamingSettings() { return this.state.streamingSettings }
  private set streamingSettings(streamingSettings: StreamingSettings) { this.setState({ streamingSettings }) }

  componentDidUpdate(prevProps: { p2p: ReturnType<typeof useP2P> }) {
    if (prevProps.p2p.currentUser !== this.p2p.currentUser) {
      this.displayName = this.p2p.currentUser?.username ?? ''
    }
  }

  handleUpdateDisplayName = () => {
    const displayName = this.displayName
    const setUsername = this.p2p.setUsername
    const trimmed = displayName.trim()
    if (!trimmed) return
    setUsername(trimmed)
    toast.success('Display name updated')
  }

  handleFontScaleChange = (value: string) => {
    const nextScale = Number(value)
    if (Number.isNaN(nextScale)) return
    const next = updateSettings({ fontScale: nextScale })
    this.settings = next
  }

  handleDensityChange = (checked: boolean) => {
    const next = updateSettings({ density: checked ? 'compact' : 'comfortable' })
    this.settings = next
  }

  handleSoundToggle = (checked: boolean) => {
    const notifSettings = this.notifSettings
    const next = { ...notifSettings, soundEnabled: checked }
    this.notifSettings = next
    saveNotificationSettings(next)
    if (checked) playNotificationSound(next.volume)
  }

  handleVolumeChange = (value: number[]) => {
    const notifSettings = this.notifSettings
    const vol = value[0]
    const next = { ...notifSettings, volume: vol }
    this.notifSettings = next
    saveNotificationSettings(next)
  }

  handleDesktopToggle = async (checked: boolean) => {
    const registerPushForCurrentRoom = this.p2p.registerPushForCurrentRoom
    const notifSettings = this.notifSettings
    if (checked) {
      const perm = await requestNotificationPermission()
      this.notifPermission = perm
      if (perm !== 'granted') {
        toast.error('Notification permission was denied by your browser.')
        return
      }
      const sub = await subscribeToPush()
      if (sub) {
        await registerPushForCurrentRoom(sub)
        toast.success('Push notifications enabled — you\'ll be notified even when the app is closed.')
      }
    } else {
      await unsubscribeFromPush()
    }
    const next = { ...notifSettings, desktopEnabled: checked }
    this.notifSettings = next
    saveNotificationSettings(next)
  }

  handleTestNotification = async () => {
    const currentChannel = this.p2p.currentChannel
    const currentRoom = this.p2p.currentRoom
    const registerPushForCurrentRoom = this.p2p.registerPushForCurrentRoom
    const perm = await requestNotificationPermission()
    this.notifPermission = perm
    if (perm !== 'granted') {
      toast.error('Notification permission was denied by your browser.')
      return
    }

    const sub = await subscribeToPush()
    if (sub) {
      await registerPushForCurrentRoom(sub)
    }

    const message = {
      id: `test-${Date.now()}`,
      channelId: currentChannel?.id ?? 'test-channel',
      userId: 'system',
      username: 'P2P Chat',
      content: 'This is a test notification from your settings panel.',
      timestamp: Date.now(),
      synced: true,
    }

    await showDesktopNotification(message, currentRoom?.name)
    toast.success('Test notification sent.')
  }

  handleStreamingChange = (key: keyof StreamingSettings, value: number) => {
    const streamingSettings = this.streamingSettings
    const next = { ...streamingSettings, [key]: value }
    this.streamingSettings = next
    updateSettings({ streaming: next })
  }

  handleReset = () => {
    const next = resetSettings()
    this.settings = next
    this.streamingSettings = next.streaming
    toast.message('Settings reset to defaults')
  }

  render() {
    const open = this.open
    const displayName = this.displayName
    const settings = this.settings
    const notifSettings = this.notifSettings
    const streamingSettings = this.streamingSettings
    const fontScaleValue = String(settings.fontScale)

    return (
      <Dialog open={open} onOpenChange={(open) => { this.open = open }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <FontAwesomeIcon icon={faGear} className="mr-2 text-[18px]" />
            Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Personalize your experience.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>
                <Button variant="outline" size="sm" onClick={this.handleReset}>Reset</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-display-name">Display name</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="settings-display-name"
                    value={displayName}
                    onChange={(event) => { this.displayName = event.target.value }}
                    placeholder="Enter display name"
                  />
                  <Button onClick={this.handleUpdateDisplayName} disabled={!displayName.trim()}>
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Changes apply to new connections and future rooms.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-font-size">Font size</Label>
                  <Select value={fontScaleValue} onValueChange={this.handleFontScaleChange}>
                    <SelectTrigger id="settings-font-size" className="w-full">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map((size) => (
                        <SelectItem key={size.label} value={String(size.value)}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                  <div>
                    <Label htmlFor="settings-density">Compact mode</Label>
                    <p className="text-xs text-muted-foreground">Tighter spacing across the UI.</p>
                  </div>
                  <Switch
                    id="settings-density"
                    checked={settings.density === 'compact'}
                    onCheckedChange={this.handleDensityChange}
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Streaming</h3>
              <p className="text-xs text-muted-foreground">Lower values reduce CPU &amp; bandwidth usage. Changes apply to the next stream you start.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-screen-fps">Screen share frame rate</Label>
                  <Select value={String(streamingSettings.screenShareFrameRate)} onValueChange={(v) => this.handleStreamingChange('screenShareFrameRate', Number(v))}>
                    <SelectTrigger id="settings-screen-fps" className="w-full">
                      <SelectValue placeholder="Select frame rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {FRAME_RATE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-screen-res">Screen share resolution</Label>
                  <Select value={String(streamingSettings.screenShareResolution)} onValueChange={(v) => this.handleStreamingChange('screenShareResolution', Number(v))}>
                    <SelectTrigger id="settings-screen-res" className="w-full">
                      <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_RESOLUTION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-cam-fps">Camera frame rate</Label>
                  <Select value={String(streamingSettings.cameraFrameRate)} onValueChange={(v) => this.handleStreamingChange('cameraFrameRate', Number(v))}>
                    <SelectTrigger id="settings-cam-fps" className="w-full">
                      <SelectValue placeholder="Select frame rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {FRAME_RATE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-cam-res">Camera resolution</Label>
                  <Select value={String(streamingSettings.cameraResolution)} onValueChange={(v) => this.handleStreamingChange('cameraResolution', Number(v))}>
                    <SelectTrigger id="settings-cam-res" className="w-full">
                      <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_RESOLUTION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                  <div>
                    <Label htmlFor="settings-sound">Message sounds</Label>
                    <p className="text-xs text-muted-foreground">Play a sound on new messages.</p>
                  </div>
                  <Switch
                    id="settings-sound"
                    checked={notifSettings.soundEnabled}
                    onCheckedChange={this.handleSoundToggle}
                  />
                </div>
                <div className="space-y-3 rounded-md border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="settings-volume">Volume</Label>
                    <span className="text-xs font-mono">{notifSettings.volume}%</span>
                  </div>
                  <Slider
                    id="settings-volume"
                    value={[notifSettings.volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={this.handleVolumeChange}
                    disabled={!notifSettings.soundEnabled}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                  <div>
                    <Label htmlFor="settings-desktop">Desktop notifications</Label>
                    <p className="text-xs text-muted-foreground">Alerts when the app is in background.</p>
                  </div>
                  <Switch
                    id="settings-desktop"
                    checked={notifSettings.desktopEnabled}
                    onCheckedChange={this.handleDesktopToggle}
                  />
                </div>
                <div className="flex items-center justify-center rounded-md border border-border bg-card px-4 py-3">
                  <Button variant="outline" size="sm" className="w-full" onClick={this.handleTestNotification}>
                    Send test notification
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <a href="https://github.com/kidfearless/fuice" target="_blank" rel="noopener noreferrer" className="hover:underline">kidfearless/fuice</a>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
}

export class SettingsDialog extends Component {
  static contextType = P2PContext

  render() {
    if (!this.context) return null
    return <SettingsDialogClass p2p={this.context as ReturnType<typeof useP2P>} />
  }
}
