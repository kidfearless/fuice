export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)

      // Register periodic background sync so the SW can poll for
      // missed messages even when the app isn't open.
      if ('periodicSync' in registration) {
        try {
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync' as PermissionName,
          })
          if (status.state === 'granted') {
            await (registration as unknown as { periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> } }).periodicSync.register('p2p-chat-poll', {
              minInterval: 60 * 1000, // request every 1 minute (browser may throttle)
            })
            console.log('[sw] Periodic background sync registered')
          }
        } catch (e) {
          console.warn('[sw] Periodic sync registration failed (fallback polling will be used):', e)
        }
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }
}

export async function clearCacheAndUpdate() {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
        console.log('Service Worker unregistered')
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
      console.log('All caches cleared')
    }

    // Reload the page to get fresh content
    window.location.reload()
  } catch (error) {
    console.error('Failed to clear cache and update:', error)
    // Still reload even if there was an error
    window.location.reload()
  }
}
