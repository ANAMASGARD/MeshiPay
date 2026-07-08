import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { QrCodeView } from '@/components/tickets/qr-code-view';
import { TicketBuilderForm } from '@/components/tickets/ticket-builder-form';
import { TicketPreviewCard } from '@/components/tickets/ticket-preview-card';
import { MeshipayLoadingOverlay } from '@/components/ui/meshipay-loading-overlay';
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { createTicketFromDraft, createTicketFromDraftWithQr, upsertTicket } from '@/features/tickets/ticket-storage';
import type { TicketDraftInput, TicketRecord } from '@/features/tickets/ticket-types';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';

export default function CreateTicketScreen() {
  const router = useRouter();
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const walletReady = state.status === 'READY' && !!address;

  const [preview, setPreview] = useState<TicketRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState<string | null>(null);

  const handleDraftChange = useCallback(
    (draft: TicketDraftInput) => {
      if (!address) {
        return;
      }
      setPreview(createTicketFromDraft(draft, address));
    },
    [address],
  );

  const handleSubmit = useCallback(
    async (draft: TicketDraftInput) => {
      if (!walletReady || !address) {
        Alert.alert('Wallet required', 'Connect your wallet first.');
        return;
      }

      if (!draft.eventName.trim() || !draft.homeTeam.trim() || !draft.awayTeam.trim()) {
        Alert.alert('Missing fields', 'Event name and both teams are required.');
        return;
      }

      setSaving(true);
      try {
        const ticket = await createTicketFromDraftWithQr(draft, address);
        await upsertTicket(ticket);
        Alert.alert('Ticket created', 'Your ticket is ready.', [
          {
            text: 'View ticket',
            onPress: () => router.replace(`/ticket-preview/${ticket.ticketId}`),
          },
          { text: 'Back to Gate', onPress: () => router.back() },
        ]);
      } catch (error) {
        Alert.alert(
          'Save failed',
          error instanceof Error ? error.message : 'Unable to save ticket.',
        );
      } finally {
        setSaving(false);
      }
    },
    [address, router, walletReady],
  );

  return (
    <PitchScreen>
      <Text style={styles.heading}>CREATE TICKET</Text>
      {!walletReady ? <WalletConnectButton compact /> : null}
      {preview ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (preview.ticketQrPayload) {
              setQrModal(preview.ticketQrPayload);
            }
          }}>
          <TicketPreviewCard
            ticket={preview}
            qrValue={preview.ticketQrPayload}
            compact
            onQrPress={preview.ticketQrPayload ? () => setQrModal(preview.ticketQrPayload!) : undefined}
          />
        </Pressable>
      ) : null}
      <TicketBuilderForm
        onSubmit={handleSubmit}
        onDraftChange={handleDraftChange}
        loading={saving}
        disabled={!walletReady}
      />

      <Modal visible={qrModal !== null} transparent animationType="fade" onRequestClose={() => setQrModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setQrModal(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>TICKET QR</Text>
            {qrModal ? <QrCodeView value={qrModal} size={220} /> : null}
            <Text style={styles.modalHint}>Display only — use Receive Payment for payments.</Text>
          </View>
        </Pressable>
      </Modal>

      <MeshipayLoadingOverlay visible={saving} label="CREATING TICKET" />
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: MeshipayBrand.foreground,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
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
    width: '100%',
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
  },
});
