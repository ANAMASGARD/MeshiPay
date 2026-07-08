import { useCallback, useEffect, useRef, useState } from 'react';
import { Worklet } from 'react-native-bare-kit';
import b4a from 'b4a';

import {
  createEventId,
  parseTipPoolEvent,
  type TipPoolEvent,
} from '@/features/pools/tip-pool-event';
import { parseTicketEvent } from '@/features/tickets/ticket-events';

type HostMessage =
  | { kind: 'ready' }
  | { kind: 'joined'; topic: string; peerCount: number }
  | { kind: 'left'; peerCount: number }
  | { kind: 'status'; peerCount: number }
  | { kind: 'event'; event: unknown };

let workletInstance: Worklet | null = null;
let ipcInstance: Worklet['IPC'] | null = null;
const subscribers = new Set<(message: HostMessage) => void>();
const eventSubscribers = new Set<(event: unknown) => void>();
const seenEventIds = new Set<string>();

function emit(message: HostMessage) {
  subscribers.forEach((subscriber) => subscriber(message));
}

function handleHostData(data: unknown) {
  if (!(data instanceof Uint8Array)) {
    return;
  }
  let message: HostMessage;
  try {
    message = JSON.parse(b4a.toString(data)) as HostMessage;
  } catch {
    return;
  }

  emit(message);

  if (message.kind === 'event') {
    const tipEvent = parseTipPoolEvent(message.event);
    const ticketEvent = tipEvent ? null : parseTicketEvent(message.event);
    const event = tipEvent ?? ticketEvent;
    if (!event || seenEventIds.has(event.eventId)) {
      return;
    }
    seenEventIds.add(event.eventId);
    eventSubscribers.forEach((subscriber) => subscriber(event));
  }
}

function sendCommand(command: Record<string, unknown>) {
  if (!ipcInstance) {
    throw new Error('P2P worklet is not running');
  }
  ipcInstance.write(b4a.from(JSON.stringify(command)));
}

export function ensureP2PWorklet(): void {
  if (workletInstance) {
    return;
  }

  const worklet = new Worklet();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundle = require('./p2p-worklet.bundle.js');

  worklet.start('/p2p.bundle', bundle);
  workletInstance = worklet;
  ipcInstance = worklet.IPC;

  if (!ipcInstance) {
    throw new Error('P2P worklet IPC is unavailable');
  }

  ipcInstance.on('data', handleHostData);
}

export function shutdownP2PWorklet(): void {
  if (ipcInstance) {
    try {
      sendCommand({ cmd: 'leave' });
    } catch {
      // worklet may already be gone
    }
  }
  workletInstance = null;
  ipcInstance = null;
  seenEventIds.clear();
}

export function joinRoom(topic: string): void {
  ensureP2PWorklet();
  sendCommand({ cmd: 'join', topic });
}

export function leaveRoom(): void {
  if (!ipcInstance) {
    return;
  }
  sendCommand({ cmd: 'leave' });
}

export function broadcast(event: unknown): void {
  ensureP2PWorklet();
  if (
    typeof event === 'object' &&
    event !== null &&
    'eventId' in event &&
    typeof (event as { eventId: unknown }).eventId === 'string'
  ) {
    seenEventIds.add((event as { eventId: string }).eventId);
  }
  sendCommand({ cmd: 'broadcast', event });
}

export function subscribeEvents(callback: (event: unknown) => void): () => void {
  eventSubscribers.add(callback);
  return () => eventSubscribers.delete(callback);
}

export function subscribeHost(callback: (message: HostMessage) => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function useP2PRoom() {
  const [peerCount, setPeerCount] = useState(0);
  const [events, setEvents] = useState<unknown[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribeHost = subscribeHost((message) => {
      if (!mountedRef.current) {
        return;
      }
      if (message.kind === 'status' || message.kind === 'joined') {
        setPeerCount(message.peerCount);
      }
      if (message.kind === 'joined') {
        setIsActive(true);
        setActiveTopic(message.topic);
      }
      if (message.kind === 'left') {
        setIsActive(false);
        setActiveTopic(null);
        setPeerCount(0);
      }
    });

    const unsubscribeEvents = subscribeEvents((event) => {
      if (!mountedRef.current) {
        return;
      }
      setEvents((current) => [...current, event]);
    });

    return () => {
      unsubscribeHost();
      unsubscribeEvents();
    };
  }, []);

  const joinRoomHook = useCallback((topic: string) => {
    setEvents([]);
    seenEventIds.clear();
    joinRoom(topic);
  }, []);

  const leaveRoomHook = useCallback(() => {
    leaveRoom();
    setEvents([]);
    setIsActive(false);
    setActiveTopic(null);
    setPeerCount(0);
  }, []);

  const broadcastHook = useCallback((event: unknown) => {
    broadcast(event);
    setEvents((current) => [...current, event]);
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
    peerCount,
    events,
    isActive,
    activeTopic,
    joinRoom: joinRoomHook,
    leaveRoom: leaveRoomHook,
    broadcast: broadcastHook,
    createPoolEvent,
    pledgeEvent,
    settledEvent,
    ensureWorklet: ensureP2PWorklet,
    shutdownWorklet: shutdownP2PWorklet,
  };
}
