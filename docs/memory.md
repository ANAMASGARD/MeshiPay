# Meshipay — project memory

Session log for agents and humans. Update after meaningful UI, native, or architecture changes.

**Last updated:** 2026-07-08 (demo APK + swipe tabs + payment hardening)

---

## Verification status

```bash
npm run verify   # lint (expo lint) + typecheck (tsc --noEmit)
```

- **Latest run:** passed — swipe tabs, pay swipe-lock, SESSION_CREATED re-broadcast.
- **Release APK:** `android/app/build/outputs/apk/release/app-release.apk` (standalone, no Metro).
- **Native rebuild:** `npm run android:recover` after plugin / icon / native changes.
- **Unit/integration tests:** none configured yet.

---

## Git milestones

| Commit | Summary |
|--------|---------|
| `70c81e8` | Ticket payment workflow — tab nav, P2P session QR, TicketsP2PProvider |
| `0d60740` | Demo UI polish — session-derived P2P, wallet connect |
| `18e0cf6` | Loading dots, slim QR, swipe tabs, payment re-broadcast, README/APK docs |

---

## Completed work (2026-07-08 — loading dots + performance)

### Yellow 3-dot loaders

- **`MeshipayDotsLoader`** — Reanimated staggered bounce, `MeshipayBrand.primary`.
- **`MeshipayInlineLoader`** — fixed-height inline placeholder.
- **`MeshipayLoadingOverlay`** — full-screen dim + label for long ops.
- Wired across Gate, Pay, Tickets, wallet connect, create-ticket, payment QR modal, WDK init.
- `TicketsP2PProvider.busyMessage` during session start/join.

### QR performance

- **`QrCodeView`** — `react-native-svg` + run-length encoded rects (replaces 625 View cells).
- **Slim payment QR** — bootstrap fields only in QR; display metadata via extended `SESSION_CREATED` P2P event.
- **SESSION_CREATED re-broadcast** — receiver re-sends session metadata when sender `HELLO` / `PAYMENT_REQUESTED` arrives (P2P has no replay).
- **UPI-style confirm** — amount + payee from hash-verified QR immediately; pay enabled once peer connected (details hydrate async).
- **Legacy full QR** still parses/verifies for backward compatibility.
- **`TicketCard`** list rows — static QR icon stub (no matrix encode on tab open).
- Cover thumbnails: `expo-image` `cachePolicy="memory-disk"`.
- **Swipe tabs** — `@react-navigation/material-top-tabs` + existing `react-native-pager-view`; swipe Gate ↔ Pay ↔ Tickets ↔ Settings; bottom `GlassTabBar` syncs on swipe.
- Memoized `TicketOfferList`, `TicketCard`, `OnboardingBackground`; FlatList for gate ticket rows; lazy tab screens.

### Pay flow hardening (post-review)

- **`SESSION_CREATED` re-broadcast** when receiver sees sender `HELLO` / `PAYMENT_REQUESTED` (P2P no-replay fix).
- **`usePaySwipeLock`** — disables Pay tab swipe during scan/confirm/pay; camera unmounts when tab blurred.
- **`activeSessionRef`** updated synchronously on join/begin session.

### Design spec

- `docs/superpowers/specs/2026-07-08-loading-dots-perf-design.md`

---

## Completed work (2026-07-08 — demo UI polish v2)

### Goal

Demo-ready UX: no visible Sepolia/WDK/role picker on main tabs. Backend unchanged (Sepolia WDK USDT + Hyperswarm P2P + AsyncStorage).

### Demo-ready UI

- Removed `SepoliaBadge`, "WDK WALLET", Sender/Receiver role picker from Gate/Pay/Settings.
- **`WalletConnectButton`** — WDK-backed "Connect Tether Wallet" + import (`src/components/wallet/wallet-connect-button.tsx`).
- **`WalletStatusCard`** — presentational; title **WALLET**, no testnet badge.
- Pay/Settings: full connect flow; Gate: compact banner only when wallet not ready.

### Session-derived P2P role (replaces `useUserRole`)

