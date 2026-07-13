import { StyleSheet, Text } from 'react-native';

import { PitchScreen } from '@/components/layout/pitch-screen';
import { AttendeeRow } from '@/components/receiver/attendee-row';
import { MeshipayInlineLoader } from '@/components/ui/meshipay-inline-loader';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useTickets } from '@/features/tickets/tickets-context';

export default function AttendeesScreen() {
  const { attendees, loading } = useTickets();
  return (
    <PitchScreen>
      <Text style={styles.heading}>ATTENDEES</Text>
      <Text style={styles.copy}>Payments independently verified from Sepolia USD₮ transfer logs.</Text>
      {loading ? <MeshipayInlineLoader label="LOADING ATTENDEES" height={160} /> : null}
      {!loading && attendees.length === 0 ? <Text style={styles.empty}>No verified attendees yet.</Text> : null}
      {attendees.map((attendee) => <AttendeeRow key={attendee.attendeeId} attendee={attendee} />)}
    </PitchScreen>
  );
}

const styles = StyleSheet.create({
  heading: { color: MeshipayBrand.foreground, fontSize: 32, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginBottom: 8 },
  copy: { color: MeshipayBrand.muted, textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  empty: { color: MeshipayBrand.muted, textAlign: 'center', marginTop: 32, fontSize: 15 },
});
