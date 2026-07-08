import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { SeedPhraseModal } from '@/components/wallet/seed-phrase-modal';
import { shortWalletAddress, useWalletStatusLabel } from '@/components/wallet/wallet-utils';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useAccount, useWdkApp } from '@/features/wdk/wdk-hooks';
import { getWdkUnavailableMessage } from '@/features/wdk/wdk-status';
import { useWalletSetup } from '@/hooks/use-wallet-setup';

type WalletConnectButtonProps = {
  compact?: boolean;
  showImport?: boolean;
};

export function WalletConnectButton({ compact, showImport = true }: WalletConnectButtonProps) {
  const { state } = useWdkApp();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const unavailableMessage = getWdkUnavailableMessage(state);
  const statusLabel = useWalletStatusLabel(state.status, unavailableMessage);
  const ready = state.status === 'READY' && !!address;

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

  if (ready && address) {
    if (compact) {
      return (
        <View style={styles.connectedCompact}>
          <Text style={styles.connectedLabel}>WALLET</Text>
          <Text style={styles.connectedAddress}>{shortWalletAddress(address)}</Text>
        </View>
      );
    }
    return (
      <View style={styles.connectedWrap}>
        <View style={styles.connectedShadow} />
        <View style={styles.connectedCard}>
          <Text style={styles.connectedTitle}>WALLET CONNECTED</Text>
          <Text style={styles.connectedAddress}>{shortWalletAddress(address)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <Text style={styles.title}>WALLET</Text>
        <Text style={styles.status}>{statusLabel}</Text>
        <NeoBrutalButton
          label="CONNECT TETHER WALLET"
          disabled={loadingAction === 'generate'}
          onPress={handleGenerateSeed}
        />
        {showImport ? (
          <Pressable accessibilityRole="button" onPress={handleEnterPhrase} style={styles.importBtn}>
            <Text style={styles.importText}>IMPORT EXISTING WALLET</Text>
          </Pressable>
        ) : null}
      </View>

      <SeedPhraseModal
        mode={modalMode === 'enter' ? 'enter' : 'display'}
        phrase={seedPhrase}
        title={modalMode === 'enter' ? 'IMPORT WALLET' : 'SAVE YOUR RECOVERY PHRASE'}
        value={enterPhrase}
        visible={modalMode !== null}
        loading={loadingAction === 'enter'}
        onChangeText={setEnterPhrase}
        onClose={() => setModalMode(null)}
        onConfirm={modalMode === 'enter' ? handleRestorePhrase : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 16 },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    top: 5,
    borderRadius: 14,
    backgroundColor: MeshipayBrand.border,
  },
  card: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 14,
    backgroundColor: MeshipayBrand.backgroundElevated,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: MeshipayBrand.foreground,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  status: {
    color: MeshipayBrand.muted,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  importBtn: { paddingVertical: 8 },
  importText: {
    color: MeshipayBrand.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  connectedWrap: { position: 'relative', marginBottom: 12 },
  connectedShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    top: 4,
    borderRadius: 12,
    backgroundColor: MeshipayBrand.border,
  },
  connectedCard: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 12,
    backgroundColor: MeshipayBrand.backgroundElevated,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 2,
  },
  connectedTitle: {
    color: MeshipayBrand.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  connectedAddress: {
    color: MeshipayBrand.foreground,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  connectedCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.backgroundElevated,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  connectedLabel: {
    color: MeshipayBrand.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
