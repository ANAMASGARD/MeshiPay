import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { PaymentConfirmCard } from '@/components/pay/payment-confirm-card';
import { QrScanner } from '@/components/pay/qr-scanner';
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';
import { usePaymentFlow } from '@/hooks/use-payment-flow';

export default function PayScreen() {
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const walletReady = state.status === 'READY' && !!address;

  const {
    step,
    setStep,
    payload,
    paying,
    lastTxHash,
    peerCount,
    handleScanResult,
    handlePay,
    resetFlow,
    cancelConfirm,
  } = usePaymentFlow(walletReady);

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

      {!walletReady ? <WalletConnectButton /> : null}

      {step === 'confirm' && payload ? (
        <PaymentConfirmCard
          payload={payload}
          peerCount={peerCount}
          loading={paying}
          onPay={handlePay}
          onCancel={cancelConfirm}
        />
      ) : step === 'pending_transfer' ? (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>TICKET TRANSFER PENDING</Text>
          <Text style={styles.pendingCopy}>
            Payment confirmed. Your ticket will appear in Tickets when the gatekeeper transfers it.
          </Text>
          {lastTxHash ? <Text style={styles.tx}>Tx: {lastTxHash}</Text> : null}
          <Pressable accessibilityRole="button" onPress={resetFlow} style={styles.doneBtn}>
            <Text style={styles.doneText}>DONE</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!walletReady}
          onPress={() => setStep('scanning')}
          style={[styles.scannerCard, !walletReady ? styles.scannerDisabled : null]}>
          <View style={styles.scannerShadow} />
          <View style={styles.scannerBody}>
            <MaterialCommunityIcons name="qrcode-scan" size={72} color={MeshipayBrand.border} />
            <Text style={styles.scannerTitle}>SCAN QR CODE</Text>
            <Text style={styles.scannerCopy}>
              {walletReady
                ? 'Tap to open camera and scan a payment QR from the gate.'
                : 'Connect your wallet to scan and pay.'}
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
