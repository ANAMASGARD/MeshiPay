import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { TicketBuilderForm } from '@/components/tickets/ticket-builder-form';
import { TicketPreviewCard } from '@/components/tickets/ticket-preview-card';
import { WalletStatusCard } from '@/components/wallet/wallet-status-card';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { createTicketFromDraft, upsertTicket } from '@/features/tickets/ticket-storage';
import type { TicketDraftInput, TicketRecord } from '@/features/tickets/ticket-types';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';
import { getWdkUnavailableMessage } from '@/features/wdk/wdk-status';

export default function CreateTicketScreen() {
  const router = useRouter();
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const unavailableMessage = getWdkUnavailableMessage(state);
  const walletReady = state.status === 'READY' && !!address;

  const [preview, setPreview] = useState<TicketRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const walletStatusLabel =
    state.status === 'READY'
      ? 'Wallet unlocked'
      : unavailableMessage ?? 'Connect your Tether wallet first.';

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
        Alert.alert('Wallet required', 'Unlock your wallet on the Gate tab first.');
        return;
      }

      if (!draft.eventName.trim() || !draft.homeTeam.trim() || !draft.awayTeam.trim()) {
        Alert.alert('Missing fields', 'Event name and both teams are required.');
        return;
      }

      setSaving(true);
      try {
        const ticket = createTicketFromDraft(draft, address);
        await upsertTicket(ticket);
        Alert.alert('Ticket created', 'Your ticket offer is saved locally.', [
          { text: 'Review', onPress: () => router.replace(`/ticket-preview/${ticket.ticketId}`) },
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
      <WalletStatusCard status={state.status} address={address} statusLabel={walletStatusLabel} />
      {preview ? <TicketPreviewCard ticket={preview} compact /> : null}
      <TicketBuilderForm
        onSubmit={handleSubmit}
        onDraftChange={handleDraftChange}
        loading={saving}
        disabled={!walletReady}
      />
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
});
