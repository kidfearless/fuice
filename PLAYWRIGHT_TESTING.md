# Playwright Testing Guide

This document describes how to run and maintain Playwright-based testing for this project.

## Scope

This app is tested primarily through end-to-end browser flows:

- Onboarding flow (Join/Create, Username, Privacy)
- Join-by-link flow
- Encryption key behavior
- Multi-user messaging with separate browser profiles
- Update button behavior on landing/onboarding screen

## Prerequisites

- Node.js installed
- Dependencies installed in the repo
- App running locally
- A browser binary available for Playwright (Chromium/Brave/Chrome)

## Local App Startup

Use one terminal:

- npm run kill
- npm run dev -- --host 0.0.0.0 --port 5001

Testing examples in this guide assume:

- Base URL: http://localhost:5001

## Playwright Options Used in This Project

### 1) Playwright MCP (recommended for rapid investigation)

Use MCP browser tools for:

- Fast reproduction of UI issues
- Two-context simulations (separate users/profiles)
- Capturing console/runtime errors

### 2) Local Node scripts (optional)

If you want scriptable local runs outside MCP, use Playwright Core and point to an installed browser executable.

## Test Design Principles

- Use separate browser contexts for separate users.
- Always validate both behavior and console errors.
- Prefer deterministic selectors (ids and role+name).
- Test both happy path and failure path for join/encryption.

## Core Test Cases

## TC-01: Add Room opens Join/Create first

Purpose:
- Ensure clicking Add Room starts at Join/Create screen, not Privacy.

Steps:
1. Create and enter any room.
2. Click Add Room (+) in room history sidebar.
3. Observe onboarding first screen.

Expected:
- Heading shows Join or Create a Server.
- Privacy screen is not shown first.

## TC-02: Join link modal order

Purpose:
- Ensure invite-room info appears before onboarding.

Steps:
1. Open app via join link format: ?join=ROOMCODE (optionally with #ek=KEY).
2. Observe first modal.
3. Click Accept.

Expected:
- First modal: invite info card (room name, member count, accept/decline).
- After accept: onboarding username step.
- Next step: privacy step.
- No overlapping double modal.

## TC-03: Decline invite should not leak stale join state

Purpose:
- Ensure declined room is not accidentally joined later.

Steps:
1. Open join link for Room A.
2. Click Decline.
3. Manually open Join/Create modal.
4. Create Room B.

Expected:
- User enters Room B.
- User does not connect to Room A.

## TC-04: Default tab should be Join Room

Purpose:
- Ensure default onboarding intent is joining.

Steps:
1. Open onboarding with no prefilled join code.
2. Check selected tab.

Expected:
- Join Room tab is selected by default.

## TC-05: Notification defaults on onboarding

Purpose:
- Ensure onboarding starts with non-invasive notification defaults.

Steps:
1. Reach Privacy & Notifications step.
2. Inspect both switches.

Expected:
- Desktop & push notifications is off by default.
- Message sounds follows current product decision (currently enabled by default in code).

## TC-06: Join without key shows security notice in chat

Purpose:
- Avoid hard-blocking while still warning users.

Steps:
1. Join using room code without key.
2. Enter room.

Expected:
- Join succeeds.
- Chat contains local security notice explaining missing encryption key and asking for full invite link.

## TC-07: Join with key decrypts messages

Purpose:
- Verify encrypted join works end-to-end.

Steps:
1. User A creates room and shares full invite link (?join=ROOM#ek=KEY).
2. User B joins from link.
3. Send message from A to B.

Expected:
- B sees plaintext message content.
- Ciphertext-like blobs are not shown for successfully keyed join.

## TC-08: Floating update button works on onboarding/landing

Purpose:
- Ensure update button remains clickable with modal overlays.

Steps:
1. Go to no-room landing/onboarding state.
2. Click floating circular update button (bottom-right).

Expected:
- Service worker unregister + cache clear flow triggers.
- App reloads.

## Multi-User Checklist

For any two-user test, always validate:

- Both clients in same room id
- Peer count updates on both clients
- Message send/receive in both directions
- No critical console errors (excluding known browser-incognito push limitations)

## Known Non-Blocking Noise

In private/incognito contexts, Chromium may log push subscription limitations. Treat as non-blocking unless push functionality is explicitly under test.

## Regression Set (Minimum)

Run this set before merging onboarding or join-flow changes:

1. TC-01 Add Room starts on Join/Create
2. TC-02 Join link modal order
3. TC-03 Decline does not leak stale join
4. TC-06 Join without key shows notice
5. TC-07 Join with key decrypts
6. TC-08 Update button clickable

## Troubleshooting

If behavior does not match expected:

- Ensure correct port and URL are used.
- Clear p2p-last-room and reload.
- Verify no old tabs are reusing stale app state.
- Re-run with fresh browser contexts.
- Capture console output and include exact flow steps.

## Suggested Future Improvements

- Add a committed Playwright test suite with stable fixtures.
- Add CI smoke run for onboarding/join-link regression set.
- Add explicit test data helpers for room creation and join links.
