# Meshipay — project memory

Current engineering handoff for the WDK-only ticket-payment gateway.

**Last updated:** 2026-07-13 12:36 IST

---

## Current product state

- **Track:** Tether WDK. The app is a decentralized football ticket-payment gateway; it has no Meshipay backend and no Hyperswarm/P2P runtime.
- **Settlement:** Sender uses WDK ERC-4337 to send Candide Sepolia mock USD₮ to the receiver wallet.
- **Ticket delivery:** Receiver creates an encrypted, hash-verified payment QR. Sender scans it locally, sees the ticket data, pays, and mints a local ticket only after WDK returns a transaction hash.
- **Receiver fulfillment:** The receiver polls Sepolia mock-USDT `Transfer` logs from the QR session's start block; on matching receiver and exact amount, it saves an attendee locally.
- **Storage:** Tickets, payment sessions, and attendees are stored in AsyncStorage on their respective phones. No central ticket inventory or payment database exists.
- **Persona shell:** The app uses an explicit `choose-mode` step, then keeps the active shell role-specific. Fan tabs are `Pay`, `Tickets`, `Map`, `Settings`. Club tabs are `Gate`, `Verify`, `Issued`, `Settings`. `Settings` stays rightmost in both shells.
- **Map tab:** `Map` is currently a placeholder route for future Mapbox work. It does not request location access or render a live map yet.

## Critical WDK configuration

- **Expo / RN:** Expo SDK 54, React Native 0.81.5, React 19.1.0. Do not upgrade to SDK 57.
- **Network:** Ethereum Sepolia, chain ID `11155111`.
- **Mock USD₮ contract:** `0xd077a400968890eacc75cdc901f0356c943e4fdb`.
- **Bundler / paymaster:** Candide public v3 endpoints; Safe modules version must remain `'0.3.0'`.
- **Fee mode:** paymaster-token mode. Sender needs mock USD₮ for ticket price plus network fee; Sepolia ETH is not required for the intended demo path.
- **Demo ceiling:** `SEPOLIA_DEMO_TRANSFER_MAX_FEE_ATOMIC = 20_000_000` (20 test USD₮) in `src/config/wdk.ts`. It is intentionally testnet-only and is applied by both WDK and Meshipay preflight.
- **Fee boundary:** WDK rejects fee quotes `>= transferMaxFee`; Meshipay preflight matches that condition exactly, preventing an avoidable WDK submission failure.

## Payment flow

1. Receiver creates a ticket and opens **Receive Payment** on Gate.
2. The payment QR contains the full encrypted ticket envelope, receiver wallet, price, session ID, expiry, and integrity data.
3. Sender scans from Pay. Ticket-offer display QRs are rejected; only payment QRs are accepted.
4. Sender presses **Pay & Unlock Ticket**. The app performs balance and `quoteTransfer()` preflight, then displays the exact network-fee quote.
5. Sender confirms. `sendSepoliaUsdtPayment()` calls WDK `send()` for a real ERC-4337 USDT transfer.
6. Only a successful WDK result with `hash` mints the sender's ticket. A failed or absent hash does not create one.
7. Receiver chain watcher sees the matching USDT Transfer log, writes the attendee, and shows **Payment verified**.

## Important source files

| Area | Path |
|---|---|
| WDK configuration | `src/config/wdk.ts` |
| WDK provider / lazy polyfills | `src/features/wdk/wdk-provider.native.tsx` |
| Payment preflight and send | `src/features/tickets/payment-send.ts` |
| USDT asset, balance, fee helpers | `src/features/tickets/payment-helpers.ts` |
| Sender state machine | `src/hooks/use-payment-flow.ts` |
| Payment QR parsing/encryption | `src/features/tickets/qr-payload.ts`, `qr-crypto.ts` |
| Local ticket mint/proof | `src/features/tickets/ticket-mint.ts`, `ticket-proof.ts` |
| Receiver chain watcher | `src/features/tickets/chain-payment-watcher.ts`, `src/hooks/use-receiver-chain-watcher.ts` |
| Local ticket/session storage | `src/features/tickets/tickets-context.tsx`, `ticket-storage.ts` |

## Verification and release

- `npm run verify` passed on 2026-07-13: Expo lint, TypeScript, and **42 Vitest tests**.
- Tests cover payment preflight/send, a 20 USD₮ ticket with a 0.25 USD₮ fee, QR validation/encryption, payment sessions, treasury swap helpers, wallet utilities, and the role-specific nav shell.
- WDK bundle regenerated successfully on 2026-07-13.
- Standalone release APK had a successful build on 2026-07-13. Rebuild it before demoing if you need a binary that matches the latest JS changes.

## Commands

```bash
npm run verify
npm start
npm run android:device
npm run android:recover
npm run android:standalone-apk
```

`android:standalone-apk` creates the shareable APK with the JavaScript bundle embedded; it does not need Metro after installation. Use `android:recover` only after native, plugin, or app-config changes.

## Physical-device verification still required

The build and automated checks are complete, but the final external proof must happen on two real phones:

1. Fund sender with more than `20 USD₮ + displayed WDK fee` from the Candide Sepolia faucet.
2. Receiver opens a 20 USD₮ payment QR.
3. Sender scans, reviews the exact fee, approves, and receives a local ticket with the real transaction hash.
4. Receiver waits for the Sepolia `Transfer` log and confirms the attendee appears.

Do not describe the app as “100% offline USDT.” QR transfer and local ticket storage are device-local; blockchain settlement and receiver verification require internet.
