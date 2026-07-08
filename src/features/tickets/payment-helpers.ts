import { BaseAsset } from '@/features/wdk/wdk-hooks';
import { wdkConfigs } from '@/config/wdk';

const SEPOLIA_USDT_ADDRESS =
  (wdkConfigs.networks.ethereum.config.paymasterToken as { address: string }).address;

export function createSepoliaUsdtAsset(): BaseAsset {
  return new BaseAsset({
    id: 'usdt-sepolia',
    network: 'ethereum',
    symbol: 'USDT',
    name: 'USDT (Sepolia)',
    decimals: 6,
    address: SEPOLIA_USDT_ADDRESS,
    isNative: false,
  });
}

export function usdtToAtomic(amount: string, decimals = 6): string {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Invalid USDT amount');
  }
  const [whole = '0', fraction = ''] = normalized.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, '');
  return combined.length > 0 ? combined : '0';
}

export function formatMatchWindow(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const date = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${startTime} – ${endTime}`;
}

export function shortAddress(address: string | undefined | null): string {
  if (!address) {
    return '—';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
