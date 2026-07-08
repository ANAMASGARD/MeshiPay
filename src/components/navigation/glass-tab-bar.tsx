import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MeshipayBrand } from '@/constants/meshipay-brand';

type TabKey = 'pay' | 'gate' | 'tickets' | 'settings';

const TAB_CONFIG: Record<
  TabKey,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  pay: { label: 'PAY', icon: 'qrcode-scan' },
  gate: { label: 'GATE', icon: 'qrcode' },
  tickets: { label: 'TICKETS', icon: 'ticket-confirmation-outline' },
  settings: { label: 'SETTINGS', icon: 'cog-outline' },
};

function routeToTab(routeName: string): TabKey | null {
  if (routeName === 'pay' || routeName === 'gate' || routeName === 'tickets' || routeName === 'settings') {
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
                  {focused ? (
                    <View style={styles.activeIconWrap}>
                      <View style={styles.activeIconShadow} />
                      <View style={styles.activeIcon}>
                        <MaterialCommunityIcons
                          name={config.icon}
                          size={26}
                          color={MeshipayBrand.border}
                        />
                      </View>
                    </View>
                  ) : (
                    <MaterialCommunityIcons
                      name={config.icon}
                      size={26}
                      color={MeshipayBrand.border}
                    />
                  )}
                  <Text style={[styles.label, focused ? styles.labelActive : null]}>
                    {config.label}
                  </Text>
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
    borderRadius: 22,
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
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: MeshipayBrand.navGlass,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minHeight: 68,
    justifyContent: 'flex-end',
  },
  activeIconWrap: {
    position: 'relative',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconShadow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: MeshipayBrand.border,
    bottom: -4,
    right: -4,
  },
  activeIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    backgroundColor: MeshipayBrand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: MeshipayBrand.foreground,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: MeshipayBrand.primary,
  },
});
