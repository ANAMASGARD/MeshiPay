import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ReceiverSessionCard } from '@/components/receiver/receiver-session-card';
import { MeshipayInlineLoader } from '@/components/ui/meshipay-inline-loader';
import { MeshipayLoadingOverlay } from '@/components/ui/meshipay-loading-overlay';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { isQrExpired, parseQrPayload } from '@/features/tickets/qr-payload';
import type { TicketRecord } from '@/features/tickets/ticket-types';
import { useTicketsP2P } from '@/features/tickets/tickets-p2p-context';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';

type PaymentQrModalProps = {
  visible: boolean;
  ticket: TicketRecord;
  onClose: () => void;
};

export function PaymentQrModal({ visible, ticket, onClose }: PaymentQrModalProps) {
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const p2p = useTicketsP2P();

  const [qrString, setQrString] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState(ticket);
  const [starting, setStarting] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [now, setNow] = useState(Date.now());

  const walletReady = state.status === 'READY' && !!address;

  useEffect(() => {
    setActiveTicket(ticket);
    if (ticket.qrPayload && ticket.sessionId) {
      setQrString(ticket.qrPayload);
      setSessionId(ticket.sessionId);
      setQrReady(true);
    } else {
      setQrString(null);
      setSessionId(null);
      setQrReady(false);
    }
  }, [ticket]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!qrString) {
      setQrReady(false);
      return;
    }
    setQrReady(false);
    const frame = requestAnimationFrame(() => {
      parseQrPayload(qrString);
      setQrReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [qrString]);

  const parsedQr = qrString ? parseQrPayload(qrString) : null;
  const expired = parsedQr ? isQrExpired(parsedQr, now) : false;

  const startSession = useCallback(async () => {
    if (!walletReady || !address) {
      Alert.alert('Wallet required', 'Connect your wallet before receiving payments.');
      return;
    }
    if (activeTicket.remainingQuantity <= 0) {
      Alert.alert('Sold out', 'No tickets remaining for this offer.');
      return;
    }

    setStarting(true);
    setQrReady(false);
    try {
      const started = await p2p.beginPaymentSession(
        activeTicket,
        activeTicket.priceUsdt,
        address,
      );
      setActiveTicket(started.ticket);
      setQrString(started.qrString);
      setSessionId(started.ticket.sessionId ?? null);
    } catch (error) {
      Alert.alert(
        'Session failed',
        error instanceof Error ? error.message : 'Unable to start payment session.',
      );
    } finally {
      setStarting(false);
    }
  }, [activeTicket, address, p2p, walletReady]);

  const remainingMs = parsedQr ? Math.max(0, parsedQr.expiresAt - now) : 0;
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  const showOverlay = starting || p2p.busyMessage === 'GENERATING QR';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.heading}>RECEIVE PAYMENT</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>

        {!qrString || expired ? (
          <View style={styles.startWrap}>
            <Text style={styles.event}>{activeTicket.eventName}</Text>
            <Text style={styles.price}>{activeTicket.priceUsdt} USDT</Text>
            {expired ? (
              <Text style={styles.expiredCopy}>Previous QR expired. Generate a fresh one.</Text>
            ) : null}
            <NeoBrutalButton
              label={expired ? 'REGENERATE QR' : 'SHOW PAYMENT QR'}
              disabled={!walletReady || starting}
              onPress={startSession}
            />
          </View>
        ) : (
          <>
            <Text style={styles.timer}>
              Expires in {remainingMin}:{remainingSec.toString().padStart(2, '0')}
            </Text>
            {qrReady ? (
              <ReceiverSessionCard
                ticket={activeTicket}
                qrPayload={qrString}
                peerCount={p2p.peerCount}
                sessionId={sessionId ?? ''}
              />
            ) : (
              <View style={styles.qrLoaderWrap}>
                <MeshipayInlineLoader label="GENERATING QR" height={280} />
              </View>
            )}
            <NeoBrutalButton
              label="REGENERATE QR"
              variant="secondary"
              disabled={starting}
              onPress={startSession}
            />
          </>
        )}
      </View>

      <MeshipayLoadingOverlay visible={showOverlay} label="GENERATING QR" />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MeshipayBrand.background,
    padding: 20,
    paddingTop: 48,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: {
    color: MeshipayBrand.foreground,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: MeshipayBrand.backgroundElevated,
  },
  closeText: {
    color: MeshipayBrand.foreground,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  startWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  event: {
    color: MeshipayBrand.foreground,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  price: {
    color: MeshipayBrand.primary,
    fontSize: 28,
    fontWeight: '900',
  },
  expiredCopy: {
    color: MeshipayBrand.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  timer: {
    color: MeshipayBrand.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  qrLoaderWrap: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 16,
    backgroundColor: MeshipayBrand.backgroundElevated,
    marginBottom: 8,
  },
});
