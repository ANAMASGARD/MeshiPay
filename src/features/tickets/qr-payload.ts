import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import type { TicketRecord } from '@/features/tickets/ticket-types';

export const qrPayloadSchema = z.object({
  v: z.literal(1),
  kind: z.literal('meshipay-ticket-session'),
  sessionId: z.string().min(1),
  topic: z.string().min(1),
  receiverAddress: z.string().min(1),
  ticketId: z.string().min(1),
  eventName: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  venue: z.string().min(1),
  gate: z.string().min(1),
  seatLabel: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  priceUsdt: z.string().min(1),
  currency: z.literal('USDT_SEPOLIA'),
  expiresAt: z.number(),
  payloadHash: z.string().min(1),
});

export type QrPayload = z.infer<typeof qrPayloadSchema>;

function makeTopic(sessionId: string): string {
  return `meshipay-session-${sessionId}`;
}

async function hashPayload(payload: Omit<QrPayload, 'payloadHash'>): Promise<string> {
  const canonical = JSON.stringify(payload);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

export async function buildQrPayload(params: {
  sessionId: string;
  ticket: TicketRecord;
  receiverAddress: string;
  expiresAt: number;
}): Promise<QrPayload> {
  const topic = makeTopic(params.sessionId);
  const base = {
    v: 1 as const,
    kind: 'meshipay-ticket-session' as const,
    sessionId: params.sessionId,
    topic,
    receiverAddress: params.receiverAddress,
    ticketId: params.ticket.ticketId,
    eventName: params.ticket.eventName,
    homeTeam: params.ticket.homeTeam,
    awayTeam: params.ticket.awayTeam,
    venue: params.ticket.venue,
    gate: params.ticket.gate,
    seatLabel: params.ticket.seatLabel,
    startAt: params.ticket.startAt,
    endAt: params.ticket.endAt,
    priceUsdt: params.ticket.priceUsdt,
    currency: 'USDT_SEPOLIA' as const,
    expiresAt: params.expiresAt,
  };
  const payloadHash = await hashPayload(base);
  return { ...base, payloadHash };
}

export function parseQrPayload(raw: string): QrPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = qrPayloadSchema.safeParse(parsed);
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
  const expected = await hashPayload(rest);
  return expected === payloadHash;
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
