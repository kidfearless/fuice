import React, { Component } from 'react'
import { P2PProviderBridge, P2PContext } from '@/lib/P2PContext'
import type { P2PContextType } from '@/lib/P2PContextTypes'
import { RoomHistorySidebar } from '@/components/RoomHistorySidebar'
import { Sidebar } from '@/components/Sidebar'
import { ChatArea } from '@/components/ChatArea'
import { VoiceAudioManager } from '@/components/VoiceAudioManager'
import { JoinRoomDialog } from '@/components/JoinRoomDialog'
import { OnboardingModal } from '@/components/OnboardingModal'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { clearCacheAndUpdate, registerServiceWorker } from '@/lib/sw-register'
import { applySettings, loadSettings } from '@/lib/settings'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsRotate, faUsers } from '@fortawesome/free-solid-svg-icons'
import { extractKeyFromFragment } from '@/lib/crypto'
import { toast } from 'sonner'

interface AppContentState {
  pendingJoinCode: string | null
  pendingEncryptionKey: string | null
  pendingJoinAccepted: boolean
  sidebarOpen: boolean
  onboardingOpen: boolean
  isMobile: boolean
}

class AppContent extends Component<Record<string, never>, AppContentState> {
  static contextType = P2PContext
  declare context: React.ContextType<typeof P2PContext>

  constructor(props: Record<string, never>) {
    super(props)
    this.state = {
      pendingJoinCode: null,
      pendingEncryptionKey: null,
      pendingJoinAccepted: false,
      sidebarOpen: false,
      onboardingOpen: false,
      isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    }
  }

