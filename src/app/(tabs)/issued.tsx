import { StyleSheet, Text } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { TicketCard } from '@/components/tickets/ticket-card';
import { MeshipayInlineLoader } from '@/components/ui/meshipay-inline-loader';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useTickets } from '@/features/tickets/tickets-context';

export default function IssuedTicketsScreen() {
  const { tickets, loading } = useTickets();
  const issued = tickets.filter((ticket) => ticket.kind === 'issued');
  return (
    <PitchScreen>
      <Text style={styles.heading}>ISSUED</Text>
      <Text style={styles.copy}>Ticket offers created by your club.</Text>
      {loading ? <MeshipayInlineLoader label="LOADING ISSUED TICKETS" height={160} /> : null}
      {!loading && issued.length === 0 ? <Text style={styles.empty}>No ticket offers created yet.</Text> : null}
      {issued.map((ticket) => <TicketCard key={ticket.ticketId} ticket={ticket} />)}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: { color: MeshipayBrand.foreground, fontSize: 32, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginBottom: 8 },
  copy: { color: MeshipayBrand.muted, textAlign: 'center', fontSize: 14, marginBottom: 18 },
  empty: { color: MeshipayBrand.muted, textAlign: 'center', marginTop: 32, fontSize: 15 },
});
