import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import type { TicketEvent } from '@/features/tickets/ticket-events';
import type { TicketRecord } from '@/features/tickets/ticket-types';

const currencyLiteral = z.literal('USDT_SEPOLIA');

/** Minimal bootstrap fields encoded in payment QR (slim v1). */
export const qrPayloadSlimSchema = z.object({
  v: z.literal(1),
  kind: z.literal('meshipay-ticket-session'),
  sessionId: z.string().min(1),
  topic: z.string().min(1),
  receiverAddress: z.string().min(1),
  ticketId: z.string().min(1),
  priceUsdt: z.string().min(1),
  expiresAt: z.number(),
  payloadHash: z.string().min(1),
});

/** Display fields — in QR for legacy payloads; hydrated from P2P for slim QRs. */
export const qrPayloadDisplaySchema = z.object({
  eventName: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  venue: z.string().min(1),
  gate: z.string().min(1),
  seatLabel: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  currency: currencyLiteral,
});

/** Legacy full QR payload (backward compatible). */
export const qrPayloadFullSchema = qrPayloadSlimSchema.merge(qrPayloadDisplaySchema);

export const ticketOfferQrSchema = z.object({
  v: z.literal(1),
  kind: z.literal('meshipay-ticket-offer'),
  ticketId: z.string().min(1),
  receiverAddress: z.string().min(1),
  eventName: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  venue: z.string().min(1),
  gate: z.string().min(1),
  seatLabel: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  priceUsdt: z.string().min(1),
  checkInCode: z.string().min(1),
  currency: currencyLiteral,
  payloadHash: z.string().min(1),
});

export type QrPayloadSlim = z.infer<typeof qrPayloadSlimSchema>;
export type QrPayloadDisplay = z.infer<typeof qrPayloadDisplaySchema>;
export type QrPayloadFull = z.infer<typeof qrPayloadFullSchema>;
export type QrPayload = QrPayloadSlim & Partial<QrPayloadDisplay>;
export type TicketOfferQr = z.infer<typeof ticketOfferQrSchema>;

/** @deprecated Use qrPayloadFullSchema — kept for existing imports. */
export const qrPayloadSchema = qrPayloadFullSchema;

function makeTopic(sessionId: string): string {
  return `meshipay-session-${sessionId}`;
}

async function hashCanonical(payload: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(payload);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

export function isQrPayloadHydrated(payload: QrPayload): payload is QrPayloadFull {
  return (
    typeof payload.eventName === 'string' &&
    typeof payload.homeTeam === 'string' &&
    typeof payload.awayTeam === 'string' &&
    typeof payload.venue === 'string' &&
    typeof payload.gate === 'string' &&
    typeof payload.seatLabel === 'string' &&
    typeof payload.startAt === 'string' &&
    typeof payload.endAt === 'string' &&
    payload.currency === 'USDT_SEPOLIA'
  );
}

export function mergeQrPayloadDisplay(
  payload: QrPayload,
  display: QrPayloadDisplay,
): QrPayloadFull {
  return { ...payload, ...display };
}

export async function buildQrPayload(params: {
  sessionId: string;
  ticket: TicketRecord;
  receiverAddress: string;
  expiresAt: number;
}): Promise<QrPayloadSlim> {
  const topic = makeTopic(params.sessionId);
  const base = {
    v: 1 as const,
    kind: 'meshipay-ticket-session' as const,
    sessionId: params.sessionId,
    topic,
    receiverAddress: params.receiverAddress,
    ticketId: params.ticket.ticketId,
    priceUsdt: params.ticket.priceUsdt,
    expiresAt: params.expiresAt,
  };
  const payloadHash = await hashCanonical(base);
  return { ...base, payloadHash };
}

export async function buildTicketOfferQr(params: {
  ticket: TicketRecord;
  receiverAddress: string;
}): Promise<TicketOfferQr> {
  const base = {
    v: 1 as const,
    kind: 'meshipay-ticket-offer' as const,
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
    checkInCode: params.ticket.checkInCode,
    currency: 'USDT_SEPOLIA' as const,
  };
  const payloadHash = await hashCanonical(base);
  return { ...base, payloadHash };
}

export function parseQrPayload(raw: string): QrPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { kind?: string }).kind === 'meshipay-ticket-offer'
    ) {
      return null;
    }

    const full = qrPayloadFullSchema.safeParse(parsed);
    if (full.success) {
      return full.data;
    }

    const slim = qrPayloadSlimSchema.safeParse(parsed);
    if (slim.success) {
      return slim.data;
    }

    return null;
  } catch {
    return null;
  }
}

export function parseTicketOfferQr(raw: string): TicketOfferQr | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = ticketOfferQrSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export async function verifyQrPayload(payload: QrPayload): Promise<boolean> {
  const { payloadHash, ...rest } = payload;

  const slimRest = {
    v: rest.v,
    kind: rest.kind,
    sessionId: rest.sessionId,
    topic: rest.topic,
    receiverAddress: rest.receiverAddress,
    ticketId: rest.ticketId,
    priceUsdt: rest.priceUsdt,
    expiresAt: rest.expiresAt,
  };
  const slimExpected = await hashCanonical(slimRest);
  if (slimExpected === payloadHash) {
    return true;
  }

  if (isQrPayloadHydrated(payload)) {
    const fullExpected = await hashCanonical(rest);
    return fullExpected === payloadHash;
  }

  return false;
}

export function isQrExpired(payload: QrPayload, now = Date.now()): boolean {
  return payload.expiresAt < now;
}

export function createSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createReceiptId(): string {
  return `rcpt-${Date.now().toString(36)}`;
}

export function createCheckInCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function displayFromSessionCreated(
  event: Extract<TicketEvent, { type: 'SESSION_CREATED' }>,
): QrPayloadDisplay {
  return {
    eventName: event.eventName,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    venue: event.venue,
    gate: event.gate,
    seatLabel: event.seatLabel,
    startAt: event.startAt,
    endAt: event.endAt,
    currency: 'USDT_SEPOLIA',
  };
}
