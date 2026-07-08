import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { createSepoliaUsdtAsset, usdtToAtomic } from '@/features/tickets/payment-helpers';
import {
  isQrPayloadHydrated,
  mergeQrPayloadDisplay,
  parseTicketOfferQr,
  type QrPayload,
} from '@/features/tickets/qr-payload';
import { markSessionPaid } from '@/features/tickets/ticket-storage';
import { useTicketsP2P } from '@/features/tickets/tickets-p2p-context';
import { useAccount } from '@/features/wdk/wdk-hooks';

export type PayStep = 'idle' | 'scanning' | 'confirm' | 'pending_transfer';

export function usePaymentFlow(walletReady: boolean) {
  const { address, send } = useAccount({ network: 'ethereum', accountIndex: 0 });
  const p2p = useTicketsP2P();

  const [step, setStep] = useState<PayStep>('idle');
  const [payload, setPayload] = useState<QrPayload | null>(null);
  const [paying, setPaying] = useState(false);
  const [joining, setJoining] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  const displayPayload = useMemo(() => {
    if (!payload) {
      return null;
    }
    if (isQrPayloadHydrated(payload)) {
      return payload;
    }
    if (p2p.sessionDisplay) {
      return mergeQrPayloadDisplay(payload, p2p.sessionDisplay);
    }
    return payload;
  }, [payload, p2p.sessionDisplay]);

  useEffect(() => {
    if (!pendingSessionId) {
      return;
    }
    const received = p2p.tickets.find(
      (ticket) => ticket.kind === 'received' && ticket.sessionId === pendingSessionId,
    );
    if (received) {
      markSessionPaid(pendingSessionId).catch(() => undefined);
      setStep('idle');
      setPayload(null);
      setPendingSessionId(null);
      setLastTxHash(null);
      Alert.alert('Ticket received', 'Your ticket is saved in the Tickets tab.');
    }
  }, [p2p.tickets, pendingSessionId]);

  const handleScanResult = useCallback(
    async (raw: string) => {
      const offer = parseTicketOfferQr(raw);
      if (offer) {
        Alert.alert(
          'Not a payment QR',
          'This is a ticket display QR. Ask the gatekeeper to tap Receive Payment for a payment QR.',
        );
        setStep('idle');
        return;
      }

      if (!address) {
        Alert.alert('Wallet required', 'Connect your wallet before paying.');
        setStep('idle');
        return;
      }

      setJoining(true);
      try {
        const result = await p2p.joinPaymentSessionAsSender(raw, address);
        if (!result.ok) {
          Alert.alert('Invalid QR', result.reason);
          setStep('idle');
          return;
        }

        setPayload(result.payload);
        setStep('confirm');
      } finally {
        setJoining(false);
      }
    },
    [address, p2p],
  );

  const handlePay = useCallback(async () => {
    if (!walletReady || !address || !payload) {
      Alert.alert('Wallet required', 'Connect your wallet before paying.');
      return;
    }

    setPaying(true);
    try {
      const asset = createSepoliaUsdtAsset();
      const amount = usdtToAtomic(payload.priceUsdt, asset.decimals);
      const result = await send({
        to: payload.receiverAddress,
        asset,
        amount,
      });
      const txHash = result.hash ?? 'submitted';
      setLastTxHash(txHash);
      setPendingSessionId(payload.sessionId);

      p2p.broadcastTicketEvent({
        type: 'PAYMENT_SUBMITTED',
        sessionId: payload.sessionId,
        senderAddress: address,
        amountUsdt: payload.priceUsdt,
        txHash,
      });

      setStep('pending_transfer');
      Alert.alert('Payment sent', 'Waiting for your ticket transfer.');
    } catch (error) {
      Alert.alert(
        'Payment failed',
        error instanceof Error ? error.message : 'Unable to send payment.',
      );
    } finally {
      setPaying(false);
    }
  }, [address, payload, p2p, send, walletReady]);

  const resetFlow = useCallback(() => {
    setStep('idle');
    setPayload(null);
    setLastTxHash(null);
    setPendingSessionId(null);
    p2p.leaveRoom();
  }, [p2p]);

  const cancelConfirm = useCallback(() => {
    setPayload(null);
    setStep('idle');
    p2p.leaveRoom();
  }, [p2p]);

  return {
    step,
    setStep,
    payload: displayPayload,
    payloadHydrated: displayPayload ? isQrPayloadHydrated(displayPayload) : false,
    paying,
    joining,
    busyMessage: p2p.busyMessage,
    lastTxHash,
    peerCount: p2p.peerCount,
    handleScanResult,
    handlePay,
    resetFlow,
    cancelConfirm,
  };
}
