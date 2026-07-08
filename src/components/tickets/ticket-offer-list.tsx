import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MeshipayBrand } from '@/constants/meshipay-brand';
import type { TicketRecord } from '@/features/tickets/ticket-types';

type TicketOfferListProps = {
  tickets: TicketRecord[];
  onSelect: (ticketId: string) => void;
};

function statusLabel(status: TicketRecord['status']): string {
  switch (status) {
    case 'draft':
      return 'DRAFT';
    case 'awaiting_payment':
      return 'AWAITING PAYMENT';
    case 'paid':
      return 'PAID';
    case 'transferred':
      return 'TRANSFERRED';
    case 'checked_in':
      return 'CHECKED IN';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function TicketOfferList({ tickets, onSelect }: TicketOfferListProps) {
  const issued = tickets.filter((ticket) => ticket.kind === 'issued');

  if (issued.length === 0) {
    return <Text style={styles.empty}>No ticket offers yet. Create one to start receiving payments.</Text>;
  }

  return (
    <View style={styles.wrap}>
      {issued.map((ticket) => (
        <Pressable
          key={ticket.ticketId}
          accessibilityRole="button"
          onPress={() => onSelect(ticket.ticketId)}
          style={styles.row}>
          <View style={styles.rowShadow} />
          <View style={styles.rowBody}>
            <Text style={styles.title}>{ticket.eventName}</Text>
            <Text style={styles.sub}>
              {ticket.homeTeam} vs {ticket.awayTeam}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.price}>{ticket.priceUsdt} USDT</Text>
              <Text style={styles.status}>{statusLabel(ticket.status)}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  empty: {
    color: MeshipayBrand.muted,
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 12,
  },
  row: { position: 'relative' },
  rowShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    top: 4,
    borderRadius: 12,
    backgroundColor: MeshipayBrand.border,
  },
  rowBody: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 12,
    backgroundColor: MeshipayBrand.backgroundElevated,
    padding: 14,
    gap: 4,
  },
  title: {
    color: MeshipayBrand.foreground,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  sub: { color: MeshipayBrand.muted, fontSize: 13 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  price: { color: MeshipayBrand.primary, fontSize: 14, fontWeight: '900' },
  status: { color: MeshipayBrand.muted, fontSize: 11, fontWeight: '800' },
});
