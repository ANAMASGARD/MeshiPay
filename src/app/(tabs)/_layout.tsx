import { GlassTabBar } from '@/components/navigation/glass-tab-bar';
import { SwipeTabs } from '@/components/navigation/swipe-tabs';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { PaySwipeLockProvider, usePaySwipeLock } from '@/hooks/use-pay-swipe-lock';
import { usePersona } from '@/features/persona/persona-context';

function TabsLayoutInner() {
  const { locked } = usePaySwipeLock();
  const { persona } = usePersona();
  const isClub = persona === 'club';

  return (
    <SwipeTabs
      initialRouteName={isClub ? 'gate' : 'pay'}
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
      {isClub ? <SwipeTabs.Screen name="gate" options={{ title: 'CREATE' }} /> : null}
      {!isClub ? <SwipeTabs.Screen name="pay" options={{ title: 'PAY', swipeEnabled: !locked }} /> : null}
      {!isClub ? <SwipeTabs.Screen name="tickets" options={{ title: 'TICKETS' }} /> : null}
      {!isClub ? <SwipeTabs.Screen name="map" options={{ title: 'MAP' }} /> : null}
      {isClub ? <SwipeTabs.Screen name="attendees" options={{ title: 'VERIFY' }} /> : null}
      {isClub ? <SwipeTabs.Screen name="issued" options={{ title: 'ISSUED' }} /> : null}
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
