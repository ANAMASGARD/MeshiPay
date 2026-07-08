import { z } from 'zod';

import { ticketTransferPayloadSchema } from '@/features/tickets/ticket-transfer';

const baseEvent = z.object({
  v: z.literal(1),
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  ts: z.number(),
});

export const ticketEventSchema = z.discriminatedUnion('type', [
  baseEvent.extend({
    type: z.literal('SESSION_CREATED'),
    topic: z.string().min(1),
    ticketId: z.string().min(1),
    receiverAddress: z.string().min(1),
    eventName: z.string().min(1),
    priceUsdt: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('TICKET_OFFERED'),
    ticketId: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
  }),
  baseEvent.extend({
    type: z.literal('PAYMENT_REQUESTED'),
    senderAddress: z.string().min(1),
    amountUsdt: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('PAYMENT_SUBMITTED'),
    senderAddress: z.string().min(1),
    amountUsdt: z.string().min(1),
    txHash: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('PAYMENT_ACK'),
    txHash: z.string().min(1),
    senderAddress: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('TICKET_TRANSFERRED'),
    ticketId: z.string().min(1),
    senderAddress: z.string().min(1),
    receiverAddress: z.string().min(1),
    receiptId: z.string().min(1),
    payload: ticketTransferPayloadSchema,
  }),
  baseEvent.extend({
    type: z.literal('RECEIPT_CREATED'),
    receiptId: z.string().min(1),
    txHash: z.string().min(1),
    senderAddress: z.string().min(1),
    receiverAddress: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('ATTENDEE_SYNCED'),
    attendeeId: z.string().min(1),
    ticketId: z.string().min(1),
    senderAddress: z.string().min(1),
    amountUsdt: z.string().min(1),
    txHash: z.string().min(1),
    receiptId: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('INVENTORY_UPDATED'),
    ticketId: z.string().min(1),
    remainingQuantity: z.number().int().min(0),
  }),
  baseEvent.extend({
    type: z.literal('CHECK_IN_CONFIRMED'),
    ticketId: z.string().min(1),
    checkInCode: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('HELLO'),
    role: z.enum(['sender', 'receiver']),
    walletAddress: z.string().min(1),
    appVersion: z.string().min(1),
  }),
]);

export type TicketEvent = z.infer<typeof ticketEventSchema>;

export type TicketEventInput = {
  [K in TicketEvent['type']]: Omit<Extract<TicketEvent, { type: K }>, 'v' | 'eventId' | 'ts'>;
}[TicketEvent['type']];

export function parseTicketEvent(raw: unknown): TicketEvent | null {
  const result = ticketEventSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }
  return result.data;
}

export function createTicketEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
