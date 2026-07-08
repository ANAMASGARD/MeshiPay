import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Linking, StyleSheet, Text } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { NeoBrutalMenuRow } from '@/components/ui/neo-brutal-menu-row';
import { SepoliaBadge } from '@/components/wallet/sepolia-badge';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { clearTicketData } from '@/features/tickets/ticket-storage';
import { useAccount, useWdkApp, useWalletManager } from '@/features/wdk/wdk-hooks';
import { useUserRole } from '@/hooks/use-user-role';
import { useTicketsP2P } from '@/features/tickets/tickets-p2p-context';

function shortAddress(address: string | null | undefined): string {
  if (!address) {
    return 'No address';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { state } = useWdkApp();
  const { lock, getMnemonic } = useWalletManager();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const { role, setRole, clearRole } = useUserRole();
  const p2p = useTicketsP2P();
  const [cameraPermission] = useCameraPermissions();

  const profileLabel =
    role === 'sender'
      ? `Fan (${shortAddress(address)})`
      : role === 'receiver'
        ? `Gatekeeper (${shortAddress(address)})`
        : `Meshipay User (${shortAddress(address)})`;

  const p2pStatus =
    p2p.peerCount > 0
      ? `Hyperswarm: Online (${p2p.peerCount} peer)`
      : p2p.isActive
        ? 'Hyperswarm: Online (0 peers)'
        : 'Hyperswarm: Offline';

  const demoReady =
    state.status === 'READY' && !!address && !!role
      ? 'Wallet + role ready for demo'
      : 'Complete wallet unlock and role selection';

  const handleLogout = useCallback(() => {
    Alert.alert('Log out', 'Lock wallet and return to onboarding?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          lock();
          clearRole().finally(() => {
            router.replace('/');
          });
        },
      },
    ]);
  }, [clearRole, lock, router]);

  const handleWallet = useCallback(() => {
    if (state.status !== 'READY' || !address) {
      Alert.alert('Wallet locked', 'Unlock your wallet on the Gate tab first.');
      return;
    }
    Alert.alert('WDK Wallet', address);
  }, [address, state.status]);

  const handleBackup = useCallback(async () => {
    if (state.status !== 'READY') {
      Alert.alert('Wallet locked', 'Unlock your wallet first.');
      return;
    }
    try {
      const phrase = await getMnemonic('meshipay-main');
      if (!phrase) {
        Alert.alert('Unavailable', 'Seed phrase not available for this wallet.');
        return;
      }
      Alert.alert('Seed phrase', phrase);
    } catch (error) {
      Alert.alert(
        'Backup failed',
        error instanceof Error ? error.message : 'Unable to read seed phrase.',
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

  const handleSwitchRole = useCallback(() => {
    Alert.alert('Switch role', 'Choose your demo role', [
      {
        text: 'Sender (Fan)',
        onPress: () => setRole('sender').catch(() => undefined),
      },
      {
        text: 'Receiver (Gatekeeper)',
        onPress: () => setRole('receiver').catch(() => undefined),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [setRole]);

  return (
    <PitchScreen>
      <Text style={styles.heading}>SETTINGS</Text>
      <SepoliaBadge />

      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="account-circle-outline" size={28} color={MeshipayBrand.border} />}
        subtitle={profileLabel}
        title="PROFILE"
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="lan-connect" size={28} color={MeshipayBrand.border} />}
        subtitle={p2pStatus}
        title="P2P STATUS"
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="wallet-outline" size={28} color={MeshipayBrand.border} />}
        subtitle="View Address & Backup"
        title="WDK WALLET"
        onPress={handleWallet}
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="lock-outline" size={28} color={MeshipayBrand.border} />}
        subtitle="Backup seed phrase"
        title="SECURITY"
        onPress={handleBackup}
      />
      <NeoBrutalMenuRow
        icon={<MaterialCommunityIcons name="swap-horizontal" size={28} color={MeshipayBrand.border} />}
        subtitle={role ? `Current: ${role}` : 'Not selected'}
        title="SWITCH ROLE"
        onPress={handleSwitchRole}
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
