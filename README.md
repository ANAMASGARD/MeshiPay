# Meshipay

Football group tipping for the Tether Developers Cup — combines **WDK** (self-custodial Sepolia wallet) and **Pears Stack** (Hyperswarm P2P fan rooms).

## Prerequisites

- Node.js 18+
- Android SDK with API 29+ emulator or physical device
- Do **not** use Expo Go — this app requires a dev client build

## Setup

See **[AGENTS.md](./AGENTS.md)** for the full agent runbook. Quick start:

```bash
npm install --legacy-peer-deps
npm run android:device
```

That script handles USB port forwarding, device selection, bundle generation when needed, native build, and install. For native/plugin changes use `npm run android:recover`.

**Metro (separate terminal, for JS reload during dev):**

```bash
source scripts/android-env.sh
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
adb reverse tcp:8081 tcp:8081
npm start
```

Open the **meshipay** app on your phone (not Expo Go). Shake → Reload after JS edits.

## App tabs

- **Home** — create/unlock WDK wallet on Sepolia
- **Pools** — create or join Hyperswarm tip rooms, pledge USDT, settle on-chain
- **Explore** — starter info

## Architecture

- `WdkAppProvider` + `.wdk-bundle/wdk-worklet.bundle.js` → WDK HRPC worklet (types in `.wdk/`)
- `p2p-room.ts` + `p2p-worklet.bundle.js` → Hyperswarm topic rooms (lazy-started on Pools tab)

See `docs/superpowers/specs/2026-07-07-meshipay-dual-track-design.md` for full design.

## Demo flow

1. Device A: create wallet → Pools → create "World Cup Final" pool
2. Device B: join same room topic → pledge tip
3. Device A: settle on Sepolia → `TIP_SETTLED` appears on both devices

## External services

- Sepolia RPC: `https://rpc.sepolia.org`
- Candide bundler (public)
- Hyperswarm DHT (decentralized)

## Verification

```bash
npm run verify
```
