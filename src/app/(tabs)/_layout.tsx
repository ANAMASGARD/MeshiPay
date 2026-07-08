import { GlassTabBar } from '@/components/navigation/glass-tab-bar';
import { SwipeTabs } from '@/components/navigation/swipe-tabs';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { PaySwipeLockProvider, usePaySwipeLock } from '@/hooks/use-pay-swipe-lock';

function TabsLayoutInner() {
  const { locked } = usePaySwipeLock();

  return (
    <SwipeTabs
      initialRouteName="gate"
      tabBar={(props) => <GlassTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: true,
        lazyPreloadDistance: 0,
        sceneStyle: { backgroundColor: MeshipayBrand.background },
        tabBarShowLabel: false,
        tabBarIndicatorStyle: { height: 0, opacity: 0 },
        tabBarStyle: { height: 0 },
      }}>
      <SwipeTabs.Screen name="gate" options={{ title: 'GATE' }} />
      <SwipeTabs.Screen name="pay" options={{ title: 'PAY', swipeEnabled: !locked }} />
      <SwipeTabs.Screen name="tickets" options={{ title: 'TICKETS' }} />
      <SwipeTabs.Screen name="settings" options={{ title: 'SETTINGS' }} />
    </SwipeTabs>
  );
}

export default function TabsLayout() {
  return (
    <PaySwipeLockProvider>
      <TabsLayoutInner />
    </PaySwipeLockProvider>
  );
}
