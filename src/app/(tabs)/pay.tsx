import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { PaymentConfirmCard } from '@/components/pay/payment-confirm-card';
import { QrScanner } from '@/components/pay/qr-scanner';
import { WalletStatusCard } from '@/components/wallet/wallet-status-card';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { createSepoliaUsdtAsset, usdtToAtomic } from '@/features/tickets/payment-helpers';
import {
  isQrExpired,
  parseQrPayload,
  verifyQrPayload,
  type QrPayload,
} from '@/features/tickets/qr-payload';
import { isSessionPaid, markSessionPaid } from '@/features/tickets/ticket-storage';
import { useTicketsP2P } from '@/features/tickets/tickets-p2p-context';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';
import { getWdkUnavailableMessage } from '@/features/wdk/wdk-status';
import { useUserRole } from '@/hooks/use-user-role';

type PayStep = 'idle' | 'scanning' | 'confirm' | 'pending_transfer';

export default function PayScreen() {
  const { state } = useWdkApp();
  const { address, send } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const { role } = useUserRole();
  const p2p = useTicketsP2P();
  const unavailableMessage = getWdkUnavailableMessage(state);
  const walletReady = state.status === 'READY' && !!address;

  const [step, setStep] = useState<PayStep>('idle');
  const [payload, setPayload] = useState<QrPayload | null>(null);
  const [paying, setPaying] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  const walletStatusLabel =
    state.status === 'READY'
      ? 'Wallet unlocked'
      : unavailableMessage ?? 'Connect your Tether wallet first.';

  useEffect(() => {
    if (!pendingSessionId) {
      return;
    }
    const received = p2p.tickets.find(
      (ticket) => ticket.kind === 'received' && ticket.sessionId === pendingSessionId,
    );
    if (received) {
      markSessionPaid(pendingSessionId).catch(() => undefined);
      setStep('idle');
      setPayload(null);
      setPendingSessionId(null);
      setLastTxHash(null);
      Alert.alert('Ticket received', 'Your ticket is saved in the Tickets tab.');
    }
  }, [p2p.tickets, pendingSessionId]);

  const handleScanResult = useCallback(
    async (raw: string) => {
      const parsed = parseQrPayload(raw);
      if (!parsed) {
        Alert.alert('Invalid QR', 'This QR is not a Meshipay ticket session.');
        setStep('idle');
        return;
      }

      const validHash = await verifyQrPayload(parsed);
      if (!validHash) {
        Alert.alert('Invalid QR', 'QR payload hash mismatch — possible tampering.');
        setStep('idle');
        return;
      }

      if (isQrExpired(parsed)) {
        Alert.alert('Expired QR', 'Ask the receiver to generate a fresh payment QR.');
        setStep('idle');
        return;
      }

      const alreadyPaid = await isSessionPaid(parsed.sessionId);
      if (alreadyPaid) {
        Alert.alert('Already paid', 'This session was already settled.');
        setStep('idle');
        return;
      }

      setPayload(parsed);
      setStep('confirm');
      p2p.joinRoom(parsed.topic);
      p2p.broadcastTicketEvent({
        type: 'HELLO',
        sessionId: parsed.sessionId,
        role: 'sender',
        walletAddress: address ?? 'unknown',
        appVersion: '1.0.0',
      });
      p2p.broadcastTicketEvent({
        type: 'PAYMENT_REQUESTED',
        sessionId: parsed.sessionId,
        senderAddress: address ?? 'unknown',
        amountUsdt: parsed.priceUsdt,
      });
    },
    [address, p2p],
  );

  const handlePay = useCallback(async () => {
    if (!walletReady || !address || !payload) {
      Alert.alert('Wallet required', 'Unlock your wallet before paying.');
      return;
    }

    setPaying(true);
    try {
      const asset = createSepoliaUsdtAsset();
      const amount = usdtToAtomic(payload.priceUsdt, asset.decimals);
      const result = await send({
        to: payload.receiverAddress,
        asset,
        amount,
      });
      const txHash = result.hash ?? 'submitted';
      setLastTxHash(txHash);
      setPendingSessionId(payload.sessionId);

      p2p.broadcastTicketEvent({
        type: 'PAYMENT_SUBMITTED',
        sessionId: payload.sessionId,
        senderAddress: address,
        amountUsdt: payload.priceUsdt,
        txHash,
      });

      setStep('pending_transfer');
      Alert.alert(
        'Payment sent',
        'Sepolia testnet payment submitted. Waiting for ticket transfer over P2P.',
      );
    } catch (error) {
      Alert.alert(
        'Payment failed',
        error instanceof Error ? error.message : 'Unable to send Sepolia USDT.',
      );
    } finally {
      setPaying(false);
    }
  }, [address, payload, p2p, send, walletReady]);

  const canScan = walletReady && role !== 'receiver';

  if (step === 'scanning') {
    return (
      <View style={styles.scannerRoot}>
        <QrScanner
          onScan={(data) => {
            handleScanResult(data).catch(() => undefined);
          }}
          onClose={() => setStep('idle')}
        />
      </View>
    );
  }

  return (
    <PitchScreen>
      <Text style={styles.heading}>PAY</Text>
      <WalletStatusCard status={state.status} address={address} statusLabel={walletStatusLabel} />

      {step === 'confirm' && payload ? (
        <PaymentConfirmCard
          payload={payload}
          peerCount={p2p.peerCount}
          loading={paying}
          onPay={handlePay}
          onCancel={() => {
            setPayload(null);
            setStep('idle');
            p2p.leaveRoom();
          }}
        />
      ) : step === 'pending_transfer' ? (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>TICKET TRANSFER PENDING</Text>
          <Text style={styles.pendingCopy}>
            Payment confirmed on Sepolia. Your ticket will appear in Tickets when the receiver
            transfers it over P2P.
          </Text>
          {lastTxHash ? <Text style={styles.tx}>Tx: {lastTxHash}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setStep('idle');
              setPayload(null);
              setLastTxHash(null);
              setPendingSessionId(null);
            }}
            style={styles.doneBtn}>
            <Text style={styles.doneText}>DONE</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!canScan}
          onPress={() => setStep('scanning')}
          style={[styles.scannerCard, !canScan ? styles.scannerDisabled : null]}>
          <View style={styles.scannerShadow} />
          <View style={styles.scannerBody}>
            <MaterialCommunityIcons name="qrcode-scan" size={72} color={MeshipayBrand.border} />
            <Text style={styles.scannerTitle}>SCAN QR CODE</Text>
            <Text style={styles.scannerCopy}>
              {role === 'receiver'
                ? 'Switch to Sender role to scan and pay.'
                : walletReady
                  ? 'Point your camera at a gate QR. Price auto-fills from the ticket.'
                  : 'Connect your Tether wallet first.'}
            </Text>
          </View>
        </Pressable>
      )}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: MeshipayBrand.foreground,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
  },
  scannerRoot: { flex: 1, backgroundColor: MeshipayBrand.background },
  scannerCard: {
    position: 'relative',
    marginTop: 12,
  },
  scannerDisabled: { opacity: 0.55 },
  scannerShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    top: 5,
    borderRadius: 16,
    backgroundColor: MeshipayBrand.border,
  },
  scannerBody: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 16,
    backgroundColor: MeshipayBrand.cream,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  scannerTitle: {
    color: MeshipayBrand.border,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  scannerCopy: {
    color: MeshipayBrand.border,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.85,
  },
  pendingCard: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 14,
    backgroundColor: MeshipayBrand.backgroundElevated,
    padding: 16,
    gap: 10,
    marginTop: 12,
  },
  pendingTitle: {
    color: MeshipayBrand.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  pendingCopy: {
    color: MeshipayBrand.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tx: {
    color: MeshipayBrand.foreground,
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  doneBtn: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  doneText: {
    color: MeshipayBrand.border,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
