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

**Navigation:** GET STARTED → `router.replace('/home')` for wallet create/unlock.

### 2. Wallet-gated onboarding (replaces one-time flag)

**Old behavior:** `use-onboarding-status.ts` stored `@meshipay/onboarding_complete` in AsyncStorage — onboarding hidden after first tap.

**New behavior:** `src/app/index.tsx` uses `useWdkApp()`:

| WDK status | Index route |
|------------|-------------|
| `INITIALIZING` / `REINITIALIZING` | Loading spinner |
| `READY` | Redirect → `/home` |
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

### 4. Shared UI primitives (reuse on new screens)

| Component / token | Path |
|-------------------|------|
| Brand colors + shadows | `src/constants/meshipay-brand.ts` |
| Neo-brutal CTA button | `src/components/ui/neo-brutal-button.tsx` |
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

## Next likely tasks

- Wallet create/unlock screen styled like FIFA mock (Screen 2).
- Role picker: Sender vs Receiver after `READY`.
- Receiver QR + Sender scan flows.
- Tickets drawer / bottom nav (PAY, GATE, TICKETS, SETTINGS).
- Load **Archivo Black** + **Space Grotesk** via `expo-font` (tokens exist; fonts not bundled yet).

---

## Commands cheat sheet

| Task | Command |
|------|---------|
| Verify codebase | `npm run verify` |
| JS dev reload | `npm start` |
| Fresh Android install | `npm run android:device` |
| Icon / native config change | `npm run android:recover` |
