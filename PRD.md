# Planning Guide

Last updated: 2026-02-11

A decentralized, peer-to-peer communication platform that enables text chat, voice channels, and file sharing without requiring centralized servers - communications happen directly between users with offline-first data persistence.

**Experience Qualities**:
1. **Autonomous** - Users maintain complete control over their data and connections, with all chat history stored locally and synchronized peer-to-peer
2. **Seamless** - Transitions between online/offline states are invisible, with cached data always accessible and automatic reconnection when peers come online
3. **Intimate** - Direct peer connections create a sense of privacy and ownership, with end-to-end communication that bypasses traditional server infrastructure

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a sophisticated real-time communication platform requiring WebRTC peer connections, IndexedDB persistence, service worker integration, media stream management, and complex state synchronization across distributed clients.

## Current State Summary

**Implemented (shipping)**
- WebRTC peer connections with WebSocket signaling for discovery
- Text channels with peer sync and IndexedDB persistence
- Voice channels (audio stream), mute/deafen, speaking indicator
- File transfer via data channel with chunking, previews for images
- Room history and auto-join last room
- PWA assets (manifest + service worker)

**Partially implemented**
- Screen sharing: capture UI and local state only (no outbound stream)

**Not yet implemented**
- TURN server support and configuration UI
- End-to-end message encryption layer
- File transfer resume and rich transfer controls

## Essential Features

### Peer Connection System
- **Functionality**: Establishes direct WebRTC connections between users using a WebSocket signaling server for peer discovery and connection negotiation
- **Purpose**: Enables decentralized communication without server dependencies for actual data transfer
- **Trigger**: User creates or joins a room using a shareable connection code
- **Progression**: User generates room code → Shares code with peers → Peers enter code → WebSocket signaling server facilitates peer discovery → WebRTC signaling establishes connection → Encrypted peer-to-peer channel opens → Real-time data/media flows directly between peers
- **Status**: Implemented (signaling client + server, connection status UI)
- **Success criteria**: Two or more users successfully connect and can exchange messages/media (latency targets not yet measured)

### Text Channels
- **Functionality**: Organized message threads with real-time synchronization across connected peers
- **Purpose**: Structured conversation organization similar to Discord channels
- **Trigger**: User creates a channel or selects existing channel from sidebar
- **Progression**: User clicks create channel → Names channel → Channel appears for all peers → Messages sent sync to all connected peers via WebRTC data channels → Messages persist to local IndexedDB → On reconnect, peers exchange message/channel diffs by ID
- **Status**: Implemented (channel creation + sync by ID list)
- **Success criteria**: Messages appear for online peers and synchronize when peers reconnect (latency targets not yet measured)

### Voice Channels
- **Functionality**: Real-time voice communication between connected peers
- **Purpose**: Replaces traditional Discord voice channels with peer-to-peer audio
- **Trigger**: User clicks to join voice channel
- **Progression**: User joins voice channel → Browser requests microphone permission → Audio stream captured → Stream sent via WebRTC to all peers in channel → Audio from peers played locally → User can mute/unmute or leave
- **Status**: Implemented (audio streaming, mute/deafen, speaking indicator)
- **Success criteria**: Clear audio quality with smooth join/leave transitions (latency targets not yet measured)

### Screen Sharing
- **Functionality**: Capture screen/window/tab and toggle UI state
- **Purpose**: Planned collaboration and presentation capabilities
- **Trigger**: User clicks screen share button while in a voice channel
- **Progression**: User initiates share → Browser shows picker for screen/window/tab → User selects source → UI shows sharing state → User can stop sharing
- **Status**: Partially implemented (capture + UI state; stream is not transmitted)
- **Success criteria**: Screen share stream sent to peers and visible in UI

### File Sharing
- **Functionality**: Send files directly to peers via WebRTC data channels with chunked transfer
- **Purpose**: Share documents, images, and other files without server storage
- **Trigger**: User clicks file attachment button
- **Progression**: User selects file → File metadata shown with progress indicator → File chunked and sent via data channels → Peers receive chunks and reassemble → Download available when complete → Small files stored in IndexedDB, large images store preview only
- **Status**: Implemented (100MB limit, chunked transfer, image/video preview UI)
- **Success criteria**: Files up to 100MB transfer successfully with progress tracking and download option

