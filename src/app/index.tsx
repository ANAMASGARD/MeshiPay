import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { MeshipayDotsLoader } from '@/components/ui/meshipay-dots-loader';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { useWdkApp } from '@/features/wdk/wdk-hooks';

export default function IndexScreen() {
  const { state } = useWdkApp();

  if (state.status === 'INITIALIZING' || state.status === 'REINITIALIZING') {
    return (
      <View style={styles.loading}>
        <MeshipayDotsLoader size="lg" label="STARTING WALLET" />
      </View>
    );
  }

  if (state.status === 'READY') {
    return <Redirect href="/(tabs)/gate" />;
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
