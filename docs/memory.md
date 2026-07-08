# Meshipay — project memory

Session log for agents and humans. Update after meaningful UI, native, or architecture changes.

**Last updated:** 2026-07-08

---

## Verification status

```bash
npm run verify   # lint (expo lint) + typecheck (tsc --noEmit)
```

- **Latest run:** passed — no lint or TypeScript errors.
- **Native rebuild:** required after `expo-image-picker` install → `npm run android:recover`
- **Unit/integration tests:** none configured yet.

---

## Git milestones

| Commit | Summary |
|--------|---------|
| `70c81e8` | Ticket payment workflow — tab nav, P2P session QR, TicketsP2PProvider |
| *(this branch)* | Demo UI polish v2 — hide testnet/role chrome, session-derived P2P, wallet connect, ticket images |

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
| P2P + ticket store | `src/features/tickets/tickets-p2p-context.tsx` |
| Session / fulfill | `src/features/tickets/payment-session.ts` |
| Event reducer | `src/features/tickets/ticket-event-handler.ts` |
| Pay flow hook | `src/hooks/use-payment-flow.ts` |
| Wallet connect | `src/components/wallet/wallet-connect-button.tsx` |
| Receive payment QR | `src/components/receiver/payment-qr-modal.tsx` |
| QR payloads | `src/features/tickets/qr-payload.ts` |
| Ticket image pick | `src/features/tickets/ticket-image.ts` |

---

## Architecture invariants

- Money = WDK on-chain; tickets = Hyperswarm P2P messages; no Meshipay backend.
- Payment QR = `meshipay-ticket-session` (15 min TTL, scanned on Pay tab).
- Offer QR = `meshipay-ticket-offer` (display at creation, not scannable for pay).
- Shared state: `TicketsP2PProvider` in `src/app/_layout.tsx`.

---

## Commands cheat sheet

| Task | Command |
|------|---------|
| Verify codebase | `npm run verify` |
| Metro dev (Terminal 1) | `source scripts/android-env.sh && export REACT_NATIVE_PACKAGER_HOSTNAME=localhost && adb reverse tcp:8081 tcp:8081 && npm start` |
| After image-picker / native plugin | `npm run android:recover` |
| Fresh Android install | `npm run android:device` |

**Two-device demo:** Gate → Connect wallet → Create ticket → Receive Payment QR. Pay → Connect wallet → Scan → pay → ticket in Tickets; attendee on Gate.