### Offline-First Storage
- **Functionality**: All messages, channels, rooms, and files stored locally in IndexedDB
- **Purpose**: Access chat history and data without internet connection
- **Trigger**: Automatic on all data operations
- **Progression**: Data change occurs → Immediately written to IndexedDB → Propagated to connected peers → On reconnection, peers exchange diff based on known IDs
- **Status**: Implemented (messages, channels, rooms, room history, files)
- **Success criteria**: Historical data accessible offline, peer diffs reconcile on reconnect

### PWA Installation
- **Functionality**: Installable as standalone app with service worker caching
- **Purpose**: Native app-like experience with offline functionality
- **Trigger**: User visits site, browser prompts for installation
- **Progression**: Service worker registers → Caches core assets → User installs → App launches in standalone window → Works offline
- **Status**: Implemented (manifest + service worker)
- **Success criteria**: App installs on desktop/mobile and launches offline with full UI

## Edge Case Handling (Current)

- **Connection Loss**: Messages are stored locally; on reconnect, peers sync by ID lists
- **Peer Disconnect**: UI updates peer list; chat history remains
- **Signaling Server Disconnect**: Automatic reconnection with queued signaling messages
- **Simultaneous Edits**: ID-based merge and dedupe; no vector clocks or CRDTs yet
- **First User in Channel**: Empty state with prompt to send first message
- **Browser Permissions Denied**: Errors logged; no custom retry flow yet
- **Network Behind NAT/Firewall**: STUN only; no TURN fallback yet
- **Storage Quota Exceeded**: No automatic cleanup policy yet
- **Signaling Server Unavailable**: Connection status indicator, retry logic in client
- **File Too Large**: Client-side size validation (100MB limit)
- **Unsupported File Type**: No type restrictions; previews for images/video only
- **Transfer Interrupted**: No resume yet; transfer must be re-sent

## Roadmap (Next)

- Add TURN server support and UI-configurable STUN/TURN list
- Implement screen share streaming to peers
- Add end-to-end message encryption layer
- Add file transfer resume and cancel controls
- Add storage retention settings and cleanup policies

## Design Direction

The design should evoke feelings of empowerment, control, and technical sophistication - users should feel like they're using cutting-edge decentralized technology. The aesthetic should balance cyberpunk-inspired technical aesthetics with approachable usability, using rich gradients, subtle animations, and clear information hierarchy to create an interface that feels both powerful and intuitive.

## Color Selection

A dark, high-contrast cyberpunk-inspired palette with electric accent colors that convey technological sophistication and decentralized power.

- **Primary Color**: Deep Purple `oklch(0.35 0.15 290)` - Represents decentralized technology and peer networks, conveys innovation and trustworthiness
- **Secondary Colors**: 
  - Dark Slate `oklch(0.18 0.02 260)` - Background and container surfaces
  - Charcoal `oklch(0.12 0.01 260)` - Deeper background for app base
- **Accent Color**: Electric Cyan `oklch(0.75 0.15 195)` - For active states, online indicators, and call-to-action elements that demand attention
- **Foreground/Background Pairings**:
  - Background (Charcoal `oklch(0.12 0.01 260)`): Light text `oklch(0.95 0 0)` - Ratio 16.8:1 ✓
  - Card (Dark Slate `oklch(0.18 0.02 260)`): Light text `oklch(0.95 0 0)` - Ratio 13.2:1 ✓
  - Primary (Deep Purple `oklch(0.35 0.15 290)`): White text `oklch(0.98 0 0)` - Ratio 6.1:1 ✓
  - Accent (Electric Cyan `oklch(0.75 0.15 195)`): Dark text `oklch(0.12 0.01 260)` - Ratio 10.5:1 ✓
  - Success (Green `oklch(0.65 0.18 145)`): Dark text `oklch(0.12 0.01 260)` - Ratio 7.8:1 ✓
  - Destructive (Red `oklch(0.58 0.22 25)`): White text `oklch(0.98 0 0)` - Ratio 5.2:1 ✓

