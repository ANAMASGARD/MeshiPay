import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { reduceTicketEvent } from '@/features/tickets/ticket-event-handler';
import {
  sessionCreatedEvent,
  shouldRebroadcastSessionToSender,
  startPaymentSession,
  validateAndJoinSession,
} from '@/features/tickets/payment-session';
import {
  createTicketEventId,
  parseTicketEvent,
  type TicketEvent,
  type TicketEventInput,
} from '@/features/tickets/ticket-events';
import {
  displayFromSessionCreated,
  type QrPayload,
  type QrPayloadDisplay,
} from '@/features/tickets/qr-payload';
import {
  addAttendee,
  addReceivedTicket,
  loadAttendees,
  loadTickets,
  upsertTicket,
} from '@/features/tickets/ticket-storage';
import type { ActiveSession, AttendeeRecord, TicketRecord } from '@/features/tickets/ticket-types';
import { useP2PRoom } from '@/services/p2p/p2p-room';

type TicketsP2PContextValue = {
  tickets: TicketRecord[];
  attendees: AttendeeRecord[];
  loading: boolean;
  busyMessage: string | null;
  sessionDisplay: QrPayloadDisplay | null;
  refresh: () => Promise<void>;
  peerCount: number;
  isActive: boolean;
  activeTopic: string | null;
  activeSession: ActiveSession | null;
  joinRoom: (topic: string) => void;
  leaveRoom: () => void;
  broadcastTicketEvent: (partial: TicketEventInput) => TicketEvent;
  beginPaymentSession: (
    ticket: TicketRecord,
    priceUsdt: string,
    receiverAddress: string,
  ) => Promise<{ ticket: TicketRecord; qrString: string }>;
  joinPaymentSessionAsSender: (
    raw: string,
    senderAddress: string,
  ) => Promise<{ ok: true; payload: QrPayload } | { ok: false; reason: string }>;
  clearActiveSession: () => void;
};

const TicketsP2PContext = createContext<TicketsP2PContextValue | null>(null);

