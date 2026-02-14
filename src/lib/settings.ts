export type DensitySetting = 'comfortable' | 'compact'

export type StreamingSettings = {
  screenShareFrameRate: number
  screenShareResolution: number // 0 = native
  cameraFrameRate: number
  cameraResolution: number // 0 = native, else height px
}

export type AppSettings = {
  fontScale: number
  density: DensitySetting
  streaming: StreamingSettings
}

const SETTINGS_KEY = 'p2p-settings'

const DEFAULT_STREAMING: StreamingSettings = {
  screenShareFrameRate: 15,
  screenShareResolution: 720,
  cameraFrameRate: 30,
  cameraResolution: 480,
}

const DEFAULT_SETTINGS: AppSettings = {
  fontScale: 1,
  density: 'comfortable',
  streaming: DEFAULT_STREAMING,
}

const isBrowser = typeof window !== 'undefined'

export function loadSettings(): AppSettings {
  if (!isBrowser) return DEFAULT_SETTINGS

  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return DEFAULT_SETTINGS
    const parsed = JSON.parse(stored) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      streaming: { ...DEFAULT_STREAMING, ...(parsed.streaming ?? {}) },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser) return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function applySettings(settings: AppSettings) {
  if (!isBrowser) return

  const root = document.documentElement
  root.style.setProperty('--app-font-scale', String(settings.fontScale))
  root.dataset.density = settings.density
  root.style.setProperty('--radius', settings.density === 'compact' ? '0.375rem' : '0.5rem')
}

export function updateSettings(partial: Partial<AppSettings>) {
  const merged = { ...loadSettings(), ...partial }
  saveSettings(merged)
  applySettings(merged)
  return merged
}

export function resetSettings() {
  saveSettings(DEFAULT_SETTINGS)
  applySettings(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}
