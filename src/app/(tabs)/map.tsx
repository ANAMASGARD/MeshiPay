import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Atmosphere, Camera, MapView, PointAnnotation, setAccessToken, type Camera as CameraRef, type MapState } from '@rnmapbox/maps';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MeshipayBrand, NeoBrutalShadow } from '@/constants/meshipay-brand';
import {
  MAP_ATMOSPHERE_STYLE,
  MAP_INITIAL_CAMERA,
  MAP_SEARCH_ZOOM,
  buildMapboxPlaceSearchUrl,
  getNextZoom,
  hasMapboxAccessToken,
  parseMapboxPlaceSearchResults,
  type MapboxPlaceSearchResult,
} from '@/features/map/map-utils';
import { buyMatchTickets, fetchPublishedMatches, fetchRemainingCapacity, isMatchRegistryConfigured, type EvmAccountExtension, type PublishedMatch } from '@/features/matches/registry';
import { mintReceivedTicketFromMatch } from '@/features/tickets/ticket-storage';
import { useTickets } from '@/features/tickets/tickets-context';
import { useAccount } from '@/features/wdk/wdk-hooks';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (hasMapboxAccessToken(mapboxAccessToken)) {
  void setAccessToken(mapboxAccessToken!.trim());
}

type MapStatus =
  | { kind: 'loading'; message: string }
  | { kind: 'ready'; message: string }
  | { kind: 'error'; message: string; action?: 'reload' };

