import { useEffect, useMemo, useState } from 'react'
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
import { useP2P } from '@/lib/P2PContext'
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

export function SettingsDialog() {
  const { currentUser, currentRoom, currentChannel, setUsername, registerPushForCurrentRoom } = useP2P()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(currentUser?.username ?? '')
  const [settings, setSettings] = useState(loadSettings())
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(loadNotificationSettings())
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission())
  const [streamingSettings, setStreamingSettings] = useState<StreamingSettings>(loadSettings().streaming)

  useEffect(() => {
    setDisplayName(currentUser?.username ?? '')
  }, [currentUser])

  const fontScaleValue = useMemo(() => String(settings.fontScale), [settings.fontScale])

  const handleUpdateDisplayName = () => {
    const trimmed = displayName.trim()
    if (!trimmed) return
    setUsername(trimmed)
    toast.success('Display name updated')
  }

  const handleFontScaleChange = (value: string) => {
    const nextScale = Number(value)
    if (Number.isNaN(nextScale)) return
    const next = updateSettings({ fontScale: nextScale })
    setSettings(next)
  }

  const handleDensityChange = (checked: boolean) => {
    const next = updateSettings({ density: checked ? 'compact' : 'comfortable' })
    setSettings(next)
  }

  const handleSoundToggle = (checked: boolean) => {
    const next = { ...notifSettings, soundEnabled: checked }
    setNotifSettings(next)
    saveNotificationSettings(next)
    if (checked) playNotificationSound(next.volume)
  }

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0]
    const next = { ...notifSettings, volume: vol }
    setNotifSettings(next)
    saveNotificationSettings(next)
  }

  const handleDesktopToggle = async (checked: boolean) => {
    if (checked) {
      const perm = await requestNotificationPermission()
      setNotifPermission(perm)
      if (perm !== 'granted') {
        toast.error('Notification permission was denied by your browser.')
        return
      }
      // Subscribe to push so notifications arrive even when the app is closed
      const sub = await subscribeToPush()
      if (sub) {
        await registerPushForCurrentRoom(sub)
        toast.success('Push notifications enabled — you\'ll be notified even when the app is closed.')
      }
    } else {
      await unsubscribeFromPush()
    }
    const next = { ...notifSettings, desktopEnabled: checked }
    setNotifSettings(next)
    saveNotificationSettings(next)
  }

  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission()
    setNotifPermission(perm)
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

  const handleStreamingChange = (key: keyof StreamingSettings, value: number) => {
    const next = { ...streamingSettings, [key]: value }
    setStreamingSettings(next)
    updateSettings({ streaming: next })
  }

  const handleReset = () => {
    const next = resetSettings()
    setSettings(next)
    setStreamingSettings(next.streaming)
    toast.message('Settings reset to defaults')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-display-name">Display name</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="settings-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Enter display name"
                />
                <Button onClick={handleUpdateDisplayName} disabled={!displayName.trim()}>
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
                <Select value={fontScaleValue} onValueChange={handleFontScaleChange}>
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
                  onCheckedChange={handleDensityChange}
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
                <Select value={String(streamingSettings.screenShareFrameRate)} onValueChange={(v) => handleStreamingChange('screenShareFrameRate', Number(v))}>
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
                <Select value={String(streamingSettings.screenShareResolution)} onValueChange={(v) => handleStreamingChange('screenShareResolution', Number(v))}>
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
                <Select value={String(streamingSettings.cameraFrameRate)} onValueChange={(v) => handleStreamingChange('cameraFrameRate', Number(v))}>
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
                <Select value={String(streamingSettings.cameraResolution)} onValueChange={(v) => handleStreamingChange('cameraResolution', Number(v))}>
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
                  <p className="text-xs text-muted-foreground">Play a blip when a message arrives.</p>
                </div>
                <Switch
                  id="settings-sound"
                  checked={notifSettings.soundEnabled}
                  onCheckedChange={handleSoundToggle}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                <div>
                  <Label htmlFor="settings-desktop-notif">Desktop notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    {notifPermission === 'denied'
                      ? 'Blocked by browser — update in site settings.'
                      : 'Receive notifications even when the app is closed.'}
                  </p>
                </div>
                <Switch
                  id="settings-desktop-notif"
                  checked={notifSettings.desktopEnabled && notifPermission !== 'denied'}
                  onCheckedChange={handleDesktopToggle}
                  disabled={notifPermission === 'denied'}
                />
              </div>
            </div>
            {notifSettings.soundEnabled && (
              <div className="space-y-2">
                <Label>Notification volume</Label>
                <Slider
                  value={[notifSettings.volume]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  onValueCommit={(v) => playNotificationSound(v[0])}
                  className="w-full max-w-xs"
                />
              </div>
            )}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={handleTestNotification}>
                Send test notification
              </Button>
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Project repo:{' '}
            <a
              href="https://github.com/kidfearless/fuice"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              kidfearless/fuice
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
