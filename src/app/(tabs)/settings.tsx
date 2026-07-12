import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Linking, StyleSheet, Text } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { NeoBrutalMenuRow } from '@/components/ui/neo-brutal-menu-row';
import { WalletAddressCopyRow } from '@/components/wallet/wallet-address-copy-row';
import { WalletBalanceRing } from '@/components/wallet/wallet-balance-ring';
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button';
import { shortWalletAddress } from '@/components/wallet/wallet-utils';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { clearTicketData } from '@/features/tickets/ticket-storage';
import { useAccount, useWdkApp, useWalletManager } from '@/features/wdk/wdk-hooks';

export default function SettingsScreen() {
  const router = useRouter();
  const { state } = useWdkApp();
  const { lock, getMnemonic } = useWalletManager();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const [cameraPermission] = useCameraPermissions();

  const profileLabel = address
    ? `Meshipay User (${shortWalletAddress(address)})`
    : 'Meshipay User';

  const paymentStatus =
    'Payments: Tether Wallet (Sepolia USDT)\nReceiver verifies via on-chain USDT';

  const demoReady =
    state.status === 'READY' && !!address ? 'Wallet ready for demo' : 'Connect wallet to start';

  const handleLogout = useCallback(() => {
    Alert.alert('Log out', 'Lock wallet and return to onboarding?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          lock();
          router.replace('/');
        },
      },
    ]);
  }, [lock, router]);

  const handleBackup = useCallback(async () => {
    if (state.status !== 'READY') {
      Alert.alert('Wallet locked', 'Connect your wallet first.');
      return;
    }
    try {
      const phrase = await getMnemonic('meshipay-main');
      if (!phrase) {
        Alert.alert('Unavailable', 'Recovery phrase not available for this wallet.');
        return;
      }
      Alert.alert('Recovery phrase', phrase);
    } catch (error) {
      Alert.alert(
        'Backup failed',
        error instanceof Error ? error.message : 'Unable to read recovery phrase.',
      );
    }
  }, [getMnemonic, state.status]);

  const handleClearTickets = useCallback(() => {
    Alert.alert('Clear local tickets', 'Remove all tickets and attendees from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearTicketData()
            .then(() => Alert.alert('Cleared', 'Local ticket data removed.'))
            .catch(() => Alert.alert('Failed', 'Unable to clear ticket data.'));
        },
      },
    ]);
  }, []);

  return (
    <PitchScreen>
      <Text style={styles.heading}>SETTINGS</Text>

      <WalletConnectButton showImport />

      {state.status === 'READY' && address ? (
        <>
          <WalletBalanceRing address={address} />
          <WalletAddressCopyRow address={address} />
        </>
      ) : null}

      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="account-circle-outline" size={28} color={MeshipayBrand.border} />}
        subtitle={profileLabel}
        title="PROFILE"
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="wallet-outline" size={28} color={MeshipayBrand.border} />}
        subtitle={paymentStatus}
        title="PAYMENTS"
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="wallet-outline" size={28} color={MeshipayBrand.border} />}
        subtitle={address ? shortWalletAddress(address) : 'Unlock wallet to view'}
        title="WALLET"
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="lock-outline" size={28} color={MeshipayBrand.border} />}
        subtitle="Backup recovery phrase"
        title="SECURITY"
        onPress={handleBackup}
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="ticket-outline" size={28} color={MeshipayBrand.border} />}
        subtitle="Demo reset"
        title="CLEAR LOCAL TICKETS"
        onPress={handleClearTickets}
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="check-decagram" size={28} color={MeshipayBrand.border} />}
        subtitle={demoReady}
        title="DEMO READINESS"
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="camera-outline" size={28} color={MeshipayBrand.border} />}
        subtitle={cameraPermission?.granted ? 'Camera available' : 'Camera permission needed on Pay tab'}
        title="CAMERA"
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="help-circle-outline" size={28} color={MeshipayBrand.border} />}
        subtitle="FAQs & Discord"
        title="HELP & SUPPORT"
        onPress={() => Linking.openURL('https://discord.gg/tether').catch(() => undefined)}
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="logout" size={28} color={MeshipayBrand.border} />}
        subtitle="Lock wallet"
        title="LOG OUT"
        onPress={handleLogout}
      />
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
    marginBottom: 12,
  },
});
