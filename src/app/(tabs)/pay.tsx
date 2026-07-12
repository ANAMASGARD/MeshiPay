import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { PaymentConfirmCard } from '@/components/pay/payment-confirm-card';
import { QrScanner } from '@/components/pay/qr-scanner';
import { MeshipayLoadingOverlay } from '@/components/ui/meshipay-loading-overlay';
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';
import { usePaySwipeLock } from '@/hooks/use-pay-swipe-lock';
import { usePaymentFlow } from '@/hooks/use-payment-flow';

export default function PayScreen() {
  const isFocused = useIsFocused();
  const { setLocked } = usePaySwipeLock();
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const walletReady = state.status === 'READY' && !!address;
  const [scanKey, setScanKey] = useState(0);

  const {
    step,
    setStep,
    payload,
    paying,
    payStageLabel,
    joining,
    handleScanResult,
    handlePay,
    cancelConfirm,
  } = usePaymentFlow(walletReady);

  useEffect(() => {
    setLocked(step !== 'idle');
  }, [setLocked, step]);

  useEffect(() => {
    if (!isFocused && step === 'scanning') {
      setStep('idle');
    }
  }, [isFocused, setStep, step]);

  if (step === 'scanning' && isFocused) {
    return (
      <View style={styles.scannerRoot}>
        <QrScanner
          key={scanKey}
          onScan={(data) => {
            void handleScanResult(data).then((ok) => {
              if (!ok) {
                setScanKey((value) => value + 1);
              }
            });
          }}
          onClose={() => setStep('idle')}
        />
        <MeshipayLoadingOverlay visible={joining} label="READING QR" />
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
          walletReady={walletReady}
          loading={paying}
          payStageLabel={payStageLabel}
          onPay={handlePay}
          onCancel={cancelConfirm}
        />
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
                ? 'Scan a gate payment QR, pay with Tether Wallet, ticket saves locally.'
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
});
