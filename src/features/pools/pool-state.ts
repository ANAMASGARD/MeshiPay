import { Decimal } from 'decimal.js';

import type { TipPoolEvent } from './tip-pool-event';
import { parseTipPoolEvent } from './tip-pool-event';

export type PoolPhase = 'open' | 'settling' | 'settled';

export type PoolViewModel = {
  roomId: string;
  matchLabel: string;
  targetUsdt: string;
  creator: string;
  phase: PoolPhase;
  pledges: { from: string; amount: string }[];
  totalPledged: string;
  txHash?: string;
  recipient?: string;
  peerCount: number;
  isCreator: boolean;
};

function sumPledges(pledges: { amount: string }[]): string {
  return pledges
    .reduce((sum, pledge) => sum.plus(new Decimal(pledge.amount || '0')), new Decimal(0))
    .toFixed(2);
}

export function reducePoolState(
  events: unknown[],
  localAddress: string | null,
  peerCount: number,
  pendingTxHash?: string,
): PoolViewModel | null {
  const tipEvents = events
    .map((event) => parseTipPoolEvent(event))
    .filter((event): event is TipPoolEvent => event !== null);

  const created = tipEvents.find((event) => event.type === 'POOL_CREATED');
  if (!created || created.type !== 'POOL_CREATED') {
    return null;
  }

  const pledges = tipEvents
    .filter((event) => event.type === 'TIP_PLEDGED')
    .map((event) => ({
      from: event.from,
      amount: event.amount,
    }));

  const settled = tipEvents.find((event) => event.type === 'TIP_SETTLED');
  const isCreator =
    localAddress !== null &&
    created.creator.toLowerCase() === localAddress.toLowerCase();

  let phase: PoolPhase = 'open';
  if (settled) {
    phase = 'settled';
  } else if (pendingTxHash) {
    phase = 'settling';
  }

  return {
    roomId: created.roomId,
    matchLabel: created.matchLabel,
    targetUsdt: created.targetUsdt,
    creator: created.creator,
    phase,
    pledges,
    totalPledged: sumPledges(pledges),
    txHash: settled?.type === 'TIP_SETTLED' ? settled.txHash : pendingTxHash,
    recipient: settled?.type === 'TIP_SETTLED' ? settled.recipient : undefined,
    peerCount,
    isCreator,
  };
}
