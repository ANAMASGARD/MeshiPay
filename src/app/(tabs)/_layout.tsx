import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/navigation/glass-tab-bar';
import { MeshipayBrand } from '@/constants/meshipay-brand';

export default function TabsLayout() {
  return (
    <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: MeshipayBrand.background },
        }}>
        <Tabs.Screen name="pay" options={{ title: 'PAY' }} />
        <Tabs.Screen name="gate" options={{ title: 'GATE' }} />
        <Tabs.Screen name="tickets" options={{ title: 'TICKETS' }} />
        <Tabs.Screen name="settings" options={{ title: 'SETTINGS' }} />
    </Tabs>
  );
}
