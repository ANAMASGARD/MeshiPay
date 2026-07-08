import { StyleSheet, Text, View } from 'react-native';

import { MeshipayBrand } from '@/constants/meshipay-brand';

export function SepoliaBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>SEPOLIA TESTNET</Text>
      <Text style={styles.sub}>Fake USDT — real wallet plumbing</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: MeshipayBrand.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: MeshipayBrand.backgroundElevated,
    marginBottom: 16,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    color: MeshipayBrand.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sub: {
    color: MeshipayBrand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
});
