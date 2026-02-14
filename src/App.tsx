import { P2PProvider, useP2P } from '@/lib/P2PContext'
import { RoomHistorySidebar } from '@/components/RoomHistorySidebar'
import { Sidebar } from '@/components/Sidebar'
import { ChatArea } from '@/components/ChatArea'
import { VoiceAudioManager } from '@/components/VoiceAudioManager'
import { JoinRoomDialog } from '@/components/JoinRoomDialog'
import { OnboardingModal } from '@/components/OnboardingModal'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useEffect, useState } from 'react'
import { clearCacheAndUpdate, registerServiceWorker } from '@/lib/sw-register'
import { applySettings, loadSettings } from '@/lib/settings'
import { useIsMobile } from '@/hooks/use-mobile'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsRotate, faUsers } from '@fortawesome/free-solid-svg-icons'
import { extractKeyFromFragment } from '@/lib/crypto'
import { toast } from 'sonner'

function AppContent() {
  const { currentRoom } = useP2P()
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null)
  const [pendingEncryptionKey, setPendingEncryptionKey] = useState<string | null>(null)
  const [pendingJoinAccepted, setPendingJoinAccepted] = useState(false)
  const isJoiningFromUrl = false
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    // Check for join parameter in URL
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')

    if (joinCode) {
      const normalizedJoinCode = joinCode.toUpperCase()
      if (currentRoom?.id === normalizedJoinCode) {
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      // Extract encryption key from fragment before cleaning URL
      const encKey = extractKeyFromFragment()
      setPendingJoinCode(normalizedJoinCode)
      if (encKey) setPendingEncryptionKey(encKey)
      setPendingJoinAccepted(false)
      // Clean up URL (including fragment)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [currentRoom])

  // Auto-open onboarding when there's no room and no pending invite flow.
  // For invite links, show room info first, then onboarding after user accepts.
  useEffect(() => {
    if (currentRoom) return

    if (pendingJoinCode) {
      setOnboardingOpen(pendingJoinAccepted)
      return
    }

    setOnboardingOpen(true)
  }, [currentRoom, pendingJoinCode, pendingJoinAccepted])

  useEffect(() => {
    if (currentRoom) {
      setOnboardingOpen(false)
    }
  }, [currentRoom])

  const handleAcceptJoin = async () => {
    if (!pendingJoinCode) return

    setPendingJoinAccepted(true)
    setOnboardingOpen(true)
  }

  const handleDeclineJoin = () => {
    setPendingJoinCode(null)
    setPendingEncryptionKey(null)
    setPendingJoinAccepted(false)
    setOnboardingOpen(false)
  }

  const handleOpenOnboarding = () => {
    setOnboardingOpen(true)
  }

  const handleCloseOnboarding = () => {
    setOnboardingOpen(false)
    setPendingJoinCode(null)
    setPendingEncryptionKey(null)
    setPendingJoinAccepted(false)
  }

  const handleCheckForUpdates = () => {
    toast.info('Clearing cache and updating...')
    void clearCacheAndUpdate()
  }

  // ── No room: show landing with onboarding modal ───────────────────
  if (!currentRoom) {
    return (
      <>
        <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <FontAwesomeIcon icon={faUsers} className="text-accent text-[48px]" />
            <h1 className="text-2xl font-bold">P2P Chat</h1>
            <p className="text-muted-foreground text-sm">
              Decentralized, peer-to-peer communication
            </p>
            <button
              onClick={handleOpenOnboarding}
              className="text-sm text-accent underline underline-offset-4 hover:text-accent/80"
            >
              Join or create a room
            </button>
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          onClick={handleCheckForUpdates}
          className="fixed bottom-4 right-4 z-[2147483647] pointer-events-auto h-12 w-12 rounded-full shadow-lg"
          title="Check for updates"
          aria-label="Check for updates"
        >
          <FontAwesomeIcon icon={faArrowsRotate} className="text-[18px]" />
        </Button>

        <OnboardingModal
          open={onboardingOpen}
          onClose={handleCloseOnboarding}
          hasUser={false}
          initialJoinCode={pendingJoinCode ?? undefined}
          encryptionKey={pendingEncryptionKey ?? undefined}
        />

        {pendingJoinCode && !pendingJoinAccepted && (
          <JoinRoomDialog
            roomCode={pendingJoinCode}
            onAccept={handleAcceptJoin}
            onDecline={handleDeclineJoin}
            isLoading={isJoiningFromUrl}
          />
        )}
      </>
    )
  }

  // ── Has room: normal layout ───────────────────────────────────────

  if (isMobile) {
    return (
      <>
        <VoiceAudioManager />
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[calc(72px+240px)] max-w-[85vw] flex flex-row gap-0">
            <RoomHistorySidebar onAddRoom={handleOpenOnboarding} />
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex flex-col h-[100dvh] overflow-hidden min-h-0">
          <ChatArea onMenuToggle={() => setSidebarOpen(true)} isMobile />
        </div>

        <OnboardingModal
          open={onboardingOpen}
          onClose={handleCloseOnboarding}
          hasUser={false}
          initialJoinCode={pendingJoinCode ?? undefined}
          encryptionKey={pendingEncryptionKey ?? undefined}
        />

        {pendingJoinCode && !pendingJoinAccepted && (
          <JoinRoomDialog
            roomCode={pendingJoinCode}
            onAccept={handleAcceptJoin}
            onDecline={handleDeclineJoin}
            isLoading={isJoiningFromUrl}
          />
        )}
      </>
    )
  }

  return (
    <>
      <VoiceAudioManager />
      <div className="flex h-screen overflow-hidden min-h-0">
        <RoomHistorySidebar onAddRoom={handleOpenOnboarding} />
        <Sidebar />
        <ChatArea />
      </div>

      <OnboardingModal
        open={onboardingOpen}
        onClose={handleCloseOnboarding}
        hasUser={false}
        initialJoinCode={pendingJoinCode ?? undefined}
        encryptionKey={pendingEncryptionKey ?? undefined}
      />

      {pendingJoinCode && !pendingJoinAccepted && (
        <JoinRoomDialog
          roomCode={pendingJoinCode}
          onAccept={handleAcceptJoin}
          onDecline={handleDeclineJoin}
          isLoading={isJoiningFromUrl}
        />
      )}
    </>
  )
}

function App() {
  useEffect(() => {
    registerServiceWorker()
    applySettings(loadSettings())
  }, [])

  return (
    <P2PProvider>
      <AppContent />
      <Toaster position="top-center" />
    </P2PProvider>
  )
}

export default App