export function TicketsP2PProvider({ children }: { children: ReactNode }) {
  const p2p = useP2PRoom();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [sessionDisplay, setSessionDisplay] = useState<QrPayloadDisplay | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const lastEventIndexRef = useRef(0);
  const processedPaymentsRef = useRef(new Set<string>());
  const rebroadcastKeysRef = useRef(new Set<string>());
  const ticketsRef = useRef<TicketRecord[]>([]);
  const activeSessionRef = useRef<ActiveSession | null>(null);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const refresh = useCallback(async () => {
    const [nextTickets, nextAttendees] = await Promise.all([loadTickets(), loadAttendees()]);
    setTickets(nextTickets);
    setAttendees(nextAttendees);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
    p2p.ensureWorklet();
  }, [p2p, refresh]);

  const broadcastTicketEvent = useCallback(
    (partial: TicketEventInput) => {
      const event = {
        v: 1 as const,
        eventId: createTicketEventId(),
        ts: Date.now(),
        ...partial,
      } as TicketEvent;
      p2p.broadcast(event);
      return event;
    },
    [p2p],
  );

  const applyActiveSession = useCallback((session: ActiveSession | null) => {
    activeSessionRef.current = session;
    setActiveSession(session);
  }, []);

  const clearActiveSession = useCallback(() => {
    applyActiveSession(null);
    setSessionDisplay(null);
    rebroadcastKeysRef.current.clear();
  }, [applyActiveSession]);

  const beginPaymentSession = useCallback(
    async (ticket: TicketRecord, priceUsdt: string, receiverAddress: string) => {
      setBusyMessage('GENERATING QR');
      try {
        const started = await startPaymentSession({ ticket, priceUsdt, receiverAddress });
        rebroadcastKeysRef.current.clear();
        setTickets((current) => {
          const index = current.findIndex((item) => item.ticketId === started.ticket.ticketId);
          if (index < 0) {
            return [started.ticket, ...current];
          }
          const next = [...current];
          next[index] = started.ticket;
          return next;
        });
        const receiverSession: ActiveSession = {
          sessionId: started.payload.sessionId,
          role: 'receiver',
        };
        applyActiveSession(receiverSession);
        p2p.joinRoom(started.payload.topic);
        started.bootstrapEvents.forEach((partial) => broadcastTicketEvent(partial));
        return { ticket: started.ticket, qrString: started.qrString };
      } finally {
        setBusyMessage(null);
      }
    },
    [applyActiveSession, broadcastTicketEvent, p2p],
  );

  const joinPaymentSessionAsSender = useCallback(
    async (raw: string, senderAddress: string) => {
      setBusyMessage('JOINING SESSION');
      try {
        const result = await validateAndJoinSession(raw);
        if (!result.ok) {
          return result;
        }

        const senderSession: ActiveSession = {
          sessionId: result.payload.sessionId,
          role: 'sender',
          receiverAddress: result.payload.receiverAddress,
        };
        applyActiveSession(senderSession);
        setSessionDisplay(null);
        p2p.joinRoom(result.payload.topic);
        broadcastTicketEvent({
          type: 'HELLO',
          sessionId: result.payload.sessionId,
          role: 'sender',
          walletAddress: senderAddress,
          appVersion: '1.0.0',
        });
        broadcastTicketEvent({
          type: 'PAYMENT_REQUESTED',
          sessionId: result.payload.sessionId,
          senderAddress,
          amountUsdt: result.payload.priceUsdt,
        });

        return result;
      } finally {
        setBusyMessage(null);
      }
    },
    [applyActiveSession, broadcastTicketEvent, p2p],
  );

  const leaveRoom = useCallback(() => {
    p2p.leaveRoom();
    applyActiveSession(null);
    setSessionDisplay(null);
    rebroadcastKeysRef.current.clear();
  }, [applyActiveSession, p2p]);

  const rebroadcastSessionToSender = useCallback(
    (event: TicketEvent) => {
      const session = activeSessionRef.current;
      if (session?.role !== 'receiver' || session.sessionId !== event.sessionId) {
        return;
      }

      const rebroadcastKey =
        event.type === 'HELLO'
          ? `${event.sessionId}:hello:${event.walletAddress}`
          : `${event.sessionId}:payreq:${(event as Extract<TicketEvent, { type: 'PAYMENT_REQUESTED' }>).senderAddress}`;

      if (rebroadcastKeysRef.current.has(rebroadcastKey)) {
        return;
      }
      rebroadcastKeysRef.current.add(rebroadcastKey);

      const ticket = ticketsRef.current.find(
        (item) => item.sessionId === event.sessionId && item.kind === 'issued',
      );
      if (!ticket?.topic) {
        return;
      }

      broadcastTicketEvent(
        sessionCreatedEvent({
          sessionId: event.sessionId,
          topic: ticket.topic,
          ticket,
          receiverAddress: ticket.receiverAddress,
        }),
      );
    },
    [broadcastTicketEvent],
  );

  useEffect(() => {
    const newEvents = p2p.events.slice(lastEventIndexRef.current);
    if (newEvents.length === 0) {
      return;
    }
    lastEventIndexRef.current = p2p.events.length;

    newEvents.forEach((raw) => {
      const event = parseTicketEvent(raw);
      if (!event) {
        return;
      }

      if (shouldRebroadcastSessionToSender(event)) {
        rebroadcastSessionToSender(event);
      }

      if (event.type === 'SESSION_CREATED') {
        const session = activeSessionRef.current;
        if (
          session?.role === 'sender' &&
          session.sessionId === event.sessionId &&
          session.receiverAddress === event.receiverAddress
        ) {
          setSessionDisplay(displayFromSessionCreated(event));
        }
      }

      const effect = reduceTicketEvent(
        {
          tickets: ticketsRef.current,
          activeSession: activeSessionRef.current,
          processedPayments: processedPaymentsRef.current,
        },
        event,
      );

      if (effect.type === 'none') {
        return;
      }

      if (effect.type === 'persist_received') {
        addReceivedTicket(effect.ticket)
          .then(setTickets)
          .catch(() => undefined);
        return;
      }

      if (effect.type === 'fulfill_payment') {
        const paymentKey = `${event.sessionId}-${(event as Extract<TicketEvent, { type: 'PAYMENT_SUBMITTED' }>).txHash}`;
        processedPaymentsRef.current.add(paymentKey);
        effect.broadcast.forEach((partial) => broadcastTicketEvent(partial));
        Promise.all([upsertTicket(effect.ticket), addAttendee(effect.attendee)])
          .then(([nextTickets, nextAttendees]) => {
            setTickets(nextTickets);
            setAttendees(nextAttendees);
          })
          .catch(() => undefined);
      }
    });
  }, [broadcastTicketEvent, p2p.events, rebroadcastSessionToSender]);

  const value = useMemo<TicketsP2PContextValue>(
    () => ({
      tickets,
      attendees,
      loading,
      busyMessage,
      sessionDisplay,
      refresh,
      peerCount: p2p.peerCount,
      isActive: p2p.isActive,
      activeTopic: p2p.activeTopic,
      activeSession,
      joinRoom: p2p.joinRoom,
      leaveRoom,
      broadcastTicketEvent,
      beginPaymentSession,
      joinPaymentSessionAsSender,
      clearActiveSession,
    }),
    [
      activeSession,
      attendees,
      beginPaymentSession,
      broadcastTicketEvent,
      busyMessage,
      clearActiveSession,
      joinPaymentSessionAsSender,
      leaveRoom,
      loading,
      p2p.activeTopic,
      p2p.isActive,
      p2p.joinRoom,
      p2p.peerCount,
      refresh,
      sessionDisplay,
      tickets,
    ],
  );

  return <TicketsP2PContext.Provider value={value}>{children}</TicketsP2PContext.Provider>;
}

export function useTicketsP2P(): TicketsP2PContextValue {
  const context = useContext(TicketsP2PContext);
  if (!context) {
    throw new Error('useTicketsP2P must be used within TicketsP2PProvider');
  }
  return context;
}
