# fuice

Peer-to-peer group chat with voice and file sharing. Fuice uses WebRTC for direct connections and a lightweight signaling server with no long-term message storage.

Built for people who want real-time communication without ad-driven product pressure, account gating, or centralized chat archives. Fuice keeps infrastructure minimal and ownership local: peers exchange data directly, and the signaling layer only helps connections happen.

---

## Why

Fuice exists because mainstream chat platforms keep drifting toward surveillance-heavy, growth-at-all-costs behavior: ads in core UX, opaque policy shifts, and increasingly invasive identity requirements to unlock full features. We think that direction is unacceptable for everyday communication.

You will hear that a "free Discord alternative" is impossible without centralization and monetization at massive scale. Fuice rejects that premise. The goal here is simple: direct, peer-to-peer communication with minimal infrastructure and no data warehouse behind it.

In fuice, the only server is the signaling server used to help peers find each other and negotiate connections. It has no long-term storage for messages, files, or room history.

## Security and trust model

Fuice is private by architecture, but not a hardened secure messenger.

- Communication is peer-to-peer and avoids centralized message storage.
- Security improvements have been attempted, but this project should not be treated as a high-assurance system.
- Moderation capabilities are minimal by design, so abuse handling is limited.
- Use your own risk model and avoid sharing data that requires strong formal guarantees.

## Built with AI

This app was 100% generated with GitHub Copilot (AI agent assistance). That means it can contain mistakes, weak assumptions, or subtle bugs. Deep scrutiny, audits, and contributions are strongly encouraged.

## What you can do with it

**Chat** — Create rooms with text channels. Messages sync between peers and persist locally in IndexedDB. Reconnecting peers automatically catch up via ID-based diffing.

**Voice** — Join voice channels for real-time audio. Mute, deafen, and speaking indicators work like you'd expect.

**Files** — Drag-and-drop file sharing up to 100 MB. Files transfer directly peer-to-peer with chunking and progress tracking. Image and video previews render inline.

**Offline-first** — Everything is stored locally. The app works without a network connection and syncs when peers reconnect.

**PWA** — Installable as a standalone app on desktop and mobile. Service worker caches the shell and handles background sync.

**Push notifications** — Optional. Requires VAPID keys on the signaling server. Works when the app is closed.

**GIF search** — `/gif`, `/giphy`, `/tenor` commands with inline previews.

**Reactions** — Emoji reactions on messages, synced across peers.

## Current limitations

- No robust moderation tooling.
- Not a formally audited secure messenger.
- P2P reliability still depends on network conditions and NAT/firewall behavior.

## How it works

```
┌──────────┐         WebSocket          ┌──────────────────┐
│ Browser  │◄──────(signaling only)────►│ Signaling Server │
│  Peer A  │                            └──────────────────┘
│          │                                     ▲
│          │    WebRTC data + audio channels      │ WebSocket
│          │◄─────────────────────────────►┌──────┴───┐
└──────────┘     (messages, files, voice)  │ Browser  │
                                           │  Peer B  │
                                           └──────────┘
```

The signaling server (`signaling-server.js`) handles peer discovery, WebRTC offer/answer relay, and optional push notification delivery. It stores nothing — no messages, no files, no user data.



## Build and run

### Quick start

```bash
# 1. Install
npm ci

# 2. Configure
cp .env.example .env
# Edit .env — set VITE_SIGNALING_URL (default: ws://localhost:3001)

# 3. Start the signaling server (separate terminal)
npm run signaling:start

# 4. Start the app
npm run dev
```

Open `http://localhost:5173`. Create a room, share the room code with someone, and start chatting.

### Docker (signaling server only)

```bash
docker compose up --build signaling-server
```

### Configuration

#### Frontend — `.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_SIGNALING_URL` | yes | — | WebSocket URL, e.g. `ws://localhost:3001` |
| `VITE_GIPHY_API_KEY` | no | public beta key | Giphy API key |
| `VITE_TENOR_API_KEY` | no | public key | Tenor API key |

#### Signaling server — environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3001` | HTTP/WebSocket port |
| `VAPID_PUBLIC_KEY` | no | — | Required for push notifications |
| `VAPID_PRIVATE_KEY` | no | — | Required for push notifications |
| `VAPID_SUBJECT` | no | `mailto:maintainers@example.com` | VAPID contact |

If VAPID keys aren't set, the server runs fine — push notifications are simply disabled.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check, build, and lint |
| `npm run lint` | ESLint |
| `npm test` | Unit + integration tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:coverage` | Coverage reports |
| `npm run signaling:start` | Start signaling server |

## Contributing

PRs welcome. Fork, branch from `main`, and make sure `npm run lint && npm test` pass before opening.

## License

MIT
