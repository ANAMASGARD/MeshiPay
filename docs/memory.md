# Meshipay — project memory

Session log for agents and humans. Update after meaningful UI, native, or architecture changes.

**Last updated:** 2026-07-08

---

## Verification status

```bash
npm run verify   # lint (expo lint) + typecheck (tsc --noEmit)
```

- **Latest run:** passed — no lint or TypeScript errors.
- **Unit/integration tests:** none configured yet; `verify` is the full automated check today.

---

## Completed work (2026-07-08)

### 1. Onboarding screen (pixel-faithful to reference)

**Goal:** Match `assets/images/Onboarding-Screen.png` without baking the full reference image into the app.

**Implemented:**

| Piece | Path |
|-------|------|
| Screen | `src/components/onboarding/onboarding-screen.tsx` |
| Background (honeycomb + pitch lines) | `src/components/onboarding/onboarding-background.tsx` |
| Entry gate | `src/app/index.tsx` |

**Visual rules enforced:**

- Dark pitch background (`#0B100B`) with subtle green honeycomb mesh and penalty-box lines.
- Yellow **MESHIPAY** title with black offset shadow (neo-brutal stacked text).
- **Cropped mascot only** — `assets/images/onboarding-mascot-crop.png` (from `MASCOUTS-MESHIPAY.png`). Do **not** use full `Onboarding-Screen.png` as a background (mascot is duplicated/wrong scale).
- White centered tagline (4 lines).
- **GET STARTED** via `NeoBrutalButton` + hard black under-shadow.

**Navigation:** GET STARTED → tab shell (`/(tabs)/gate`) once wallet is `READY`.

### 2. Wallet-gated onboarding (replaces one-time flag)

**Old behavior:** `use-onboarding-status.ts` stored `@meshipay/onboarding_complete` in AsyncStorage — onboarding hidden after first tap.

**New behavior:** `src/app/index.tsx` uses `useWdkApp()`:

| WDK status | Index route |
|------------|-------------|
| `INITIALIZING` / `REINITIALIZING` | Loading spinner |
| `READY` | Redirect → `/(tabs)/gate` |
| `NO_WALLET`, `LOCKED`, `UNAVAILABLE`, `ERROR` | `OnboardingScreen` |

User sees onboarding on **every app open** until Tether wallet is unlocked (`READY`). No AsyncStorage skip.

`src/hooks/use-onboarding-status.ts` — **orphaned**, safe to delete if nothing re-imports it.

### 3. App icon & splash (football logo)

**Source asset:** `assets/images/football.png`

**Generated / updated from football.png:**

- `assets/images/icon.png` (1024×1024)
- `assets/images/android-icon-foreground.png`
- `assets/images/android-icon-background.png` (`#0B100B`)
- `assets/images/android-icon-monochrome.png`
- `assets/images/favicon.png`
- `assets/images/splash-icon.png`

**`app.json` changes:**

- Removed default Expo iOS icon (`assets/expo.icon`).
- Android adaptive icon background → `#0B100B`.
- Splash background → `#0B100B`, splash image width → 180.

**Native rebuild required** for launcher icon on device:

```bash
source scripts/android-env.sh
npm run android:recover
```

### 4. Tab navigation shell (PAY · GATE · TICKETS · SETTINGS)

**Routes:** `src/app/(tabs)/`

| Tab | File | Role |
|-----|------|------|
| Pay | `pay.tsx` | Sender scan → confirm → WDK USDT send → P2P ticket receive |
| Gate | `gate.tsx` | Receiver wallet setup, create ticket, ticket offers, attendees |
| Tickets | `tickets.tsx` | Locally stored received tickets |
| Settings | `settings.tsx` | Profile, P2P status, wallet, seed backup, demo controls |

**Layout:** `src/app/(tabs)/_layout.tsx` — swipeable `PagerView` + glass tab bar (`src/components/navigation/glass-tab-bar.tsx`). `BlurView` replaced with translucent `MeshipayBrand.navGlass` View (no `expo-blur` native dep in tab bar).

**Removed:** `src/app/home.tsx` — wallet setup moved into Gate tab + `useWalletSetup` hook.

### 5. Ticket payment workflow (WDK + P2P, no Meshipay backend)

**Architecture invariant:** money = WDK on-chain; tickets = Hyperswarm P2P + AsyncStorage.

| Layer | Path |
|-------|------|
| Ticket types + storage | `src/features/tickets/ticket-types.ts`, `ticket-storage.ts` |
| QR session payloads | `src/features/tickets/qr-payload.ts` (SHA-256 hash, 15 min TTL) |
| Payment orchestration | `src/features/tickets/payment-session.ts` |
| P2P event schemas | `src/features/tickets/ticket-events.ts` |
| Transfer helpers | `src/features/tickets/ticket-transfer.ts` |
| Shared state | `src/features/tickets/tickets-p2p-context.tsx` (`TicketsP2PProvider` in `src/app/_layout.tsx`) |

**Receiver flow:**

