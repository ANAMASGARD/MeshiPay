export type TicketStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'paid'
  | 'transferred'
  | 'checked_in';

export type TicketKind = 'issued' | 'received';

export type TicketRecord = {
  ticketId: string;
  kind: TicketKind;
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  gate: string;
  seatLabel: string;
  startAt: string;
  endAt: string;
  priceUsdt: string;
  currency: 'USDT_SEPOLIA';
  quantity: number;
  remainingQuantity: number;
  receiverAddress: string;
  senderAddress?: string;
  sessionId?: string;
  topic?: string;
  qrPayload?: string;
  qrHash?: string;
  receiptId?: string;
  txHash?: string;
  status: TicketStatus;
  checkInCode: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AttendeeRecord = {
  attendeeId: string;
  ticketId: string;
  sessionId: string;
  senderAddress: string;
  amountUsdt: string;
  txHash: string;
  receiptId: string;
  paidAt: string;
};

export type PaymentSession = {
  sessionId: string;
  ticketId: string;
  topic: string;
  qrPayload: string;
  qrHash: string;
  expiresAt: number;
  createdAt: string;
};

export type TicketDraftInput = {
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  gate: string;
  seatLabel: string;
  startAt: string;
  endAt: string;
  priceUsdt: string;
  quantity: number;
  notes?: string;
};
