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

import { fulfillPayment, startPaymentSession } from '@/features/tickets/payment-session';
import {
  createTicketEventId,
  parseTicketEvent,
  type TicketEvent,
  type TicketEventInput,
} from '@/features/tickets/ticket-events';
import {
  addAttendee,
  addReceivedTicket,
  loadAttendees,
  loadTickets,
  upsertTicket,
} from '@/features/tickets/ticket-storage';
import {
  receivedTicketFromTransfer,
  ticketTransferPayloadSchema,
} from '@/features/tickets/ticket-transfer';
import type { AttendeeRecord, TicketRecord } from '@/features/tickets/ticket-types';
import { useUserRole } from '@/hooks/use-user-role';
import { useP2PRoom } from '@/services/p2p/p2p-room';

type TicketsP2PContextValue = {
  tickets: TicketRecord[];
  attendees: AttendeeRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  peerCount: number;
  isActive: boolean;
  activeTopic: string | null;
  joinRoom: (topic: string) => void;
  leaveRoom: () => void;
  broadcastTicketEvent: (partial: TicketEventInput) => TicketEvent;
  beginPaymentSession: (ticket: TicketRecord, priceUsdt: string, receiverAddress: string) => Promise<{
    ticket: TicketRecord;
    qrString: string;
  }>;
};

const TicketsP2PContext = createContext<TicketsP2PContextValue | null>(null);

export function TicketsP2PProvider({ children }: { children: ReactNode }) {
  const p2p = useP2PRoom();
  const { role } = useUserRole();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const lastEventIndexRef = useRef(0);
  const processedPaymentsRef = useRef(new Set<string>());
  const ticketsRef = useRef<TicketRecord[]>([]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

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

  const beginPaymentSession = useCallback(
    async (ticket: TicketRecord, priceUsdt: string, receiverAddress: string) => {
      const started = await startPaymentSession({ ticket, priceUsdt, receiverAddress });
      setTickets((current) => {
        const index = current.findIndex((item) => item.ticketId === started.ticket.ticketId);
        if (index < 0) {
          return [started.ticket, ...current];
        }
        const next = [...current];
        next[index] = started.ticket;
        return next;
      });
      p2p.joinRoom(started.payload.topic);
      broadcastTicketEvent({
        type: 'SESSION_CREATED',
        sessionId: started.payload.sessionId,
        topic: started.payload.topic,
        ticketId: started.ticket.ticketId,
        receiverAddress,
        eventName: started.ticket.eventName,
        priceUsdt: started.ticket.priceUsdt,
      });
      broadcastTicketEvent({
        type: 'HELLO',
        sessionId: started.payload.sessionId,
        role: 'receiver',
        walletAddress: receiverAddress,
        appVersion: '1.0.0',
      });
      return { ticket: started.ticket, qrString: started.qrString };
    },
    [broadcastTicketEvent, p2p],
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

      if (event.type === 'TICKET_TRANSFERRED' && role !== 'receiver') {
        const payload = ticketTransferPayloadSchema.safeParse(event.payload);
        if (!payload.success) {
          return;
        }
        const received = receivedTicketFromTransfer(event, payload.data);
        addReceivedTicket(received)
          .then(setTickets)
          .catch(() => undefined);
      }

      if (event.type === 'PAYMENT_SUBMITTED' && role === 'receiver') {
        const paymentKey = `${event.sessionId}-${event.txHash}`;
        if (processedPaymentsRef.current.has(paymentKey)) {
          return;
        }
        processedPaymentsRef.current.add(paymentKey);

        const ticket = ticketsRef.current.find(
          (item) => item.sessionId === event.sessionId && item.kind === 'issued',
        );
        if (!ticket) {
          return;
        }

        const receiverAddress = ticket.receiverAddress;
        const result = fulfillPayment({ ticket, payment: event, receiverAddress });
        result.events.forEach((partial) => broadcastTicketEvent(partial));

        Promise.all([
          upsertTicket(result.updatedTicket),
          addAttendee(result.attendee),
        ])
          .then(([nextTickets, nextAttendees]) => {
            setTickets(nextTickets);
            setAttendees(nextAttendees);
          })
          .catch(() => undefined);
      }
    });
  }, [broadcastTicketEvent, p2p.events, role]);

  const value = useMemo<TicketsP2PContextValue>(
    () => ({
      tickets,
      attendees,
      loading,
      refresh,
      peerCount: p2p.peerCount,
      isActive: p2p.isActive,
      activeTopic: p2p.activeTopic,
      joinRoom: p2p.joinRoom,
      leaveRoom: p2p.leaveRoom,
      broadcastTicketEvent,
      beginPaymentSession,
    }),
    [
      attendees,
      beginPaymentSession,
      broadcastTicketEvent,
      loading,
      p2p.activeTopic,
      p2p.isActive,
      p2p.joinRoom,
      p2p.leaveRoom,
      p2p.peerCount,
      refresh,
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
