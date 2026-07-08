import { z } from 'zod';

const baseEvent = z.object({
  v: z.literal(1),
  eventId: z.string().min(1),
  roomId: z.string().min(1),
  ts: z.number(),
});

export const tipPoolEventSchema = z.discriminatedUnion('type', [
  baseEvent.extend({
    type: z.literal('POOL_CREATED'),
    matchLabel: z.string().min(1),
    targetUsdt: z.string().min(1),
    creator: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('TIP_PLEDGED'),
    from: z.string().min(1),
    amount: z.string().min(1),
  }),
  baseEvent.extend({
    type: z.literal('TIP_SETTLED'),
    txHash: z.string().min(1),
    recipient: z.string().min(1),
  }),
]);

export type TipPoolEvent = z.infer<typeof tipPoolEventSchema>;

export function parseTipPoolEvent(raw: unknown): TipPoolEvent | null {
  const result = tipPoolEventSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[TipPoolEvent] invalid message', result.error.message);
    return null;
  }
  return result.data;
}

export function createEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
