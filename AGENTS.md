# Meshipay — Agent runbook

Decentralized **football-themed local payments & ticketing** for the [Tether Developers Cup](https://dorahacks.io). One app, two roles — **Receiver** (gatekeeper) and **Sender** (fan/payer).

Human overview and demo script: [README.md](./README.md).

---

## Mission

Build a **real-world fan payment + ticket app** where:

- **No Meshipay backend** stores who paid whom or holds ticket inventory.
- **WDK (Tether)** moves **USDT** on-chain — self-custodial wallet, user holds keys.
- **Pears Stack (Hyperswarm P2P)** moves **session + ticket data** encrypted, directly **device ↔ device**.
- **All tickets and receipts** are stored **locally on each phone**.

**Hackathon tracks:** **WDK** (payments) + **Pears Stack** (P2P). Theme: football — stadium gates, watch parties, local club matches, community tournaments.

### Value proposition

| Layer | Job |
|-------|-----|
| **WDK** | Sender pays USDT to receiver’s wallet address |
| **Pear P2P / Hyperswarm** | Pair phones, sync payment intent, transfer ticket payload, receipts — no central server |
| **QR** | Bootstrap only — encodes session topic + receiver wallet + event metadata (replaces manual topic paste) |
| **Local storage** | Sender’s **Tickets** drawer; receiver’s **Attendees / issued tickets** list |

**Do not claim** “100% offline USDT.” Internet is needed for chain settlement and Hyperswarm discovery. **Do claim** “decentralized P2P tickets + self-custodial USDT — no vendor database.”

---

## User flows (target product)

### First launch

1. **Onboarding** (`src/app/index.tsx`) — shown every open until WDK wallet is `READY` (unlocked). Matches `Onboarding-Screen.png` layout; mascot from `onboarding-mascot-crop.png`. GET STARTED → `/home`.
2. User **creates/unlocks WDK wallet** (Sepolia testnet for demo) on `/home`.
3. User picks role: **Receiver** or **Sender** (planned).

### Receiver (gatekeeper)

1. Creates a **session** (generates Hyperswarm `topic` + local ticket offer).
2. Shows **QR code** on screen (encodes `topic`, receiver wallet address, event name, price).
3. Waits for sender to scan and connect (`peerCount` → 1).
4. After WDK payment confirms, **broadcasts ticket** over P2P to sender.
5. **Attendees screen:** local list of people who received tickets (name/address, amount, ticket count, timestamp). Data from P2P events + local reducer — not from a server.

### Sender (payer)

1. Taps **Scan** → camera opens → scans receiver QR.
2. App joins same Hyperswarm **topic** → “Connected” UI.
3. Enters **amount** (e.g. $10 USDT) + **app PIN** (local UX; unlock/confirm payment).
4. **WDK `send()`** pays receiver on-chain.
5. Receives **ticket over P2P** (encrypted swarm channel).
6. **Tickets** tab (bottom nav or **hamburger / drawer** menu) shows owned tickets locally.

### Optional polish (post-MVP)

- **Radar-style** nearby receiver discovery (visual list of peers in same topic or BLE later).
- Sender role switch without reinstalling app.

---

## Dual-track architecture

```
Football UI (Expo Router)
├── WdkAppProvider → .wdk-bundle → HRPC → WDK worklet → Sepolia USDT (payments)
└── p2p-room.ts → bare-ipc → p2p-worklet.bundle.js → Hyperswarm topic (tickets/session)
```

**Split of responsibility (invariants for agents):**

- **Never** send ticket files through WDK — tickets are P2P messages.
- **Never** use a custom backend for ticket sync — use Hyperswarm broadcast + local storage.
- **Always** validate P2P payloads with zod at the IPC boundary (extend `TipPoolEvent` → payment/ticket events).

### Planned P2P event types (evolve from current `TipPoolEvent`)

| Event | Purpose |
|-------|---------|
| `SESSION_CREATED` | Receiver opens gate; includes event label, price, ticket stock |
| `PAYMENT_REQUESTED` | Sender announces amount + sender address |
| `PAYMENT_ACK` | Receiver acknowledges on-chain tx hash |
| `TICKET_TRANSFERRED` | Ticket payload (count, seat/gate, event id) to sender |
| `RECEIPT` | Both sides store matching receipt locally |

Current MVP still uses pool events in `src/features/pools/` — refactor toward the above without breaking WDK/P2P worklets.

### QR payload (bootstrap)

```json
{
  "v": 1,
  "topic": "meshipay-session-<id>",
  "receiverAddress": "0x…",
  "eventLabel": "Club Gate A",
  "priceUsdt": "10.00"
}
```

Scan → `joinRoom(topic)` → encrypted P2P session (see `src/services/p2p/p2p-room.native.ts`).

---

## Design pattern language

**Visual identity:** Dark football-pitch UI — **Neo Brutalism** structure + **Glass UI** accents. Playful mascot, serious crypto/P2P copy. Reference mock: `assets/images/FIFA.png`; onboarding reference: `assets/images/Onboarding-Screen.png`.

### Pattern rules (follow on every new screen)

1. **Build screens in code** — reference PNGs are layout guides only. Never stretch a full mock PNG as the screen background (causes wrong mascot scale, non-interactive overlays, and broken safe areas).
2. **Tokens first** — import colors and shadows from `src/constants/meshipay-brand.ts` (`MeshipayBrand`, `NeoBrutalShadow`). Do not hardcode hex values in screen files.
3. **Reuse primitives** — `NeoBrutalButton` for primary CTAs; `ThemedText` / `ThemedView` for secondary screens until bespoke components exist.
4. **Hard shadows, not blur** — offset black shadows (`shadowRadius: 0`, `shadowOpacity: 1`) or a sibling `View` behind the element. Avoid soft iOS drop shadows.
5. **Borders are loud** — `borderWidth: 2–3`, `borderColor: MeshipayBrand.border` (`#000`).
6. **Corners** — slight radius only (`borderRadius: 10–16`). No pill buttons except segmented controls.
7. **Dark pitch atmosphere** — background `#0B100B`, subtle green pitch lines / honeycomb via decorative layers (`OnboardingBackground` pattern), not busy photo textures.
8. **Mascot assets** — use cropped poses from `MASCOUTS-MESHIPAY.png` (e.g. `onboarding-mascot-crop.png`). One mascot per hero area.
9. **App icon** — `assets/images/football.png` is the canonical logo. Regenerate `icon.png` / adaptive icons if the source changes; rebuild native after `app.json` icon edits.
10. **Light mode** — out of scope. Default `StatusBar` to `light` on dark screens.

### Color tokens (`src/constants/meshipay-brand.ts`)

| Token | Hex | Use |
|-------|-----|-----|
| `background` | `#0B100B` | Screen base, splash, adaptive icon bg |
| `backgroundElevated` | `#141A14` | Cards, inputs |
| `primary` | `#F5D033` | Titles, CTAs, active tab |
| `primaryPressed` | `#E6C020` | Pressed button fill |
| `foreground` | `#FFFFFF` | Body copy |
| `muted` | `#B8C4B8` | Secondary labels |
| `border` | `#000000` | Outlines, shadow blocks |
| `pitchLine` | `#1E3D24` | Field lines, dividers |
| `accentGreen` | `#2D5A34` | Honeycomb, headers |
| `glass` | `rgba(20,26,20,0.72)` | Frosted overlays |

### Typography

| Role | Font (target) | RN fallback today |
|------|---------------|-------------------|
| Display / titles | **Archivo Black** | `fontWeight: '900'`, `textTransform: 'uppercase'`, `letterSpacing: 1–2` |
| Body | **Space Grotesk** | system sans, `fontWeight: '500'` |
| Code / addresses | monospace | `ThemedText type="code"` |

Load Archivo Black + Space Grotesk via `expo-font` in `_layout.tsx` when adding fonts — until then, match weight/size from onboarding (`52px` display, `17px` body).

### Neo-brutal components (copy these patterns)

**Stacked title shadow** (see `onboarding-screen.tsx`):

```tsx
<View style={styles.titleWrap}>
  <Text style={styles.titleShadow}>MESHIPAY</Text>
  <Text style={styles.title}>MESHIPAY</Text>
</View>
// titleShadow: absolute, color border, translateX/Y +3
// title: color primary, fontWeight 900
```

**CTA with hard under-shadow:**

```tsx
<View style={styles.ctaWrap}>
  <View style={styles.ctaShadow} />
  <NeoBrutalButton label="GET STARTED" onPress={...} />
</View>
// ctaShadow: absolute, bottom -5, backgroundColor border, same borderRadius as button
```

**Primary button** — always `NeoBrutalButton` (`src/components/ui/neo-brutal-button.tsx`): yellow fill, black border, uppercase label, press translates `translateY: 3`.

**Glass card** (future screens): `backgroundColor: MeshipayBrand.glass` + `BlurView` underlay on iOS; keep black border and hard shadow.

### Asset map

| File | Agent instruction |
|------|-------------------|
| `Onboarding-Screen.png` | Layout reference — **do not** `require()` as full-screen `Image` background |
| `onboarding-mascot-crop.png` | Onboarding hero mascot |
| `MASCOUTS-MESHIPAY.png` | Source library for new mascot crops |
| `football.png` | App icon + splash source |
| `FIFA.png` | Multi-screen product mock (wallet, tickets, settings, bottom nav) |

### UI routes

| Route / area | Content | Status |
|--------------|---------|--------|
| `index` (`/`) | Onboarding — wallet gate until `READY` | **Done** |
| `home` | Wallet create/unlock WDK | Stub — restyle to FIFA mock |
| Receiver | QR display + attendee list | Planned |
| Sender | Scan → amount → PIN → pay | Planned |
| **Tickets** (drawer / bottom nav) | Sender’s locally stored tickets | Planned |
| Settings | Profile, security, P2P status, logout | Planned |

**Onboarding gate (implemented):** `src/app/index.tsx` shows `OnboardingScreen` until `useWdkApp().state.status === 'READY'`. GET STARTED → `/home` for wallet setup. No AsyncStorage “seen onboarding” flag.

Agents: preserve working WDK + P2P native stack when restyling screens.

---

## Docs (always use versioned sources)

- Expo SDK 54: https://docs.expo.dev/versions/v54.0.0/
- WDK React Native Quickstart: https://docs.wdk.tether.io/start-building/react-native-quickstart
- WDK React Native Starter: https://github.com/tetherto/wdk-starter-react-native
- WDK React Native Core API: https://docs.wdk.tether.io/tools/react-native-core/api-reference
- Pears Stack: https://docs.pears.com/reference/#building-blocks
- RetroUI (design reference): https://retroui.dev/docs/installation
- Legacy design spec: `docs/superpowers/specs/2026-07-07-meshipay-dual-track-design.md` (superseded by § Mission above for product direction)

---

## Target stack (matches WDK starter)

| Package | Version |
|---------|---------|
| Expo SDK | ~54.0.x |
| React Native | 0.81.5 |
| React | 19.1.0 |
| expo-router | ~6.0.x |

**Do not use Expo SDK 57** with WDK until Tether publishes an official upgrade — SDK 57 / RN 0.86 causes `PlatformConstants` crashes.

---

## Invariants (do not violate)

1. Expo SDK **54** only — not 57
2. Never **Expo Go** — dev client only (`minSdk` 29)
3. `safeModulesVersion: '0.3.0'` in every `ethereum` entry in `src/config/wdk.ts` (see § WDK config trap)
4. Keep `metro.wdk-polyfills.js` — WDK needs Node core polyfills
5. Pin WDK transitive Expo modules via `package.json` `overrides`: `expo-crypto` ~15.x, `expo-local-authentication` ~17.x
6. Lazy-load `react-native-get-random-values` in `_layout.tsx` `useEffect` — never before `expo-router/entry`
7. Do not revert Android native fixes (see table below)
8. Pears track: networking via **Hyperswarm** in P2P worklet — not plain WebRTC alone
9. WDK track: real **USDT send** via WDK — not mock “paid” UI

---

## Run workflows

Pick one path — `scripts/run-android.sh` already handles `adb reverse`, `REACT_NATIVE_PACKAGER_HOSTNAME=localhost`, device selection, and (on recover) bundle regen + bare-kit rebuild + clean prebuild.

| What changed | Command | Notes |
|--------------|---------|-------|
| JS/TS only | `npm start` | Open **meshipay** dev client → shake → Reload |
| First clone / fresh device install | `npm install --legacy-peer-deps` then `npm run android:device` | Generates bundles if missing; builds + installs APK |
| Native plugin, `app.json`, or stale native/JS | `npm run android:recover` | Regenerates WDK/P2P bundles, rebuilds bare-kit, clean prebuild, reinstall |
| App icon / splash (`app.json` icon fields) | `npm run android:recover` | Icons are native — prebuild + reinstall required |
| APK already built, native unchanged | `cd android && ./gradlew :app:installDebug` | Fast reinstall only |

Before any Android run: `source scripts/android-env.sh`. Optional: `export ANDROID_SERIAL=<device-id>` when multiple devices are connected.

**Metro (Terminal 1 — leave running for JS dev):**

```bash
source scripts/android-env.sh
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
adb reverse tcp:8081 tcp:8081
npm start
```

**One-time after clone** (if bundles missing and you are not using `android:device` yet):

```bash
npm install --legacy-peer-deps
npm run generate:wdk
npm run pack:p2p
```

**Only when nativehelper sources change** (not part of `android:recover`):

```bash
npm run build:nativehelper
```

---

## WDK config trap (Sepolia / ERC-4337)

Every `ethereum` entry in `src/config/wdk.ts` **must** include `safeModulesVersion: '0.3.0'`.
Without it, `AddressService.getAddress` fails with:

`Unsupported safe modules version: undefined` → UI shows `Invalid state transition from error to ready`.

See `@tetherto/wdk-wallet-evm-erc-4337` README — only `'0.3.0'` is supported today.

---

## Android native fixes (Pixel 8a / 16 KB page size)

Do **not** revert these — they fix worklet SIGSEGV and missing `libnativehelper.so`:

| Fix | Location |
|-----|----------|
| 16 KB `libnativehelper.so` bundled at prebuild | `plugins/withNativeHelperLibs.js` |
| Patched `libbare-kit.so` (JVM attach on worker thread) | `scripts/build-bare-kit-lib.sh`, `patches/bare-kit/` |
| `react-native-bare-kit` postinstall patch | `scripts/patch-bare-kit-android-vm.sh` |
| arm64-only APK (Pixel 8a) | `android/gradle.properties`, `app.json` `buildArchs` |
| Metro ignore bare-kit CMake build dir | `metro.config.js` blockList |

After `npm install`, postinstall re-applies the bare-kit patch. Re-run `npm run build:bare-kit` only when native bare-kit sources or patches change.

---

## Verification

```bash
npm run verify   # lint + typecheck (src only; CMake build dirs excluded)
```

---

## Agent behavior

- Read Expo v54 docs before changing native config or `app.json` plugins
- Prefer npm scripts over re-documenting their steps manually
- Keep README.md for humans; keep this file as the **product mission + agent runbook**
- Read `docs/memory.md` at session start for recent UI/native changes and verification status
- When adding UI, follow **§ Design pattern language** — tokens from `meshipay-brand.ts`, `NeoBrutalButton`, code-built screens (not full mock PNG backgrounds)
- When adding features, preserve WDK/P2P split: **money = WDK, tickets = Hyperswarm P2P**
- Run `npm run verify` before finishing; no unit tests exist yet
- Demo must work on **two physical devices**: receiver QR → sender scan → pay → ticket on sender, attendee on receiver

---

## Demo script (3 min, two phones)

1. **Phone A (Receiver):** unlock wallet → Receiver mode → QR visible.
2. **Phone B (Sender):** unlock wallet → Scan QR → Connected (1 peer).
3. **Sender:** enter $10 → PIN → WDK pay.
4. **Both:** ticket event over P2P; sender sees **Tickets**; receiver sees **Attendees** list.
5. Mention: no central server; Sepolia testnet USDT; Hyperswarm encrypted channel.
