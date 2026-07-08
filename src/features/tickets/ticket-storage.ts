import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AttendeeRecord, TicketDraftInput, TicketRecord } from '@/features/tickets/ticket-types';
import { createCheckInCode } from '@/features/tickets/qr-payload';

const TICKETS_KEY = '@meshipay/tickets_v2';
const ATTENDEES_KEY = '@meshipay/attendees_v1';
const SESSIONS_KEY = '@meshipay/sessions_v1';
const PAID_SESSIONS_KEY = '@meshipay/paid_sessions_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function parseArray<T>(raw: string | null, guard: (item: unknown) => item is T): T[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(guard);
  } catch {
    return [];
  }
}

function isTicketRecord(item: unknown): item is TicketRecord {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as TicketRecord).ticketId === 'string' &&
    typeof (item as TicketRecord).eventName === 'string'
  );
}

function isAttendeeRecord(item: unknown): item is AttendeeRecord {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as AttendeeRecord).attendeeId === 'string'
  );
}

export async function loadTickets(): Promise<TicketRecord[]> {
  const raw = await AsyncStorage.getItem(TICKETS_KEY);
  return parseArray(raw, isTicketRecord);
}

export async function saveTickets(tickets: TicketRecord[]): Promise<void> {
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

export async function loadAttendees(): Promise<AttendeeRecord[]> {
  const raw = await AsyncStorage.getItem(ATTENDEES_KEY);
  return parseArray(raw, isAttendeeRecord);
}

export async function saveAttendees(attendees: AttendeeRecord[]): Promise<void> {
  await AsyncStorage.setItem(ATTENDEES_KEY, JSON.stringify(attendees));
}

export async function clearTicketData(): Promise<void> {
  await AsyncStorage.multiRemove([TICKETS_KEY, ATTENDEES_KEY, SESSIONS_KEY, PAID_SESSIONS_KEY]);
}

export async function loadPaidSessions(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PAID_SESSIONS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  const paid = await loadPaidSessions();
  return paid.includes(sessionId);
}

export async function markSessionPaid(sessionId: string): Promise<void> {
  const paid = await loadPaidSessions();
  if (paid.includes(sessionId)) {
    return;
  }
  await AsyncStorage.setItem(PAID_SESSIONS_KEY, JSON.stringify([sessionId, ...paid]));
}

export function createTicketFromDraft(
  input: TicketDraftInput,
  receiverAddress: string,
): TicketRecord {
  const timestamp = nowIso();
  return {
    ticketId: `ticket-${Date.now()}`,
    kind: 'issued',
    eventName: input.eventName.trim(),
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    venue: input.venue.trim(),
    gate: input.gate.trim(),
    seatLabel: input.seatLabel.trim(),
    startAt: input.startAt,
    endAt: input.endAt,
    priceUsdt: input.priceUsdt.trim(),
    currency: 'USDT_SEPOLIA',
    quantity: input.quantity,
    remainingQuantity: input.quantity,
    receiverAddress,
    status: 'draft',
    checkInCode: createCheckInCode(),
    notes: input.notes?.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function upsertTicket(ticket: TicketRecord): Promise<TicketRecord[]> {
  const tickets = await loadTickets();
  const index = tickets.findIndex((item) => item.ticketId === ticket.ticketId);
  const next = [...tickets];
  if (index >= 0) {
    next[index] = ticket;
  } else {
    next.unshift(ticket);
  }
  await saveTickets(next);
  return next;
}

export async function getTicketById(ticketId: string): Promise<TicketRecord | null> {
  const tickets = await loadTickets();
  return tickets.find((ticket) => ticket.ticketId === ticketId) ?? null;
}

export async function addReceivedTicket(ticket: TicketRecord): Promise<TicketRecord[]> {
  const tickets = await loadTickets();
  const next = [{ ...ticket, kind: 'received' as const }, ...tickets];
  await saveTickets(next);
  return next;
}

export async function addAttendee(attendee: AttendeeRecord): Promise<AttendeeRecord[]> {
  const attendees = await loadAttendees();
  const next = [attendee, ...attendees];
  await saveAttendees(next);
  return next;
}