1. Gate → **CREATE TICKET** → `src/app/create-ticket.tsx` (`TicketBuilderForm`)
2. Save locally → `src/app/ticket-preview/[ticketId].tsx`
3. **RECEIVE PAYMENT** → `beginPaymentSession()` → `ReceiverSessionCard` with QR

**Sender flow:**

1. Pay → **SCAN QR CODE** → `QrScanner` (`expo-camera`)
2. Validate QR → join Hyperswarm topic → `PaymentConfirmCard`
3. WDK `send()` Sepolia USDT → broadcast `PAYMENT_SUBMITTED` → wait for `TICKET_TRANSFERRED`

**P2P room:** `src/services/p2p/p2p-room.native.ts` parses both `TipPoolEvent` and `TicketEvent` at IPC boundary.

### 6. Code quality refactor (post review)

- **Single P2P/ticket store:** `TicketsP2PProvider` replaces per-screen `useTicketP2P` instances.
- **Payment fulfillment** extracted from screen `useEffect` into `payment-session.ts` + context incremental event processing (`lastEventIndexRef`, `processedPaymentsRef`).
- **Wallet setup** deduplicated into `src/hooks/use-wallet-setup.ts`.
- **Role persistence:** `src/hooks/use-user-role.ts` (AsyncStorage) — still used in Gate/Pay/Settings and P2P context; **planned removal** in demo UI polish.
- Deleted dead `use-local-tickets.ts`.

### 7. QR rendering fix (Metro / react-native-svg)

**Problem:** `react-native-qrcode-svg` pulled `react-native-svg` Fabric `ForeignObjectNativeComponent` → Metro `UnableToResolveError`.

**Fix:**

- Pure-JS QR grid: `src/components/tickets/qr-code-view.tsx` (uses `qrcode` npm package).
- Removed `react-native-qrcode-svg` from dependencies.
- Metro fallback in `metro.wdk-polyfills.js` for `react-native-svg` safety.

### 8. Android 16 KB page size

**Plugin:** `plugins/withAndroid16KbPageSize.js` — NDK 28 + `android.experimental.enable16kPageSize` in `app.json`.

**Requires:** `npm run android:recover` after plugin install.

### 9. Bare-kit build script

`scripts/build-bare-kit-lib.sh` — skips CMake patch if already applied (idempotent `android:recover`).

### 10. Shared UI primitives (reuse on new screens)

| Component / token | Path |
|-------------------|------|
| Brand colors + shadows | `src/constants/meshipay-brand.ts` |
| Neo-brutal CTA button | `src/components/ui/neo-brutal-button.tsx` |
| Neo-brutal section / role / menu rows | `neo-brutal-section-button.tsx`, `neo-brutal-role-button.tsx`, `neo-brutal-menu-row.tsx` |
| Wallet status + Sepolia badge | `src/components/wallet/wallet-status-card.tsx`, `sepolia-badge.tsx` |
| Pitch screen wrapper | `src/components/layout/pitch-screen.tsx` |
| Splash overlay mascot | `src/components/animated-icon.tsx` |

---

## Design reference assets (do not misuse)

| Asset | Use |
|-------|-----|
| `Onboarding-Screen.png` | **Layout reference only** — build screens in code |
| `MASCOUTS-MESHIPAY.png` | Mascot library — crop poses as needed |
| `onboarding-mascot-crop.png` | Onboarding hero (pointing pose) |
| `football.png` | App icon, splash, favicon |
| `FIFA.png` | Multi-screen UI mock reference for future routes |

---

## Next task (approved plan — not yet implemented)

**Demo UI polish** — hide testnet/WDK/role chrome for demo presentation:

- Remove `SepoliaBadge` and "fake USDT" / "WDK" copy from main tabs; keep Sepolia backend.
- Rebrand wallet setup as **Connect Tether Wallet** on Pay + Settings (`WalletConnectButton`).
- Gate: remove Sender/Receiver picker; always show Create Ticket + ticket list + attendees.
- Gate list: inline **RECEIVE PAYMENT** → full-screen QR modal.
- Pay: remove role gate on scan; scan-first layout.
- Ticket creation: `expo-image-picker` cover image, duration selector, stable ticket QR at creation.
- P2P context: fulfill payments by local issued-ticket match, not `useUserRole`.
- Session hardening: persist sessions, refresh QR after partial sale.

Plan file: `.cursor/plans/demo_ui_polish_5cb0b7be.plan.md`

---

## Commands cheat sheet

| Task | Command |
|------|---------|
| Verify codebase | `npm run verify` |
| JS dev reload | `npm start` |
| Fresh Android install | `npm run android:device` |
| Icon / native config change | `npm run android:recover` |
| After computer restart | `source scripts/android-env.sh && adb reverse tcp:8081 tcp:8081 && npm start` |

**Two-device demo:** Phone A Gate → create ticket → receive payment QR. Phone B Pay → scan → pay → ticket in Tickets tab; attendee on Gate.
