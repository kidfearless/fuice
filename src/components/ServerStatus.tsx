import { useState, useEffect, useMemo } from 'react'
import { useP2P } from '@/lib/P2PContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faLock,
  faLockOpen,
  faSignal,
  faSignalPerfect,
  faBell,
  faBellSlash,
  faGears,
  faShieldHalved,
  faCircleCheck,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadNotificationSettings, getNotificationPermission } from '@/lib/notifications'

type StatusLevel = 'good' | 'warn' | 'off'

function StatusRow({ icon, label, value, level }: {
  icon: typeof faLock
  label: string
  value: string
  level: StatusLevel
}) {
  const color =
    level === 'good' ? 'text-[#23a55a]' :
    level === 'warn' ? 'text-[#f0b232]' :
    'text-[#b5bac1]'
  return (
    <div className="flex items-center gap-2.5 py-1">
      <FontAwesomeIcon icon={icon} className={`text-[13px] w-4 ${color}`} />
      <div className="flex-1 min-w-0">
        <span className="text-[13px] text-[#dbdee1]">{label}</span>
      </div>
      <span className={`text-[12px] font-medium ${color}`}>{value}</span>
    </div>
  )
}

function ApiDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-[7px] h-[7px] rounded-full flex-shrink-0 ${
        ok ? 'bg-[#23a55a]' : 'bg-[#ed4245]'
      }`}
    />
  )
}

interface WebApiEntry {
  name: string
  available: boolean
  usage: string
}

function detectWebApis(): WebApiEntry[] {
  const g = globalThis as Record<string, unknown>
  return [
    {
      name: 'WebRTC',
      available: typeof RTCPeerConnection !== 'undefined',
      usage: 'P2P connections & data channels',
    },
    {
      name: 'WebSocket',
      available: typeof WebSocket !== 'undefined',
      usage: 'Signaling server',
    },
    {
      name: 'Web Audio',
      available: typeof AudioContext !== 'undefined' || typeof (g as Record<string, unknown>).webkitAudioContext !== 'undefined',
      usage: 'Voice activity & sound effects',
    },
    {
      name: 'getUserMedia',
      available: !!navigator.mediaDevices?.getUserMedia,
      usage: 'Microphone & camera capture',
    },
    {
      name: 'Screen Capture',
      available: !!navigator.mediaDevices?.getDisplayMedia,
      usage: 'Screen sharing',
    },
    {
      name: 'Web Crypto',
      available: !!crypto?.subtle,
      usage: 'AES-GCM end-to-end encryption',
    },
    {
      name: 'IndexedDB',
      available: typeof indexedDB !== 'undefined',
      usage: 'Offline message & file storage',
    },
    {
      name: 'Service Worker',
      available: 'serviceWorker' in navigator,
      usage: 'Offline support & caching',
    },
    {
      name: 'Push API',
      available: 'PushManager' in window,
      usage: 'Background push notifications',
    },
    {
      name: 'Notifications',
      available: 'Notification' in window,
      usage: 'Desktop alerts',
    },
    {
      name: 'Cache API',
      available: 'caches' in window,
      usage: 'Asset caching & offline',
    },
    {
      name: 'Clipboard',
      available: !!navigator.clipboard,
      usage: 'Copy room links & text',
    },
  ]
}

export function ServerStatus() {
  const { isSignalingConnected, peers, hasRoomKey, currentRoom } = useP2P()
  const [swActive, setSwActive] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'enabled' | 'disabled' | 'denied'>('disabled')

  const webApis = useMemo(detectWebApis, [])
  const apisAvailable = webApis.filter(a => a.available).length
  const apisTotal = webApis.length

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        setSwActive(!!reg?.active)
      })
    }

    const ns = loadNotificationSettings()
    const perm = getNotificationPermission()
    if (perm === 'denied') setNotifStatus('denied')
    else if (ns.desktopEnabled && perm === 'granted') setNotifStatus('enabled')
    else setNotifStatus('disabled')
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        setSwActive(!!reg?.active)
      })
    }
    const ns = loadNotificationSettings()
    const perm = getNotificationPermission()
    if (perm === 'denied') setNotifStatus('denied')
    else if (ns.desktopEnabled && perm === 'granted') setNotifStatus('enabled')
    else setNotifStatus('disabled')
  }

  if (!currentRoom) return null

  const peerCount = peers.length
  const overallLevel: StatusLevel =
    !isSignalingConnected ? 'warn' :
    !hasRoomKey ? 'warn' :
    'good'

  const overallColor =
    overallLevel === 'good' ? 'text-[#23a55a]' :
    overallLevel === 'warn' ? 'text-[#f0b232]' :
    'text-[#b5bac1]'

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors rounded p-0.5 -mr-1">
          <FontAwesomeIcon icon={faShieldHalved} className={`text-[12px] ${overallColor}`} />
          <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-72 p-0 bg-[#2b2d31] border-black/40">
        <ScrollArea className="max-h-[70vh]">
          {/* ── Room Status ─────────────────────────── */}
          <div className="px-3 py-2.5 border-b border-black/20">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#b5bac1]">Room Status</h4>
          </div>
          <div className="px-3 py-2 space-y-0.5 border-b border-black/20">
            <StatusRow
              icon={isSignalingConnected ? faSignalPerfect : faSignal}
              label="Signaling"
              value={isSignalingConnected ? 'Connected' : 'Disconnected'}
              level={isSignalingConnected ? 'good' : 'warn'}
            />
            <StatusRow
              icon={hasRoomKey ? faLock : faLockOpen}
              label="Encryption"
              value={hasRoomKey ? 'Enabled' : 'No Key'}
              level={hasRoomKey ? 'good' : 'warn'}
            />
            <StatusRow
              icon={peerCount > 0 ? faCircleCheck : faCircleXmark}
              label="Peers"
              value={`${peerCount} connected`}
              level={peerCount > 0 ? 'good' : 'off'}
            />
            <StatusRow
              icon={notifStatus === 'enabled' ? faBell : faBellSlash}
              label="Notifications"
              value={notifStatus === 'enabled' ? 'Enabled' : notifStatus === 'denied' ? 'Blocked' : 'Disabled'}
              level={notifStatus === 'enabled' ? 'good' : notifStatus === 'denied' ? 'warn' : 'off'}
            />
            <StatusRow
              icon={faGears}
              label="Service Worker"
              value={swActive ? 'Active' : 'Inactive'}
              level={swActive ? 'good' : 'off'}
            />
            <StatusRow
              icon={faCircleCheck}
              label="Background Sync"
              value={swActive ? 'Available' : 'Unavailable'}
              level={swActive ? 'good' : 'off'}
            />
          </div>

          {/* ── Web APIs ─────────────────────────────── */}
          <div className="px-3 py-2.5 border-b border-black/20 flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#b5bac1]">Web APIs</h4>
            <span className={`text-[11px] font-medium ${apisAvailable === apisTotal ? 'text-[#23a55a]' : 'text-[#f0b232]'}`}>
              {apisAvailable}/{apisTotal}
            </span>
          </div>
          <div className="px-3 py-2 space-y-1">
            {webApis.map(api => (
              <div key={api.name} className="flex items-center gap-2 py-0.5">
                <ApiDot ok={api.available} />
                <span className="text-[13px] text-[#dbdee1] min-w-0">{api.name}</span>
                <span className="text-[11px] text-[#80848e] ml-auto flex-shrink-0">{api.usage}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
