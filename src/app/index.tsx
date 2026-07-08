import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useWdkApp } from '@/features/wdk/wdk-hooks';

export default function IndexScreen() {
  const { state } = useWdkApp();

  if (state.status === 'INITIALIZING' || state.status === 'REINITIALIZING') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={MeshipayBrand.primary} />
      </View>
    );
  }

  if (state.status === 'READY') {
    return <Redirect href="/home" />;
  }

  return <OnboardingScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MeshipayBrand.background,
  },
});
