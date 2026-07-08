import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { ReceiverSessionCard } from '@/components/receiver/receiver-session-card';
import { TicketPreviewCard } from '@/components/tickets/ticket-preview-card';
import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { getTicketById } from '@/features/tickets/ticket-storage';
import type { TicketRecord } from '@/features/tickets/ticket-types';
import { useTicketsP2P } from '@/features/tickets/tickets-p2p-context';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';

export default function TicketPreviewScreen() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const p2p = useTicketsP2P();

  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [qrString, setQrString] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const walletReady = state.status === 'READY' && !!address;

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    getTicketById(ticketId)
      .then((loaded) => {
        if (!loaded) {
          Alert.alert('Ticket not found', 'This ticket offer no longer exists.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        setTicket(loaded);
        setPriceDraft(loaded.priceUsdt);
        if (loaded.qrPayload) {
          setQrString(loaded.qrPayload);
          setSessionId(loaded.sessionId ?? null);
        }
      })
      .catch(() => undefined);
  }, [router, ticketId]);

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    const updated = p2p.tickets.find((item) => item.ticketId === ticketId);
    if (updated) {
      setTicket(updated);
    }
  }, [p2p.tickets, ticketId]);

  const handleStartSession = useCallback(async () => {
    if (!walletReady || !address || !ticket) {
      Alert.alert('Wallet required', 'Unlock your wallet before receiving payments.');
      return;
    }

    if (ticket.remainingQuantity <= 0) {
      Alert.alert('Sold out', 'No tickets remaining for this offer.');
      return;
    }

    setStarting(true);
    try {
      const started = await p2p.beginPaymentSession(ticket, priceDraft.trim() || ticket.priceUsdt, address);
      setTicket(started.ticket);
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
  }, [address, p2p, priceDraft, ticket, walletReady]);

  if (!ticket) {
    return (
      <PitchScreen>
        <Text style={styles.loading}>Loading ticket...</Text>
      </PitchScreen>
    );
  }

  return (
    <PitchScreen>
      <Text style={styles.heading}>TICKET PREVIEW</Text>
      <TicketPreviewCard ticket={ticket} />

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>PRICE (USDT)</Text>
        <TextInput
          style={styles.priceInput}
          value={priceDraft}
          onChangeText={setPriceDraft}
          keyboardType="decimal-pad"
          editable={!qrString}
        />
      </View>

      {!qrString ? (
        <NeoBrutalButton
          label="RECEIVE PAYMENT"
          disabled={!walletReady || starting}
          onPress={handleStartSession}
        />
      ) : (
        <ReceiverSessionCard
          ticket={ticket}
          qrPayload={qrString}
          peerCount={p2p.peerCount}
          sessionId={sessionId ?? ''}
        />
      )}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: MeshipayBrand.foreground,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
  },
  loading: {
    color: MeshipayBrand.muted,
    textAlign: 'center',
    marginTop: 40,
  },
  priceRow: { marginVertical: 12, gap: 6 },
  priceLabel: {
    color: MeshipayBrand.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  priceInput: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.backgroundElevated,
    color: MeshipayBrand.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '900',
  },
});
