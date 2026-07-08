import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createEventId,
  type TipPoolEvent,
} from '@/features/pools/tip-pool-event';

const WEB_MESSAGE =
  'P2P tip pools require the Meshipay dev client on Android or iOS. Web preview is UI-only.';

export function ensureP2PWorklet(): void {
  // no-op on web
}

export function shutdownP2PWorklet(): void {
  // no-op on web
}

export function joinRoom(_topic: string): void {
  console.warn(WEB_MESSAGE);
}

export function leaveRoom(): void {
  // no-op on web
}

export function broadcast(_event: TipPoolEvent): void {
  console.warn(WEB_MESSAGE);
}

export function useP2PRoom() {
  const [events] = useState<TipPoolEvent[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const noopRoom = useCallback((_topic: string) => {
    console.warn(WEB_MESSAGE);
  }, []);

  const noopBroadcast = useCallback((_event: TipPoolEvent) => {
    console.warn(WEB_MESSAGE);
  }, []);

  const createPoolEvent = useCallback(
    (params: {
      roomId: string;
      matchLabel: string;
      targetUsdt: string;
      creator: string;
    }): TipPoolEvent => ({
      v: 1,
      eventId: createEventId(),
      roomId: params.roomId,
      ts: Date.now(),
      type: 'POOL_CREATED',
      matchLabel: params.matchLabel,
      targetUsdt: params.targetUsdt,
      creator: params.creator,
    }),
    [],
  );

  const pledgeEvent = useCallback(
    (params: { roomId: string; from: string; amount: string }): TipPoolEvent => ({
      v: 1,
      eventId: createEventId(),
      roomId: params.roomId,
      ts: Date.now(),
      type: 'TIP_PLEDGED',
      from: params.from,
      amount: params.amount,
    }),
    [],
  );

  const settledEvent = useCallback(
    (params: { roomId: string; txHash: string; recipient: string }): TipPoolEvent => ({
      v: 1,
      eventId: createEventId(),
      roomId: params.roomId,
      ts: Date.now(),
      type: 'TIP_SETTLED',
      txHash: params.txHash,
      recipient: params.recipient,
    }),
    [],
  );

  return {
    peerCount: 0,
    events,
    isActive: false,
    activeTopic: null as string | null,
    joinRoom: noopRoom,
    leaveRoom: () => undefined,
    broadcast: noopBroadcast,
    createPoolEvent,
    pledgeEvent,
    settledEvent,
    ensureWorklet: ensureP2PWorklet,
    shutdownWorklet: shutdownP2PWorklet,
  };
}
