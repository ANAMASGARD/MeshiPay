import { StyleSheet, Text, View } from 'react-native';

import { MeshipayBrand } from '@/constants/meshipay-brand';
import type { WdkAppState } from '@/features/wdk/wdk-types';
import { shortWalletAddress } from '@/components/wallet/wallet-utils';

type WalletStatusCardProps = {
  status: WdkAppState['status'];
  address?: string | null;
  statusLabel: string;
};

export function WalletStatusCard({ status, address, statusLabel }: WalletStatusCardProps) {
  const ready = status === 'READY';

  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <Text style={styles.title}>WALLET</Text>
        <Text style={[styles.status, ready ? styles.statusReady : null]}>{statusLabel}</Text>
        {ready && address ? (
          <Text style={styles.address}>{shortWalletAddress(address)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginBottom: 20,
  },
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
    gap: 4,
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
  statusReady: {
    color: MeshipayBrand.primary,
  },
  address: {
    color: MeshipayBrand.foreground,
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 4,
  },
});
