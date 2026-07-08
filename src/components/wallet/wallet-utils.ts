import type { WdkAppState } from '@/features/wdk/wdk-types';

export function useWalletStatusLabel(
  status: WdkAppState['status'],
  unavailableMessage?: string | null,
): string {
  switch (status) {
    case 'READY':
      return 'Wallet connected';
    case 'LOCKED':
      return 'Wallet locked';
    case 'NO_WALLET':
      return 'No wallet on this device';
    case 'INITIALIZING':
    case 'REINITIALIZING':
      return 'Connecting wallet...';
    default:
      return unavailableMessage ?? 'Wallet unavailable';
  }
}

export function shortWalletAddress(address: string | null | undefined): string {
  if (!address) {
    return '';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