## Font Selection

Typography should convey technical precision while maintaining excellent readability for long chat sessions - a modern sans-serif with generous spacing that works well at small sizes for dense message lists.

- **Typographic Hierarchy**:
  - H1 (Server/Room Name): Space Grotesk Bold / 24px / -0.02em letter spacing / 1.2 line height
  - H2 (Channel Names): Space Grotesk Medium / 16px / -0.01em / 1.3
  - H3 (Section Headers): Space Grotesk Medium / 14px / 0em / 1.4
  - Body (Messages): Inter Regular / 15px / 0em / 1.5
  - Small (Timestamps, Metadata): Inter Regular / 12px / 0em / 1.4
  - Code (Connection IDs, Technical Info): JetBrains Mono Regular / 13px / 0em / 1.4

## Animations

Animations should emphasize connectivity and data flow - use subtle pulsing for online indicators, smooth slide transitions for channel switching, and gentle fades for message appearances. Screen share and voice channel joins should have purposeful scale-in animations that draw attention without disrupting conversation flow. Limit animation duration to 200-350ms for state changes, with spring physics for drawer/modal appearances.

## Component Selection

- **Components**:
  - `Sidebar`: Left navigation for channels and voice rooms with collapsible sections
  - `Card`: Message containers and connection status displays
  - `Button`: Primary actions (join voice, share screen, send message) with distinct variants for destructive actions (leave, disconnect)
  - `Input`: Message composition and channel creation
  - `Dialog`: Room creation, settings, and connection code sharing
  - `Badge`: Online status indicators and unread message counts
  - `ScrollArea`: Message history and channel lists
  - `Avatar`: User presence indicators with online/offline status
  - `Separator`: Visual division between channels and sections
  - `Tabs`: Switching between text channels and voice channels
  - `Switch`: Settings toggles (mute, deafen, notifications)
  - `Tooltip`: Contextual help for technical features

- **Customizations**:
  - Custom WebRTC connection indicator component showing peer count and connection quality
  - Custom waveform visualizer for voice activity
  - Custom screen share preview tile with minimize/maximize controls
  - Custom message list with infinite scroll and date separators
  - Custom connection code display with QR code generation

- **States**:
  - Buttons: Distinct hover with electric cyan glow, active with scale-down (0.97), disabled with 40% opacity
  - Inputs: Focus state with cyan ring, error with red border glow
  - Voice channel: Idle (gray), speaking (green pulse), muted (red)
  - Connection status: Connected (cyan), connecting (yellow pulse), disconnected (red)

- **Icon Selection**:
  - `Hash` - Text channels
  - `Microphone` / `MicrophoneSlash` - Voice controls
  - `Monitor` / `MonitorPlay` - Screen sharing
  - `Users` - Peer list
  - `Gear` - Settings
  - `SignOut` - Leave/disconnect
  - `Copy` - Copy connection code
  - `CircleNotch` - Loading/connecting states
  - `Circle` (filled) - Online status
  - `ArrowsClockwise` - Sync status
  - `Paperclip` / `File` - File attachment and file messages
  - `DownloadSimple` - File download action
  - `Image` / `FilePdf` / `FileText` - File type indicators

- **Spacing**: 
  - Base unit: 4px
  - Message padding: 12px (3 units)
  - Channel list padding: 8px (2 units)
  - Section gaps: 16px (4 units)
  - Sidebar width: 240px
  - Message input height: 44px (11 units)

- **Mobile**:
  - Collapsible sidebar that overlays content on mobile (<768px)
  - Bottom navigation bar for primary actions (channels, voice, settings)
  - Full-screen mode for screen shares
  - Simplified voice controls with larger touch targets (48px minimum)
  - Stacked layout for peer video/screen shares
