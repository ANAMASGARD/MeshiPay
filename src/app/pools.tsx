import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseAsset, useAccount, useWdkApp, useWalletManager } from '@/features/wdk/wdk-hooks';
import { getWdkUnavailableMessage } from '@/features/wdk/wdk-status';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { reducePoolState } from '@/features/pools/pool-state';
import { useP2PRoom } from '@/services/p2p/p2p-room';
import { BottomTabInset, Spacing } from '@/constants/theme';

function makeRoomTopic(matchLabel: string): string {
  const slug = matchLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `meshipay-${slug || 'pool'}-${Date.now().toString(16)}`;
}

export default function PoolsScreen() {
  const { state } = useWdkApp();
  const { unlock } = useWalletManager();
  const { address, send } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const p2p = useP2PRoom();
  const unavailableMessage = getWdkUnavailableMessage(state);

  const [matchLabel, setMatchLabel] = useState('World Cup Final');
  const [targetUsdt, setTargetUsdt] = useState('10.00');
  const [joinTopic, setJoinTopic] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState('5.00');
  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>();
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    p2p.ensureWorklet();
    return () => {
      p2p.shutdownWorklet();
    };
  }, [p2p]);

  const pool = useMemo(
    () => reducePoolState(p2p.events, address ?? null, p2p.peerCount, pendingTxHash),
    [address, p2p.events, p2p.peerCount, pendingTxHash],
  );

  const walletReady = state.status === 'READY';
  const walletLocked = state.status === 'LOCKED';

  async function handleCreatePool() {
    if (!walletReady || !address) {
      Alert.alert('Wallet required', 'Create and unlock your wallet on the Gate tab first.');
      return;
    }

    const roomId = makeRoomTopic(matchLabel);
    const event = p2p.createPoolEvent({
      roomId,
      matchLabel: matchLabel.trim(),
      targetUsdt: targetUsdt.trim(),
      creator: address,
    });

    p2p.joinRoom(roomId);
    p2p.broadcast(event);
    setJoinTopic(roomId);
  }

  async function handleJoinPool() {
    if (!joinTopic.trim()) {
      Alert.alert('Room topic required', 'Paste a pool room topic to join.');
      return;
    }
    p2p.joinRoom(joinTopic.trim());
  }

  async function handlePledge() {
    if (!walletReady || !address || !pool) {
      return;
    }

    const event = p2p.pledgeEvent({
      roomId: pool.roomId,
      from: address,
      amount: pledgeAmount.trim(),
    });
    p2p.broadcast(event);
  }

  async function handleSettle() {
    if (!walletReady || !address || !pool || !pool.isCreator) {
      return;
    }

    setIsSettling(true);
    setPendingTxHash(undefined);

    try {
      const nativeEth = new BaseAsset({
        id: 'eth',
        network: 'ethereum',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        isNative: true,
      });

      const result = await send({
        to: address,
        asset: nativeEth,
        amount: '100000000000000',
      });

      const txHash = result.hash ?? 'submitted';

      setPendingTxHash(txHash);

      const event = p2p.settledEvent({
        roomId: pool.roomId,
        txHash,
        recipient: address,
      });
      p2p.broadcast(event);
      setPendingTxHash(undefined);
    } catch (error) {
      Alert.alert(
        'Settlement failed',
        error instanceof Error ? error.message : 'Unable to send settlement transaction.',
      );
    } finally {
      setIsSettling(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Tip Pools</ThemedText>
          <ThemedText themeColor="textSecondary">
            P2P fan rooms on Hyperswarm. Pledges coordinate off-chain; settlement uses your WDK
            wallet.
          </ThemedText>

          {unavailableMessage ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="subtitle">Native dev client required</ThemedText>
              <ThemedText themeColor="textSecondary">{unavailableMessage}</ThemedText>
            </ThemedView>
          ) : null}

          {!walletReady && !unavailableMessage && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="subtitle">Wallet not ready</ThemedText>
              <ThemedText themeColor="textSecondary">
                {walletLocked
                  ? 'Unlock your wallet on the Gate tab to create or settle pools.'
                  : 'Create a wallet on the Gate tab before using pools.'}
              </ThemedText>
              {walletLocked && (
                <Pressable style={styles.button} onPress={() => unlock()}>
                  <ThemedText type="smallBold" style={styles.buttonText}>
                    Unlock wallet
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">Create pool</ThemedText>
            <TextInput
              style={styles.input}
              value={matchLabel}
              onChangeText={setMatchLabel}
              placeholder="Match name"
              placeholderTextColor="#888"
            />
            <TextInput
              style={styles.input}
              value={targetUsdt}
              onChangeText={setTargetUsdt}
              placeholder="Target USDT"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
            />
            <Pressable style={styles.button} onPress={handleCreatePool}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Create & join room
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">Join pool</ThemedText>
            <TextInput
              style={styles.input}
              value={joinTopic}
              onChangeText={setJoinTopic}
              placeholder="Room topic"
              placeholderTextColor="#888"
              autoCapitalize="none"
            />
            <Pressable style={styles.buttonSecondary} onPress={handleJoinPool}>
              <ThemedText type="smallBold">Join room</ThemedText>
            </Pressable>
            <ThemedText type="small" themeColor="textSecondary">
              Peers connected: {p2p.peerCount} {p2p.isActive ? `(topic: ${p2p.activeTopic})` : ''}
            </ThemedText>
          </ThemedView>

          {pool && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="subtitle">{pool.matchLabel}</ThemedText>
              <ThemedText>
                Target: {pool.targetUsdt} USDT · Pledged: {pool.totalPledged} USDT
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Phase: {pool.phase} · Creator: {pool.creator.slice(0, 10)}...
              </ThemedText>

              {pool.pledges.map((pledge) => (
                <ThemedText key={`${pledge.from}-${pledge.amount}`} type="small">
                  {pledge.from.slice(0, 10)}... pledged {pledge.amount} USDT
                </ThemedText>
              ))}

              {walletReady && (
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.inputInline]}
                    value={pledgeAmount}
                    onChangeText={setPledgeAmount}
                    placeholder="Pledge USDT"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                  />
                  <Pressable style={styles.buttonSecondary} onPress={handlePledge}>
                    <ThemedText type="smallBold">Pledge</ThemedText>
                  </Pressable>
                </View>
              )}

              {pool.isCreator && walletReady && pool.phase !== 'settled' && (
                <Pressable
                  style={[styles.button, isSettling && styles.buttonDisabled]}
                  onPress={handleSettle}
                  disabled={isSettling}>
                  {isSettling ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.buttonText}>
                      Settle on Sepolia
                    </ThemedText>
                  )}
                </Pressable>
              )}

              {pool.txHash && (
                <ThemedText type="small" themeColor="textSecondary">
                  Tx: {pool.txHash}
                </ThemedText>
              )}
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingBottom: BottomTabInset },
  content: { padding: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111',
    backgroundColor: '#fff',
  },
  inputInline: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff' },
});
