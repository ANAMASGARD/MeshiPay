import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { TicketsProvider } from '@/features/tickets/tickets-context';
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
        <Stack.Screen name="explore" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <MeshipayWdkProvider>
      <TicketsProvider>
        <AppShell />
      </TicketsProvider>
    </MeshipayWdkProvider>
  );
}
