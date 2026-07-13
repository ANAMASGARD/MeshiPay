import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { MeshipayBrand } from '@/constants/meshipay-brand';

/**
 * Reserved for the future Mapbox-powered fan match-day map.
 * This route is intentionally UI-only: it neither loads Mapbox nor requests location access.
 */
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="map-marker-radius-outline" size={54} color={MeshipayBrand.primary} />
      </View>
      <Text style={styles.heading}>MATCH MAP</Text>
      <Text style={styles.copy}>
        Club locations and match-day directions will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 94,
    backgroundColor: MeshipayBrand.background,
  },
  iconWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 14,
    backgroundColor: MeshipayBrand.backgroundElevated,
    shadowColor: MeshipayBrand.border,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  heading: {
    color: MeshipayBrand.foreground,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  copy: {
    maxWidth: 280,
    marginTop: 10,
    color: MeshipayBrand.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
