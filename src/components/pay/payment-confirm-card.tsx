import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { formatMatchWindow, shortAddress } from '@/features/tickets/payment-helpers';
import type { QrPayload } from '@/features/tickets/qr-payload';
import { MeshipayBrand } from '@/constants/meshipay-brand';

type PaymentConfirmCardProps = {
  payload: QrPayload;
  peerCount: number;
  loading?: boolean;
  onPay: () => void;
  onCancel: () => void;
};

export function PaymentConfirmCard({
  payload,
  peerCount,
  loading,
  onPay,
  onCancel,
}: PaymentConfirmCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.shadow} />
      <View style={styles.card}>
        <Text style={styles.heading}>CONFIRM PAYMENT</Text>
        <Text style={styles.event}>{payload.eventName}</Text>
        <Text style={styles.teams}>
          {payload.homeTeam} vs {payload.awayTeam}
        </Text>
        <Text style={styles.meta}>{formatMatchWindow(payload.startAt, payload.endAt)}</Text>
        <Text style={styles.meta}>
          {payload.venue} · Gate {payload.gate} · {payload.seatLabel}
        </Text>
        <Text style={styles.meta}>Receiver: {shortAddress(payload.receiverAddress)}</Text>
        <View style={styles.priceBox}>
          <Text style={styles.price}>{payload.priceUsdt}</Text>
          <Text style={styles.currency}>USDT</Text>
        </View>
        <Text style={styles.peer}>
          {peerCount > 0 ? `Connected (${peerCount} peer)` : 'Joining P2P session...'}
        </Text>
        <NeoBrutalButton label="PAY & UNLOCK TICKET" disabled={loading} onPress={onPay} />
        {loading ? <ActivityIndicator color={MeshipayBrand.primary} /> : null}
        <NeoBrutalButton label="CANCEL" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginTop: 8 },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    top: 5,
    borderRadius: 16,
    backgroundColor: MeshipayBrand.border,
  },
  card: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 16,
    backgroundColor: MeshipayBrand.backgroundElevated,
    padding: 16,
    gap: 8,
  },
  heading: {
    color: MeshipayBrand.primary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  event: {
    color: MeshipayBrand.foreground,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  teams: {
    color: MeshipayBrand.muted,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
  meta: {
    color: MeshipayBrand.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  priceBox: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 12,
    backgroundColor: MeshipayBrand.cream,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 6,
  },
  price: {
    color: MeshipayBrand.border,
    fontSize: 36,
    fontWeight: '900',
  },
  currency: {
    color: MeshipayBrand.border,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  peer: {
    color: MeshipayBrand.muted,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
});
