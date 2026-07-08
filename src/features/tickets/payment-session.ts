import {
  buildQrPayload,
  createReceiptId,
  createSessionId,
  isQrExpired,
  parseQrPayload,
  verifyQrPayload,
  type QrPayload,
} from '@/features/tickets/qr-payload';
import {
  isSessionPaid,
  savePaymentSession,
  upsertTicket,
} from '@/features/tickets/ticket-storage';
import { toTransferPayload } from '@/features/tickets/ticket-transfer';
import type { TicketEvent, TicketEventInput } from '@/features/tickets/ticket-events';
import type { AttendeeRecord, PaymentSession, TicketRecord } from '@/features/tickets/ticket-types';

export const SESSION_TTL_MS = 15 * 60 * 1000;

export type PaymentFulfillment = {
  attendee: AttendeeRecord;
  updatedTicket: TicketRecord;
  events: TicketEventInput[];
};

export type ValidateSessionResult =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: string };

export async function validateAndJoinSession(raw: string): Promise<ValidateSessionResult> {
  const parsed = parseQrPayload(raw);
  if (!parsed) {
    return { ok: false, reason: 'This QR is not a Meshipay payment session.' };
  }

  const validHash = await verifyQrPayload(parsed);
  if (!validHash) {
    return { ok: false, reason: 'QR payload hash mismatch — possible tampering.' };
  }

  if (isQrExpired(parsed)) {
    return { ok: false, reason: 'This payment QR has expired. Ask the receiver to generate a fresh one.' };
  }

  const alreadyPaid = await isSessionPaid(parsed.sessionId);
  if (alreadyPaid) {
    return { ok: false, reason: 'This session was already settled.' };
  }

  return { ok: true, payload: parsed };
}

export function canFulfillPayment(
  ticket: TicketRecord,
  payment: Extract<TicketEvent, { type: 'PAYMENT_SUBMITTED' }>,
): boolean {
  if (!payment.txHash || payment.txHash.trim() === '') {
    return false;
  }
  if (!payment.senderAddress || payment.senderAddress === 'unknown') {
    return false;
  }
  if (payment.amountUsdt !== ticket.priceUsdt) {
    return false;
  }
  return ticket.sessionId === payment.sessionId && ticket.kind === 'issued';
}

export async function startPaymentSession(params: {
  ticket: TicketRecord;
  priceUsdt: string;
  receiverAddress: string;
}): Promise<{
  ticket: TicketRecord;
  payload: QrPayload;
  qrString: string;
  bootstrapEvents: TicketEventInput[];
}> {
  const sessionId = createSessionId();
  const pricedTicket: TicketRecord = {
    ...params.ticket,
    priceUsdt: params.priceUsdt,
    updatedAt: new Date().toISOString(),
  };
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = await buildQrPayload({
    sessionId,
    ticket: pricedTicket,
    receiverAddress: params.receiverAddress,
    expiresAt,
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

  const paymentSession: PaymentSession = {
    sessionId,
    ticketId: nextTicket.ticketId,
    topic: payload.topic,
    qrPayload: JSON.stringify(payload),
    qrHash: payload.payloadHash,
    expiresAt,
    createdAt: new Date().toISOString(),
  };
  await savePaymentSession(paymentSession);

  const bootstrapEvents = sessionBootstrapEvents({
    sessionId,
    topic: payload.topic,
    ticket: nextTicket,
    receiverAddress: params.receiverAddress,
  });

  return {
    ticket: nextTicket,
    payload,
    qrString: JSON.stringify(payload),
    bootstrapEvents,
  };
}

export function sessionCreatedEvent(params: {
  sessionId: string;
  topic: string;
  ticket: TicketRecord;
  receiverAddress: string;
}): TicketEventInput {
  return {
    type: 'SESSION_CREATED',
    sessionId: params.sessionId,
    topic: params.topic,
    ticketId: params.ticket.ticketId,
    receiverAddress: params.receiverAddress,
    eventName: params.ticket.eventName,
    homeTeam: params.ticket.homeTeam,
    awayTeam: params.ticket.awayTeam,
    venue: params.ticket.venue,
    gate: params.ticket.gate,
    seatLabel: params.ticket.seatLabel,
    startAt: params.ticket.startAt,
    endAt: params.ticket.endAt,
    priceUsdt: params.ticket.priceUsdt,
  };
}

export function sessionBootstrapEvents(params: {
  sessionId: string;
  topic: string;
  ticket: TicketRecord;
  receiverAddress: string;
}): TicketEventInput[] {
  return [
    sessionCreatedEvent(params),
    {
      type: 'HELLO',
      sessionId: params.sessionId,
      role: 'receiver',
      walletAddress: params.receiverAddress,
      appVersion: '1.0.0',
    },
  ];
}

/** Receiver re-sends session metadata when a sender joins (P2P has no replay buffer). */
export function shouldRebroadcastSessionToSender(event: TicketEvent): boolean {
  if (event.type === 'HELLO' && event.role === 'sender') {
    return true;
  }
  return event.type === 'PAYMENT_REQUESTED';
}

export function clearSessionFields(ticket: TicketRecord): TicketRecord {
  return {
    ...ticket,
    sessionId: undefined,
    topic: undefined,
    qrPayload: undefined,
    qrHash: undefined,
    status: ticket.remainingQuantity > 0 ? 'draft' : ticket.status,
    updatedAt: new Date().toISOString(),
  };
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
  let updatedTicket: TicketRecord = {
    ...params.ticket,
    status: remaining > 0 ? 'awaiting_payment' : 'transferred',
    remainingQuantity: remaining,
    senderAddress: params.payment.senderAddress,
    receiptId,
    txHash: params.payment.txHash,
    updatedAt: new Date().toISOString(),
  };

  if (remaining > 0) {
    updatedTicket = clearSessionFields(updatedTicket);
  }

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
