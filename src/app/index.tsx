import { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAccount, useWdkApp, useWalletManager } from '@/features/wdk/wdk-hooks';
import { getWdkUnavailableMessage } from '@/features/wdk/wdk-status';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

const DEFAULT_WALLET_ID = 'meshipay-main';

export default function HomeScreen() {
  const { state } = useWdkApp();
  const { createWallet, unlock } = useWalletManager();
  const { address } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const unavailableMessage = getWdkUnavailableMessage(state);

  const handleCreateWallet = useCallback(async () => {
    try {
      await createWallet(DEFAULT_WALLET_ID);
      await unlock(DEFAULT_WALLET_ID);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create wallet.';
      // Hot reload can leave the wallet on disk while UI resets to NO_WALLET.
      if (message.includes('already exists')) {
        try {
          await unlock(DEFAULT_WALLET_ID);
          return;
        } catch (unlockError) {
          Alert.alert(
            'Unlock failed',
            unlockError instanceof Error ? unlockError.message : 'Unable to unlock wallet.',
          );
          return;
        }
      }
      Alert.alert('Wallet setup failed', message);
    }
  }, [createWallet, unlock]);

  const handleUnlock = useCallback(async () => {
    try {
      await unlock();
    } catch (error) {
      Alert.alert(
        'Unlock failed',
        error instanceof Error ? error.message : 'Unable to unlock wallet.',
      );
    }
  }, [unlock]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Meshipay
          </ThemedText>
          <ThemedText style={styles.subtitle} themeColor="textSecondary">
            Localized football fan tipping — P2P rooms on Hyperswarm, settlement via your
            self-custodial WDK wallet.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Wallet status</ThemedText>

          {state.status === 'INITIALIZING' || state.status === 'REINITIALIZING' ? (
            <View style={styles.row}>
              <ActivityIndicator />
              <ThemedText>Initializing WDK worklet...</ThemedText>
            </View>
          ) : null}

          {state.status === 'NO_WALLET' ? (
            <>
              <ThemedText themeColor="textSecondary">
                Create a Sepolia testnet wallet to start tipping with fans.
              </ThemedText>
              <Pressable style={styles.button} onPress={handleCreateWallet}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Create wallet
                </ThemedText>
              </Pressable>
            </>
          ) : null}

          {state.status === 'LOCKED' ? (
            <>
              <ThemedText themeColor="textSecondary">
                Wallet locked. Unlock to join or settle tip pools.
              </ThemedText>
              <Pressable style={styles.button} onPress={handleUnlock}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Unlock wallet
                </ThemedText>
              </Pressable>
            </>
          ) : null}

          {state.status === 'READY' ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Sepolia address
              </ThemedText>
              <ThemedText type="code">{address ?? 'Loading address...'}</ThemedText>
              <Link href="/pools" asChild>
                <Pressable style={styles.button}>
                  <ThemedText type="smallBold" style={styles.buttonText}>
                    Open tip pools
                  </ThemedText>
                </Pressable>
              </Link>
            </>
          ) : null}

          {unavailableMessage ? (
            <ThemedText themeColor="textSecondary">{unavailableMessage}</ThemedText>
          ) : null}

          {state.status === 'ERROR' ? (
            <ThemedText themeColor="textSecondary">
              {state.error.message}
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Hackathon tracks</ThemedText>
          <ThemedText type="small">WDK — self-custodial wallet on Sepolia</ThemedText>
          <ThemedText type="small">Pears — Hyperswarm P2P fan rooms</ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
  },
});
