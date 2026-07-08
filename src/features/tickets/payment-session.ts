import {
  buildQrPayload,
  createReceiptId,
  createSessionId,
  type QrPayload,
} from '@/features/tickets/qr-payload';
import { upsertTicket } from '@/features/tickets/ticket-storage';
import { toTransferPayload } from '@/features/tickets/ticket-transfer';
import type { TicketEvent, TicketEventInput } from '@/features/tickets/ticket-events';
import type { AttendeeRecord, TicketRecord } from '@/features/tickets/ticket-types';

const SESSION_TTL_MS = 15 * 60 * 1000;

export type PaymentFulfillment = {
  attendee: AttendeeRecord;
  updatedTicket: TicketRecord;
  events: TicketEventInput[];
};

export async function startPaymentSession(params: {
  ticket: TicketRecord;
  priceUsdt: string;
  receiverAddress: string;
}): Promise<{ ticket: TicketRecord; payload: QrPayload; qrString: string }> {
  const sessionId = createSessionId();
  const pricedTicket: TicketRecord = {
    ...params.ticket,
    priceUsdt: params.priceUsdt,
    updatedAt: new Date().toISOString(),
  };
  const payload = await buildQrPayload({
    sessionId,
    ticket: pricedTicket,
    receiverAddress: params.receiverAddress,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  const nextTicket: TicketRecord = {
    ...pricedTicket,
    status: 'awaiting_payment',
    sessionId,
    topic: payload.topic,
    qrPayload: JSON.stringify(payload),
    qrHash: payload.payloadHash,
    updatedAt: new Date().toISOString(),
  };
  await upsertTicket(nextTicket);
  return { ticket: nextTicket, payload, qrString: JSON.stringify(payload) };
}

export function sessionBootstrapEvents(params: {
  sessionId: string;
  topic: string;
  ticket: TicketRecord;
  receiverAddress: string;
}): TicketEventInput[] {
  return [
    {
      type: 'SESSION_CREATED',
      sessionId: params.sessionId,
      topic: params.topic,
      ticketId: params.ticket.ticketId,
      receiverAddress: params.receiverAddress,
      eventName: params.ticket.eventName,
      priceUsdt: params.ticket.priceUsdt,
    },
    {
      type: 'HELLO',
      sessionId: params.sessionId,
      role: 'receiver',
      walletAddress: params.receiverAddress,
      appVersion: '1.0.0',
    },
  ];
}

export function fulfillPayment(params: {
  ticket: TicketRecord;
  payment: Extract<TicketEvent, { type: 'PAYMENT_SUBMITTED' }>;
  receiverAddress: string;
}): PaymentFulfillment {
  const receiptId = createReceiptId();
  const attendee: AttendeeRecord = {
    attendeeId: `att-${params.payment.eventId}`,
    ticketId: params.ticket.ticketId,
    sessionId: params.payment.sessionId,
    senderAddress: params.payment.senderAddress,
    amountUsdt: params.payment.amountUsdt,
    txHash: params.payment.txHash,
    receiptId,
    paidAt: new Date().toISOString(),
  };
  const remaining = Math.max(0, params.ticket.remainingQuantity - 1);
  const updatedTicket: TicketRecord = {
    ...params.ticket,
    status: remaining > 0 ? 'awaiting_payment' : 'transferred',
    remainingQuantity: remaining,
    senderAddress: params.payment.senderAddress,
    receiptId,
    txHash: params.payment.txHash,
    updatedAt: new Date().toISOString(),
  };
  const transferPayload = toTransferPayload(params.ticket, params.payment.txHash);
  const events: TicketEventInput[] = [
    {
      type: 'PAYMENT_ACK',
      sessionId: params.payment.sessionId,
      txHash: params.payment.txHash,
      senderAddress: params.payment.senderAddress,
    },
    {
      type: 'TICKET_TRANSFERRED',
      sessionId: params.payment.sessionId,
      ticketId: params.ticket.ticketId,
      senderAddress: params.payment.senderAddress,
      receiverAddress: params.receiverAddress,
      receiptId,
      payload: transferPayload,
    },
    {
      type: 'ATTENDEE_SYNCED',
      sessionId: params.payment.sessionId,
      attendeeId: attendee.attendeeId,
      ticketId: params.ticket.ticketId,
      senderAddress: params.payment.senderAddress,
      amountUsdt: params.payment.amountUsdt,
      txHash: params.payment.txHash,
      receiptId,
    },
    {
      type: 'INVENTORY_UPDATED',
      sessionId: params.payment.sessionId,
      ticketId: params.ticket.ticketId,
      remainingQuantity: remaining,
    },
  ];
  return { attendee, updatedTicket, events };
}