  private handleResize = () => {
    this.setState({ isMobile: window.innerWidth < 768 })
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
    this.checkJoinParams()
    this.updateOnboardingState()
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize)
  }

  componentDidUpdate(prevProps: Record<string, never>, prevState: AppContentState) {
    const currentRoom = this.context?.currentRoom ?? null
    
    if (currentRoom !== this.lastRoom) {
      this.checkJoinParams()
      this.lastRoom = currentRoom
    }

    if (
      currentRoom !== this.lastRoomOnboarding ||
      this.state.pendingJoinCode !== prevState.pendingJoinCode ||
      this.state.pendingJoinAccepted !== prevState.pendingJoinAccepted
    ) {
      this.updateOnboardingState()
      this.lastRoomOnboarding = currentRoom
    }

    if (currentRoom && !this.lastRoomCloseOnboarding) {
      this.setState({ onboardingOpen: false })
      this.lastRoomCloseOnboarding = currentRoom
    }
  }

  lastRoom: P2PContextType['currentRoom'] = null
  lastRoomOnboarding: P2PContextType['currentRoom'] = null
  lastRoomCloseOnboarding: P2PContextType['currentRoom'] = null

  checkJoinParams = () => {
    const currentRoom = this.context?.currentRoom ?? null
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')

    if (joinCode) {
      const normalizedJoinCode = joinCode.toUpperCase()
      if (currentRoom?.id === normalizedJoinCode) {
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      const encKey = extractKeyFromFragment()
      this.setState({
        pendingJoinCode: normalizedJoinCode,
        pendingEncryptionKey: encKey || null,
        pendingJoinAccepted: false
      })
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  updateOnboardingState = () => {
    const currentRoom = this.context?.currentRoom ?? null
    const { pendingJoinCode, pendingJoinAccepted } = this.state

    if (currentRoom) return

    if (pendingJoinCode) {
      this.setState({ onboardingOpen: pendingJoinAccepted })
      return
    }

    this.setState({ onboardingOpen: true })
  }

  handleAcceptJoin = async () => {
    if (!this.state.pendingJoinCode) return
    this.setState({ pendingJoinAccepted: true, onboardingOpen: true })
  }

  handleDeclineJoin = () => {
    this.setState({
      pendingJoinCode: null,
      pendingEncryptionKey: null,
      pendingJoinAccepted: false,
      onboardingOpen: false
    })
  }

  handleOpenOnboarding = () => {
    this.setState({ onboardingOpen: true })
  }

  handleCloseOnboarding = () => {
    this.setState({
      onboardingOpen: false,
      pendingJoinCode: null,
      pendingEncryptionKey: null,
      pendingJoinAccepted: false
    })
  }

  handleCheckForUpdates = () => {
    toast.info('Clearing cache and updating...')
    void clearCacheAndUpdate()
  }

  render() {
    const currentRoom = this.context?.currentRoom ?? null
    const { pendingJoinCode, pendingEncryptionKey, pendingJoinAccepted, sidebarOpen, onboardingOpen, isMobile } = this.state
    const isJoiningFromUrl = false

    return (
      <>
        {!currentRoom ? (
          <>
            <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
              <div className="text-center space-y-4">
                <FontAwesomeIcon icon={faUsers} className="text-accent text-[48px]" />
                <h1 className="text-2xl font-bold">P2P Chat</h1>
                <p className="text-muted-foreground text-sm">
                  Decentralized, peer-to-peer communication
                </p>
                <button
                  onClick={this.handleOpenOnboarding}
                  className="text-sm text-accent underline underline-offset-4 hover:text-accent/80"
                >
                  Join or create a room
                </button>
              </div>
            </div>

            <Button
              type="button"
              size="icon"
              onClick={this.handleCheckForUpdates}
              className="fixed bottom-4 right-4 z-[2147483647] pointer-events-auto h-12 w-12 rounded-full shadow-lg"
              title="Check for updates"
              aria-label="Check for updates"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="text-[18px]" />
            </Button>

            <OnboardingModal
              open={onboardingOpen}
              onClose={this.handleCloseOnboarding}
              hasUser={false}
              initialJoinCode={pendingJoinCode ?? undefined}
              encryptionKey={pendingEncryptionKey ?? undefined}
            />

            {pendingJoinCode && !pendingJoinAccepted && (
              <JoinRoomDialog
                roomCode={pendingJoinCode}
                onAccept={this.handleAcceptJoin}
                onDecline={this.handleDeclineJoin}
                isLoading={isJoiningFromUrl}
              />
            )}
          </>
        ) : isMobile ? (
          <>
            <VoiceAudioManager />
            <Sheet open={sidebarOpen} onOpenChange={(open) => this.setState({ sidebarOpen: open })}>
              <SheetContent side="left" className="p-0 w-[calc(72px+240px)] max-w-[85vw] flex flex-row gap-0">
                <RoomHistorySidebar onAddRoom={this.handleOpenOnboarding} />
                <Sidebar onNavigate={() => this.setState({ sidebarOpen: false })} />
              </SheetContent>
            </Sheet>
            <div className="flex flex-col h-[100dvh] overflow-hidden min-h-0">
              <ChatArea onMenuToggle={() => this.setState({ sidebarOpen: true })} isMobile />
            </div>

            <OnboardingModal
              open={onboardingOpen}
              onClose={this.handleCloseOnboarding}
              hasUser={false}
              initialJoinCode={pendingJoinCode ?? undefined}
              encryptionKey={pendingEncryptionKey ?? undefined}
            />

            {pendingJoinCode && !pendingJoinAccepted && (
              <JoinRoomDialog
                roomCode={pendingJoinCode}
                onAccept={this.handleAcceptJoin}
                onDecline={this.handleDeclineJoin}
                isLoading={isJoiningFromUrl}
              />
            )}
          </>
        ) : (
          <>
            <VoiceAudioManager />
            <div className="flex h-screen overflow-hidden min-h-0">
              <RoomHistorySidebar onAddRoom={this.handleOpenOnboarding} />
              <Sidebar />
              <ChatArea />
            </div>

            <OnboardingModal
              open={onboardingOpen}
              onClose={this.handleCloseOnboarding}
              hasUser={false}
              initialJoinCode={pendingJoinCode ?? undefined}
              encryptionKey={pendingEncryptionKey ?? undefined}
            />

            {pendingJoinCode && !pendingJoinAccepted && (
              <JoinRoomDialog
                roomCode={pendingJoinCode}
                onAccept={this.handleAcceptJoin}
                onDecline={this.handleDeclineJoin}
                isLoading={isJoiningFromUrl}
              />
            )}
          </>
        )}
      </>
    )
  }
}

class App extends Component {
  componentDidMount() {
    registerServiceWorker()
    applySettings(loadSettings())
  }

  render() {
    return (
      <P2PProviderBridge>
        <AppContent />
        <Toaster position="top-center" />
      </P2PProviderBridge>
    )
  }
}

export default App
