import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

type LockNavigator = Navigator & {
  locks?: {
    request: (
      name: string,
      options: { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean },
      callback: (lock: unknown | null) => void | Promise<void>
    ) => Promise<void>
  }
}

type InstanceMessage = {
  type: 'single-instance-ping' | 'single-instance-pong'
  from: string
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
const root = createRoot(rootElement)

function renderApp() {
  root.render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  )
}

function renderAlreadyOpenNotice() {
  root.render(
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">App already open</h1>
        <p className="text-sm text-muted-foreground">This PWA only allows one active instance. Return to the existing window to continue.</p>
      </div>
    </div>
  )
}

async function claimSingleInstance(): Promise<boolean> {
  const nav = navigator as LockNavigator
  if (nav.locks?.request) {
    let acquired = false
    await nav.locks.request('p2p-chat-single-instance', { ifAvailable: true, mode: 'exclusive' }, async (lock) => {
      if (!lock) return
      acquired = true
      await new Promise(() => {})
    })
    return acquired
  }

  const instanceId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const channel = new BroadcastChannel('p2p-chat-single-instance')
  let anotherInstanceIsActive = false

  const handleMessage = (event: MessageEvent<InstanceMessage>) => {
    const message = event.data
    if (!message || typeof message !== 'object' || message.from === instanceId) return
    if (message.type === 'single-instance-ping') {
      channel.postMessage({ type: 'single-instance-pong', from: instanceId } satisfies InstanceMessage)
      return
    }
    if (message.type === 'single-instance-pong') {
      anotherInstanceIsActive = true
    }
  }

  channel.addEventListener('message', handleMessage)
  channel.postMessage({ type: 'single-instance-ping', from: instanceId } satisfies InstanceMessage)
  await new Promise(resolve => setTimeout(resolve, 250))

  if (anotherInstanceIsActive) {
    channel.removeEventListener('message', handleMessage)
    channel.close()
    return false
  }

  window.addEventListener('beforeunload', () => {
    channel.removeEventListener('message', handleMessage)
    channel.close()
  }, { once: true })

  return true
}

void (async () => {
  const isPrimaryInstance = await claimSingleInstance()
  if (!isPrimaryInstance) {
    renderAlreadyOpenNotice()
    return
  }
  renderApp()
})()
