import { useState } from 'react';
import { Alert, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { QrCodeView } from '@/components/tickets/qr-code-view';
import { TicketCard } from '@/components/tickets/ticket-card';
import { MeshipayInlineLoader } from '@/components/ui/meshipay-inline-loader';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { shortAddress } from '@/features/tickets/payment-helpers';
import type { TicketRecord } from '@/features/tickets/ticket-types';
import { useTickets } from '@/features/tickets/tickets-context';

type TicketTab = 'received' | 'issued';

function shareReceipt(ticket: TicketRecord) {
  const lines = [
    `Meshipay Ticket — ${ticket.eventName}`,
    `${ticket.homeTeam} vs ${ticket.awayTeam}`,
    `Price: ${ticket.priceUsdt} USDT`,
    ticket.txHash ? `Tx: ${ticket.txHash}` : null,
    ticket.receiptId ? `Receipt: ${ticket.receiptId}` : null,
    `Check-in: ${ticket.checkInCode}`,
  ].filter(Boolean);

  Share.share({ message: lines.join('\n') }).catch(() => undefined);
}

export default function TicketsScreen() {
  const { tickets, loading } = useTickets();
  const [activeTab, setActiveTab] = useState<TicketTab>('received');
  const [verificationQr, setVerificationQr] = useState<string | null>(null);

  const filtered = tickets.filter((ticket) =>
    activeTab === 'received' ? ticket.kind === 'received' : ticket.kind === 'issued',
  );

  return (
    <PitchScreen>
      <Text style={styles.heading}>TICKETS</Text>

      <View style={styles.toggleWrap}>
        <View style={styles.toggleShadow} />
        <View style={styles.toggle}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'received' }}
            onPress={() => setActiveTab('received')}
            style={[styles.toggleBtn, activeTab === 'received' ? styles.toggleBtnActive : null]}>
            <Text
              style={[
                styles.toggleLabel,
                activeTab === 'received' ? styles.toggleLabelActive : null,
              ]}>
              RECEIVED
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'issued' }}
            onPress={() => setActiveTab('issued')}
            style={[styles.toggleBtn, activeTab === 'issued' ? styles.toggleBtnActive : null]}>
            <Text
              style={[
                styles.toggleLabel,
                activeTab === 'issued' ? styles.toggleLabelActive : null,
              ]}>
              ISSUED
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <MeshipayInlineLoader label="LOADING TICKETS" height={120} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>
          No {activeTab === 'received' ? 'received' : 'issued'} tickets yet.
        </Text>
      ) : (
        filtered.map((ticket) => (
          <TicketCard
            key={ticket.ticketId}
            ticket={ticket}
            onPress={() => {
              const actions = [
                ticket.ticketQrPayload
                  ? {
                      text: 'Show verification QR',
                      onPress: () => setVerificationQr(ticket.ticketQrPayload!),
                    }
                  : null,
                { text: 'Share receipt', onPress: () => shareReceipt(ticket) },
                { text: 'Close', style: 'cancel' as const },
              ].filter(Boolean) as { text: string; onPress?: () => void; style?: 'cancel' }[];

              Alert.alert(
                ticket.eventName,
                [
                  `${ticket.homeTeam} vs ${ticket.awayTeam}`,
                  `Status: ${ticket.status}`,
                  ticket.txHash ? `Tx: ${shortAddress(ticket.txHash)}` : null,
                  ticket.receiptId ? `Receipt: ${ticket.receiptId}` : null,
                ]
                  .filter(Boolean)
                  .join('\n'),
                actions,
              );
            }}
          />
        ))
      )}

      <Modal
        visible={verificationQr !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVerificationQr(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVerificationQr(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>VERIFICATION QR</Text>
            <Text style={styles.modalHint}>Show this at the gate for future scan-to-verify.</Text>
            {verificationQr ? <QrCodeView value={verificationQr} size={240} /> : null}
          </View>
        </Pressable>
      </Modal>
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
    marginBottom: 18,
  },
  toggleWrap: {
    position: 'relative',
    marginBottom: 22,
  },
  toggleShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    top: 4,
    borderRadius: 999,
    backgroundColor: MeshipayBrand.border,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: MeshipayBrand.backgroundElevated,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: MeshipayBrand.cream,
  },
  toggleLabel: {
    color: MeshipayBrand.foreground,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  toggleLabelActive: {
    color: MeshipayBrand.border,
  },
  empty: {
    color: MeshipayBrand.muted,
    textAlign: 'center',
    fontSize: 15,
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 16,
    backgroundColor: MeshipayBrand.backgroundElevated,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  modalTitle: {
    color: MeshipayBrand.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalHint: {
    color: MeshipayBrand.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
