import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AttendeeRow } from '@/components/receiver/attendee-row';
import { PitchScreen } from '@/components/layout/pitch-screen';
import { TicketOfferList } from '@/components/tickets/ticket-offer-list';
import { NeoBrutalSectionButton } from '@/components/ui/neo-brutal-section-button';
import { NeoBrutalRoleButton } from '@/components/ui/neo-brutal-role-button';
import { SeedPhraseModal } from '@/components/wallet/seed-phrase-modal';
import { WalletStatusCard } from '@/components/wallet/wallet-status-card';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useTicketsP2P } from '@/features/tickets/tickets-p2p-context';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';
import { getWdkUnavailableMessage } from '@/features/wdk/wdk-status';
import { useWalletSetup } from '@/hooks/use-wallet-setup';
import { useUserRole } from '@/hooks/use-user-role';

export default function GateScreen() {
  const router = useRouter();
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const { role, setRole } = useUserRole();
  const { tickets, attendees, loading: ticketsLoading } = useTicketsP2P();
  const unavailableMessage = getWdkUnavailableMessage(state);
  const walletReady = state.status === 'READY';

  const {
    loadingAction,
    modalMode,
    seedPhrase,
    enterPhrase,
    setEnterPhrase,
    setModalMode,
    handleGenerateSeed,
    handleEnterPhrase,
    handleRestorePhrase,
  } = useWalletSetup();

  const walletStatusLabel =
    state.status === 'READY'
      ? 'Wallet unlocked'
      : state.status === 'LOCKED'
        ? 'Wallet locked — tap to unlock'
        : state.status === 'NO_WALLET'
          ? 'No wallet on device'
          : state.status === 'INITIALIZING' || state.status === 'REINITIALIZING'
            ? 'Initializing WDK...'
            : unavailableMessage ?? 'Wallet unavailable';

  return (
    <PitchScreen>
      <Text style={styles.heading}>GATE / WALLET</Text>

      <WalletStatusCard status={state.status} address={address} statusLabel={walletStatusLabel} />

      <View style={styles.sectionGap}>
        <NeoBrutalSectionButton
          header="NEW WALLET?"
          label="GENERATE SEED PHRASE"
          loading={loadingAction === 'generate'}
          onPress={handleGenerateSeed}
        />
        <NeoBrutalSectionButton
          header="HAVE WALLET?"
          label="ENTER PHRASE"
          loading={loadingAction === 'enter' && modalMode !== 'enter'}
          onPress={handleEnterPhrase}
        />
      </View>

      <Text style={styles.roleHeading}>I AM A...</Text>
      <View style={styles.roleRow}>
        <NeoBrutalRoleButton
          label="SENDER (FAN)"
          selected={role === 'sender'}
          onPress={() => {
            setRole('sender').catch(() => undefined);
          }}
        />
        <Text style={styles.or}>OR</Text>
        <NeoBrutalRoleButton
          label="RECEIVER (GATEKEEPER)"
          selected={role === 'receiver'}
          onPress={() => {
            setRole('receiver').catch(() => undefined);
          }}
        />
      </View>

      {role === 'receiver' ? (
        <View style={styles.receiverSection}>
          <NeoBrutalSectionButton
            header="RECEIVER"
            label="CREATE TICKET"
            disabled={!walletReady}
            onPress={() => router.push('/create-ticket')}
          />
          <Text style={styles.sectionTitle}>YOUR TICKET OFFERS</Text>
          {!ticketsLoading ? (
            <TicketOfferList
              tickets={tickets}
              onSelect={(ticketId) => router.push(`/ticket-preview/${ticketId}`)}
            />
          ) : null}
          {attendees.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>ATTENDEES</Text>
              {attendees.map((attendee) => (
                <AttendeeRow key={attendee.attendeeId} attendee={attendee} />
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      <SeedPhraseModal
        mode={modalMode === 'enter' ? 'enter' : 'display'}
        phrase={seedPhrase}
        title={modalMode === 'enter' ? 'ENTER SEED PHRASE' : 'YOUR SEED PHRASE'}
        value={enterPhrase}
        visible={modalMode !== null}
        loading={loadingAction === 'enter'}
        onChangeText={setEnterPhrase}
        onClose={() => setModalMode(null)}
        onConfirm={modalMode === 'enter' ? handleRestorePhrase : undefined}
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
    marginBottom: 10,
  },
  sectionGap: {
    gap: 18,
    marginBottom: 28,
  },
  roleHeading: {
    color: MeshipayBrand.foreground,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 14,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  or: {
    color: MeshipayBrand.foreground,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  receiverSection: {
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: MeshipayBrand.foreground,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
});
