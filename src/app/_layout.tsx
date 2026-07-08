import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { TicketsP2PProvider } from '@/features/tickets/tickets-p2p-context';
import { MeshipayWdkProvider } from '@/features/wdk/wdk-provider';

SplashScreen.preventAutoHideAsync();

const MeshipayDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B100B',
    card: '#141A14',
    primary: '#F5D033',
  },
};

function AppShell() {
  return (
    <ThemeProvider value={MeshipayDarkTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B100B' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-ticket" />
        <Stack.Screen name="ticket-preview/[ticketId]" />
        <Stack.Screen name="pools" />
        <Stack.Screen name="explore" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <MeshipayWdkProvider>
      <TicketsP2PProvider>
        <AppShell />
      </TicketsP2PProvider>
    </MeshipayWdkProvider>
  );
}
