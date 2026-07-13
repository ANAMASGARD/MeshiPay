import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import LottieView from 'lottie-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MeshipayBrand } from '@/constants/meshipay-brand';

type TabKey = 'pay' | 'gate' | 'tickets' | 'map' | 'attendees' | 'issued' | 'settings';

const TAB_CONFIG: Record<
  TabKey,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  pay: { label: 'PAY', icon: 'qrcode-scan' },
  gate: { label: 'CREATE', icon: 'plus-box-outline' },
  tickets: { label: 'TICKETS', icon: 'ticket-confirmation-outline' },
  map: { label: 'MAP', icon: 'map-outline' },
  attendees: { label: 'VERIFY', icon: 'account-check-outline' },
  issued: { label: 'ISSUED', icon: 'ticket-confirmation-outline' },
  settings: { label: 'SETTINGS', icon: 'cog-outline' },
};

function routeToTab(routeName: string): TabKey | null {
  if (routeName === 'pay' || routeName === 'gate' || routeName === 'tickets' || routeName === 'map' || routeName === 'attendees' || routeName === 'issued' || routeName === 'settings') {
    return routeName;
  }
  return null;
}

/**
 * Glass-style tab bar using translucent Views only.
 * Avoids expo-blur so GET STARTED works without a native rebuild.
 */
export function GlassTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.glassOuter}>
        <View style={styles.glassHighlight} />
        <View style={styles.glassPanel}>
          <View style={styles.inner}>
            {state.routes.map((route, index) => {
              const tab = routeToTab(route.name);
              if (!tab) {
                return null;
              }

              const focused = state.index === index;
              const config = TAB_CONFIG[tab];

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={config.label}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                  style={styles.tab}>
                  <View style={styles.iconSlot}>
                    {focused ? (
                      <View style={styles.activeIconWrap}>
                        <View style={styles.activeIconShadow} />
                        <View style={styles.activeIcon}>
                          <LottieView
                            autoPlay
                            loop
                            source={require('@/assets/lottie/active-nav-pulse.json')}
                            style={styles.pulse}
                          />
                          <MaterialCommunityIcons name={config.icon} size={24} color={MeshipayBrand.border} />
                        </View>
                      </View>
                    ) : <MaterialCommunityIcons name={config.icon} size={25} color={MeshipayBrand.foreground} />}
                  </View>
                  <Text style={[styles.label, focused ? styles.labelActive : null]}>{config.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
  },
  glassOuter: {
    position: 'relative',
    borderRadius: 16,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 1,
    zIndex: 2,
  },
  glassPanel: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    backgroundColor: MeshipayBrand.navGlass,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 7,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'space-between',
  },
  iconSlot: { height: 48, alignItems: 'center', justifyContent: 'center' },
  activeIconWrap: {
    position: 'relative',
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconShadow: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.border,
    bottom: -4,
    right: -4,
  },
  activeIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    backgroundColor: MeshipayBrand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: { position: 'absolute', width: 46, height: 46 },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: MeshipayBrand.foreground,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: MeshipayBrand.primary,
  },
});
