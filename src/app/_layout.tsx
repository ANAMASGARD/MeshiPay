import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { MeshipayWdkProvider } from '@/features/wdk/wdk-provider';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="pools" />
        <Stack.Screen name="explore" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <MeshipayWdkProvider>
      <AppShell />
    </MeshipayWdkProvider>
  );
}