- **Deleted:** `src/hooks/use-user-role.ts`, `src/components/ui/neo-brutal-role-button.tsx`.
- `TicketsP2PProvider` tracks `activeSession: { sessionId, role }`:
  - `beginPaymentSession()` → `receiver`
  - `joinPaymentSessionAsSender()` → `sender`
- Event routing: `src/features/tickets/ticket-event-handler.ts` (pure reducer).

### Payment session consolidation

- `payment-session.ts`: `validateAndJoinSession`, `canFulfillPayment`, `sessionBootstrapEvents` via `startPaymentSession`, post-sale QR field clear, `SESSIONS_KEY` persistence.
- `usePaymentFlow` hook — Pay tab state machine extracted from screen.

### Gate receiver-first

- Heading **GATE** only; always shows Create Ticket + Your Tickets + Attendees.
- **`TicketOfferList`**: cover thumbnail, **VIEW** + **RECEIVE PAYMENT** per row.
- **`PaymentQrModal`**: full-screen payment QR, expiry countdown, regenerate.

### Pay scan-first

- Large **SCAN QR CODE** button → camera on press.
- No role gate; rejects ticket-offer QRs with clear error.
- User strings scrubbed ("Payment sent", "USDT" — no Sepolia).

### Ticket creation enhancements

- **`expo-image-picker`** + `app.json` plugin for cover upload.
- Duration selector (1h/2h/3h) on `TicketBuilderForm`.
- **`meshipay-ticket-offer`** QR at creation (`buildTicketOfferQr`); stored as `ticketQrPayload`.
- P2P `TICKET_TRANSFERRED` schema includes optional `imageUri`.

### Metro stability fix

- `metro.config.js`: blockList `plugins/nativehelper-lib/build/` — prevents Metro watcher crash (`ENOENT` on CMake `Progress` dirs during native rebuilds).

### Design spec

- `docs/superpowers/specs/2026-07-08-demo-ui-polish-design.md`

---

## Key files (post polish)

| Area | Path |
|------|------|
| Loading UI | `src/components/ui/meshipay-dots-loader.tsx`, `meshipay-inline-loader.tsx`, `meshipay-loading-overlay.tsx` |
| P2P + ticket store | `src/features/tickets/tickets-p2p-context.tsx` |
| Session / fulfill | `src/features/tickets/payment-session.ts` |
| Event reducer | `src/features/tickets/ticket-event-handler.ts` |
| Pay flow hook | `src/hooks/use-payment-flow.ts` |
| Wallet connect | `src/components/wallet/wallet-connect-button.tsx` |
| Receive payment QR | `src/components/receiver/payment-qr-modal.tsx` |
| QR render + payload | `src/components/tickets/qr-code-view.tsx`, `src/features/tickets/qr-payload.ts` |
| Ticket image pick | `src/features/tickets/ticket-image.ts` |

---

## Architecture invariants

- Money = WDK on-chain; tickets = Hyperswarm P2P messages; no Meshipay backend.
- Payment QR = `meshipay-ticket-session` slim bootstrap (15 min TTL); display fields from P2P `SESSION_CREATED`.
- Offer QR = `meshipay-ticket-offer` (display at creation, not scannable for pay).
- Shared state: `TicketsP2PProvider` in `src/app/_layout.tsx`.

---

## Commands cheat sheet

| Task | Command |
|------|---------|
| Verify codebase | `npm run verify` |
| Metro dev (Terminal 1) | `source scripts/android-env.sh && export REACT_NATIVE_PACKAGER_HOSTNAME=localhost && adb reverse tcp:8081 tcp:8081 && npm start` |
| USB dev install | `npm run android:device` |
| After native/plugin change | `npm run android:recover` |
| Standalone release APK | `npm run generate:wdk && npm run pack:p2p && npm run build:bare-kit && npx expo prebuild --clean --platform android && cd android && ./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk` |

**Two-device demo:** Gate → Connect wallet → Create ticket → Receive Payment QR. Pay → Connect wallet → Scan → pay → ticket in Tickets; attendee on Gate.
