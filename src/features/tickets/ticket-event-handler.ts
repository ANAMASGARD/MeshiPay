import { canFulfillPayment, fulfillPayment } from '@/features/tickets/payment-session';
import type { TicketEvent } from '@/features/tickets/ticket-events';
import {
  receivedTicketFromTransfer,
  ticketTransferPayloadSchema,
} from '@/features/tickets/ticket-transfer';
import type { ActiveSession, AttendeeRecord, TicketRecord } from '@/features/tickets/ticket-types';

export type TicketEventEffect =
  | { type: 'persist_received'; ticket: TicketRecord }
  | { type: 'fulfill_payment'; ticket: TicketRecord; attendee: AttendeeRecord; broadcast: ReturnType<typeof fulfillPayment>['events'] }
  | { type: 'none' };

export type TicketEventHandlerState = {
  tickets: TicketRecord[];
  activeSession: ActiveSession | null;
  processedPayments: Set<string>;
};

export function reduceTicketEvent(
  state: TicketEventHandlerState,
  event: TicketEvent,
): TicketEventEffect {
  if (event.type === 'TICKET_TRANSFERRED') {
    if (state.activeSession?.role !== 'sender') {
      return { type: 'none' };
    }
    if (state.activeSession.sessionId !== event.sessionId) {
      return { type: 'none' };
    }

    const locallyIssued = state.tickets.some(
      (item) => item.ticketId === event.ticketId && item.kind === 'issued',
    );
    if (locallyIssued) {
      return { type: 'none' };
    }

    const payload = ticketTransferPayloadSchema.safeParse(event.payload);
    if (!payload.success) {
      return { type: 'none' };
    }

    const received = receivedTicketFromTransfer(event, payload.data);
    return { type: 'persist_received', ticket: received };
  }

  if (event.type === 'PAYMENT_SUBMITTED') {
    if (state.activeSession?.role !== 'receiver') {
      return { type: 'none' };
    }
    if (state.activeSession.sessionId !== event.sessionId) {
      return { type: 'none' };
    }

    const paymentKey = `${event.sessionId}-${event.txHash}`;
    if (state.processedPayments.has(paymentKey)) {
      return { type: 'none' };
    }

    const ticket = state.tickets.find(
      (item) => item.sessionId === event.sessionId && item.kind === 'issued',
    );
    if (!ticket || !canFulfillPayment(ticket, event)) {
      return { type: 'none' };
    }

    const result = fulfillPayment({
      ticket,
      payment: event,
      receiverAddress: ticket.receiverAddress,
    });

    return {
      type: 'fulfill_payment',
      ticket: result.updatedTicket,
      attendee: result.attendee,
      broadcast: result.events,
    };
  }

  return { type: 'none' };
}
