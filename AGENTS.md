# Meshipay — Agent runbook

Football group tipping app for the Tether Developers Cup. Combines WDK (self-custodial wallet) and Pears Stack (Hyperswarm P2P).

Human overview, demo flow, and app tabs: [README.md](./README.md).

## Docs (always use versioned sources)

- Expo SDK 54: https://docs.expo.dev/versions/v54.0.0/
- WDK React Native Quickstart: https://docs.wdk.tether.io/start-building/react-native-quickstart
- WDK React Native Starter (reference stack): https://github.com/tetherto/wdk-starter-react-native
- WDK React Native Core API: https://docs.wdk.tether.io/tools/react-native-core/api-reference
- Design spec: `docs/superpowers/specs/2026-07-07-meshipay-dual-track-design.md`

## Target stack (matches WDK starter)

| Package | Version |
|---------|---------|
| Expo SDK | ~54.0.x |
| React Native | 0.81.5 |
| React | 19.1.0 |
| expo-router | ~6.0.x |

**Do not use Expo SDK 57** with WDK until Tether publishes an official upgrade — SDK 57 / RN 0.86 causes `PlatformConstants` crashes.

## Invariants (do not violate)

1. Expo SDK **54** only — not 57
2. Never **Expo Go** — dev client only (`minSdk` 29)
3. `safeModulesVersion: '0.3.0'` in every `ethereum` entry in `src/config/wdk.ts` (see § WDK config trap)
4. Keep `metro.wdk-polyfills.js` — WDK needs Node core polyfills
5. Pin WDK transitive Expo modules via `package.json` `overrides`: `expo-crypto` ~15.x, `expo-local-authentication` ~17.x
6. Lazy-load `react-native-get-random-values` in `_layout.tsx` `useEffect` — never before `expo-router/entry`
7. Do not revert Android native fixes (see table below)

## Architecture

- **WDK:** `WdkAppProvider` → `.wdk-bundle/wdk-worklet.bundle.js` → HRPC worklet (generated types/index in `.wdk/`)
- **P2P:** `src/services/p2p/p2p-room.ts` → `src/services/p2p/p2p-worklet.bundle.js` via `npm run pack:p2p`

## Run workflows

Pick one path — `scripts/run-android.sh` already handles `adb reverse`, `REACT_NATIVE_PACKAGER_HOSTNAME=localhost`, device selection, and (on recover) bundle regen + bare-kit rebuild + clean prebuild.

| What changed | Command | Notes |
|--------------|---------|-------|
| JS/TS only | `npm start` | Open **meshipay** dev client → shake → Reload |
| First clone / fresh device install | `npm install --legacy-peer-deps` then `npm run android:device` | Generates bundles if missing; builds + installs APK |
| Native plugin, `app.json`, or stale native/JS | `npm run android:recover` | Regenerates WDK/P2P bundles, rebuilds bare-kit, clean prebuild, reinstall |
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

## WDK config trap (Sepolia / ERC-4337)

Every `ethereum` entry in `src/config/wdk.ts` **must** include `safeModulesVersion: '0.3.0'`.
Without it, `AddressService.getAddress` fails with:

`Unsupported safe modules version: undefined` → UI shows `Invalid state transition from error to ready`.

See `@tetherto/wdk-wallet-evm-erc-4337` README — only `'0.3.0'` is supported today.

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

## Verification

```bash
npm run verify   # lint + typecheck (src only; CMake build dirs excluded)
```

## Agent behavior

- Read Expo v54 docs before changing native config or `app.json` plugins
- Prefer npm scripts over re-documenting their steps manually
- Keep README.md for humans; keep this file as the agent runbook