export default function MapScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const [cameraZoom, setCameraZoom] = useState(MAP_INITIAL_CAMERA.zoomLevel);
  const [mapReloadKey, setMapReloadKey] = useState(0);
  const [status, setStatus] = useState<MapStatus>({ kind: 'loading', message: 'LOADING THE PITCH...' });
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapboxPlaceSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<PublishedMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PublishedMatch | null>(null);
  const account = useAccount({ network: 'ethereum', accountIndex: 0 }) as unknown as { address: string | null; extension: <T extends object>() => T };
  const tickets = useTickets();

  const hasToken = hasMapboxAccessToken(mapboxAccessToken);

  const refreshMatches = useCallback(async () => {
    if (!isMatchRegistryConfigured()) return;
    try {
      const discovered = await fetchPublishedMatches();
      const withCapacity = await Promise.all(discovered.map(async (match) => ({ ...match, remaining: await fetchRemainingCapacity(match.saleAddress).catch(() => undefined) })));
      setMatches(withCapacity);
    } catch { setStatus({ kind: 'error', message: 'MATCHES COULD NOT SYNC. CHECK YOUR CONNECTION.', action: 'reload' }); }
  }, []);

  useEffect(() => { void refreshMatches(); }, [refreshMatches]);

  const changeZoom = (direction: 'in' | 'out') => {
    const nextZoom = getNextZoom(cameraZoom, direction);
    cameraRef.current?.zoomTo(nextZoom, 300);
    setCameraZoom(nextZoom);
  };

  const openSearch = () => {
    setSearchError(null);
    setSearchResults([]);
    setIsSearchVisible(true);
  };

  const searchPlaces = async () => {
    const searchText = query.trim();
    if (!searchText || !mapboxAccessToken) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch(buildMapboxPlaceSearchUrl(searchText, mapboxAccessToken));
      if (!response.ok) {
        throw new Error(`Mapbox search failed with ${response.status}`);
      }

      const results = parseMapboxPlaceSearchResults(await response.json());
      setSearchResults(results);
      if (results.length === 0) setSearchError('NO PLACES FOUND. TRY A CITY, STADIUM, OR ADDRESS.');
    } catch {
      setSearchError('SEARCH COULD NOT CONNECT. CHECK YOUR INTERNET AND TRY AGAIN.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (place: MapboxPlaceSearchResult) => {
    Keyboard.dismiss();
    setIsSearchVisible(false);
    cameraRef.current?.setCamera({
      centerCoordinate: place.coordinate,
      zoomLevel: MAP_SEARCH_ZOOM,
      pitch: 0,
      animationDuration: 1200,
      animationMode: 'flyTo',
    });
    setCameraZoom(MAP_SEARCH_ZOOM);
    setStatus({ kind: 'ready', message: `MAP CENTERED: ${place.name.toUpperCase()}` });
  };

  const buySelectedMatch = () => {
    if (!selectedMatch || !account.address) { Alert.alert('Wallet required', 'Connect your wallet before buying a match ticket.'); return; }
    if ((selectedMatch.remaining ?? 0) < 1) { Alert.alert('Sold out', 'This event is sold out.'); return; }
    Alert.alert('Buy ticket', `${selectedMatch.eventName}\n${selectedMatch.priceUsdt} test USDT`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'BUY 1', onPress: () => void (async () => {
        try {
          const result = await buyMatchTickets(account.extension<EvmAccountExtension>(), selectedMatch.saleAddress, selectedMatch.priceUsdt, 1);
          await mintReceivedTicketFromMatch({ match: selectedMatch, quantity: 1, senderAddress: account.address!, txHash: result.hash });
          await tickets.refresh(); await refreshMatches(); setSelectedMatch(null);
          Alert.alert('Ticket saved', 'Your on-chain purchase is now in Tickets.');
        } catch (error) { Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy this ticket.'); }
      }) },
    ]);
  };

  const handleMapReady = () => setStatus({ kind: 'ready', message: 'SEARCH A PLACE OR DRAG THE GLOBE' });
  const handleCameraChanged = (state: MapState) => setCameraZoom(state.properties.zoom);

  if (!hasToken) {
    return (
      <MapShell>
        <View style={styles.setupCard}>
          <MaterialCommunityIcons name="key-alert-outline" size={42} color={MeshipayBrand.primary} />
          <Text style={styles.setupTitle}>MAP TOKEN NEEDED</Text>
          <Text style={styles.setupCopy}>Add a Mapbox public token to EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local, then reload Meshipay.</Text>
        </View>
      </MapShell>
    );
  }

  return (
    <MapShell>
      <MapView
        key={mapReloadKey}
        style={StyleSheet.absoluteFill}
        styleURL="mapbox://styles/mapbox/satellite-streets-v12"
        projection="globe"
        preferredFramesPerSecond={60}
        requestDisallowInterceptTouchEvent
        logoEnabled
        attributionEnabled
        compassEnabled={false}
        scaleBarEnabled={false}
        onDidFinishLoadingMap={handleMapReady}
        onDidFailLoadingMap={() => setStatus({ kind: 'error', message: 'THE MAP COULD NOT LOAD. CHECK YOUR CONNECTION.', action: 'reload' })}
        onCameraChanged={handleCameraChanged}>
        <Camera ref={cameraRef} defaultSettings={MAP_INITIAL_CAMERA} minZoomLevel={0.7} maxZoomLevel={18} />
        <Atmosphere style={MAP_ATMOSPHERE_STYLE} />
        {matches.map((match) => <PointAnnotation key={match.matchId} id={match.matchId} coordinate={[match.location.longitude, match.location.latitude]} onSelected={() => { setSelectedMatch(match); cameraRef.current?.setCamera({ centerCoordinate: [match.location.longitude, match.location.latitude], zoomLevel: MAP_SEARCH_ZOOM, animationDuration: 900, animationMode: 'flyTo' }); }}><View style={styles.redMatchPin}><View style={styles.redMatchCore} /></View></PointAnnotation>)}
      </MapView>

      <View pointerEvents="none" style={styles.topOverlay}>
        <View style={styles.titlePlate}>
          <Text style={styles.title}>MATCH MAP</Text>
          <Text style={styles.subtitle}>GLOBAL KICKOFF VIEW</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.zoomRail}>
          <MapControl icon="plus" label="Zoom in" onPress={() => changeZoom('in')} />
          <View style={styles.controlDivider} />
          <MapControl icon="minus" label="Zoom out" onPress={() => changeZoom('out')} />
        </View>
        <MapControl icon="magnify" label="Search for a location" onPress={openSearch} primary />
      </View>

      <View style={styles.bottomOverlay}>
        <View style={[styles.statusPlate, status.kind === 'error' && styles.statusError]}>
          <MaterialCommunityIcons name={status.kind === 'error' ? 'alert-circle-outline' : status.kind === 'loading' ? 'radar' : 'earth'} size={17} color={status.kind === 'error' ? MeshipayBrand.foreground : MeshipayBrand.primary} />
          <Text style={styles.statusText}>{status.message}</Text>
          {status.kind === 'error' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Reload map" onPress={() => { setStatus({ kind: 'loading', message: 'RELOADING THE PITCH...' }); setMapReloadKey((key) => key + 1); }} style={styles.statusAction}>
              <Text style={styles.statusActionText}>RELOAD</Text>
            </Pressable>
          ) : null}
        </View>
        {selectedMatch ? <View style={styles.matchCard}><Text style={styles.matchTitle}>{selectedMatch.eventName}</Text><Text style={styles.matchCopy}>{selectedMatch.homeTeam} vs {selectedMatch.awayTeam}</Text><Text style={styles.matchCopy}>{selectedMatch.venue} · {selectedMatch.priceUsdt} USDT</Text><Text style={styles.matchCopy}>KICKOFF: {new Date(selectedMatch.startAt).toLocaleString()}</Text><Text style={styles.matchCopy}>{selectedMatch.remaining ?? '…'} / {selectedMatch.capacity} SEATS LEFT</Text><View style={styles.matchActions}><Pressable accessibilityRole="button" onPress={buySelectedMatch} style={styles.matchBuy}><Text style={styles.matchCloseText}>BUY 1</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelectedMatch(null)} style={styles.matchClose}><Text style={styles.matchCloseText}>CLOSE</Text></Pressable></View></View> : null}
      </View>

      <PlaceSearchModal
        visible={isSearchVisible}
        query={query}
        results={searchResults}
        isSearching={isSearching}
        error={searchError}
        onChangeQuery={setQuery}
        onClose={() => { Keyboard.dismiss(); setIsSearchVisible(false); }}
        onSearch={() => void searchPlaces()}
        onSelect={selectPlace}
      />
    </MapShell>
  );
}

function PlaceSearchModal({ visible, query, results, isSearching, error, onChangeQuery, onClose, onSearch, onSelect }: {
  visible: boolean;
  query: string;
  results: MapboxPlaceSearchResult[];
  isSearching: boolean;
  error: string | null;
  onChangeQuery: (value: string) => void;
  onClose: () => void;
  onSearch: () => void;
  onSelect: (place: MapboxPlaceSearchResult) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={styles.searchPanel}>
          <View style={styles.searchHeader}>
            <View>
              <Text style={styles.searchTitle}>FIND A PLACE</Text>
              <Text style={styles.searchHint}>SEARCH A CITY, STADIUM, OR ADDRESS</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close place search" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={MeshipayBrand.border} />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              autoFocus
              accessibilityLabel="Location search query"
              value={query}
              onChangeText={onChangeQuery}
              onSubmitEditing={onSearch}
              placeholder="e.g. Wembley Stadium"
              placeholderTextColor={MeshipayBrand.muted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Search places" onPress={onSearch} disabled={!query.trim() || isSearching} style={({ pressed }) => [styles.searchButton, (!query.trim() || isSearching) && styles.searchButtonDisabled, pressed && styles.controlPressed]}>
              {isSearching ? <ActivityIndicator color={MeshipayBrand.border} /> : <MaterialCommunityIcons name="magnify" size={25} color={MeshipayBrand.border} />}
            </Pressable>
          </View>
          {error ? <Text style={styles.searchFeedback}>{error}</Text> : null}
          {results.map((place) => (
            <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`Center map on ${place.name}`} onPress={() => onSelect(place)} style={({ pressed }) => [styles.placeResult, pressed && styles.resultPressed]}>
              <MaterialCommunityIcons name="map-marker" size={22} color={MeshipayBrand.primary} />
              <View style={styles.placeCopy}>
                <Text numberOfLines={1} style={styles.placeName}>{place.name}</Text>
                <Text numberOfLines={2} style={styles.placeAddress}>{place.fullAddress}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={20} color={MeshipayBrand.foreground} />
            </Pressable>
          ))}
          {!isSearching && !error && results.length === 0 ? <Text style={styles.searchFeedback}>SEARCH RESULTS ARE TEMPORARY AND ARE NOT SAVED BY MESHiPAY.</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function MapShell({ children }: { children: React.ReactNode }) {
  return <SafeAreaView edges={['top']} style={styles.container}>{children}</SafeAreaView>;
}

function MapControl({ icon, label, onPress, primary = false }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.controlButton, primary && styles.primaryControl, pressed && styles.controlPressed]}>
      <MaterialCommunityIcons name={icon} size={primary ? 28 : 30} color={MeshipayBrand.border} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: MeshipayBrand.background },
  topOverlay: { position: 'absolute', top: 12, left: 16, right: 88 },
  titlePlate: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 10, backgroundColor: MeshipayBrand.glass, ...NeoBrutalShadow.sm },
  title: { color: MeshipayBrand.primary, fontSize: 19, fontWeight: '900', letterSpacing: 1.3 },
  subtitle: { marginTop: 2, color: MeshipayBrand.foreground, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  controls: { position: 'absolute', top: 116, right: 16, gap: 14, alignItems: 'center' },
  zoomRail: { overflow: 'hidden', borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 12, backgroundColor: MeshipayBrand.cream, ...NeoBrutalShadow.md },
  controlDivider: { height: 2, backgroundColor: MeshipayBrand.border },
  controlButton: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: MeshipayBrand.cream },
  primaryControl: { borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 14, backgroundColor: MeshipayBrand.primary, ...NeoBrutalShadow.md },
  controlPressed: { transform: [{ translateX: 3 }, { translateY: 3 }], shadowOpacity: 0, elevation: 0 },
  bottomOverlay: { position: 'absolute', right: 16, bottom: Platform.select({ android: 106, default: 96 }), left: 16 },
  statusPlate: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 12, backgroundColor: MeshipayBrand.glass, ...NeoBrutalShadow.sm },
  statusError: { backgroundColor: MeshipayBrand.accentGreen },
  statusText: { flex: 1, color: MeshipayBrand.foreground, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  statusAction: { paddingHorizontal: 8, paddingVertical: 5, borderWidth: 2, borderColor: MeshipayBrand.border, borderRadius: 6, backgroundColor: MeshipayBrand.primary },
  statusActionText: { color: MeshipayBrand.border, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  matchCard: { marginTop: 10, borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 12, backgroundColor: MeshipayBrand.backgroundElevated, padding: 12, ...NeoBrutalShadow.sm },
  matchTitle: { color: MeshipayBrand.primary, fontSize: 15, fontWeight: '900' },
  matchCopy: { color: MeshipayBrand.foreground, marginTop: 3, fontSize: 11, fontWeight: '700' },
  matchClose: { alignSelf: 'flex-end', marginTop: 8, borderWidth: 2, borderColor: MeshipayBrand.border, borderRadius: 6, backgroundColor: MeshipayBrand.primary, paddingHorizontal: 8, paddingVertical: 4 },
  matchCloseText: { color: MeshipayBrand.border, fontSize: 10, fontWeight: '900' },
  matchActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  matchBuy: { borderWidth: 2, borderColor: MeshipayBrand.border, borderRadius: 6, backgroundColor: MeshipayBrand.primary, paddingHorizontal: 8, paddingVertical: 4 },
  redMatchPin: { width: 30, height: 30, borderRadius: 18, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#D71920', alignItems: 'center', justifyContent: 'center' },
  redMatchCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  setupCard: { alignSelf: 'center', width: '86%', marginTop: '52%', alignItems: 'center', padding: 24, borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 14, backgroundColor: MeshipayBrand.backgroundElevated, ...NeoBrutalShadow.md },
  setupTitle: { marginTop: 14, color: MeshipayBrand.primary, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  setupCopy: { marginTop: 8, color: MeshipayBrand.muted, fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.56)' },
  searchPanel: { minHeight: 340, padding: 18, borderTopWidth: 3, borderColor: MeshipayBrand.border, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: MeshipayBrand.backgroundElevated, ...NeoBrutalShadow.md },
  searchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  searchTitle: { color: MeshipayBrand.primary, fontSize: 21, fontWeight: '900', letterSpacing: 1.1 },
  searchHint: { marginTop: 3, color: MeshipayBrand.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 10, backgroundColor: MeshipayBrand.cream },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, height: 52, paddingHorizontal: 13, borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 10, color: MeshipayBrand.foreground, backgroundColor: MeshipayBrand.background, fontSize: 15, fontWeight: '700' },
  searchButton: { width: 54, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: MeshipayBrand.border, borderRadius: 10, backgroundColor: MeshipayBrand.primary, ...NeoBrutalShadow.sm },
  searchButtonDisabled: { opacity: 0.55 },
  searchFeedback: { marginTop: 16, color: MeshipayBrand.muted, fontSize: 11, fontWeight: '800', lineHeight: 16, letterSpacing: 0.4 },
  placeResult: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderWidth: 2, borderColor: MeshipayBrand.border, borderRadius: 10, backgroundColor: MeshipayBrand.accentGreen },
  resultPressed: { transform: [{ translateY: 2 }] },
  placeCopy: { flex: 1 },
  placeName: { color: MeshipayBrand.foreground, fontSize: 14, fontWeight: '900' },
  placeAddress: { marginTop: 2, color: MeshipayBrand.muted, fontSize: 11, fontWeight: '600', lineHeight: 15 },
});
