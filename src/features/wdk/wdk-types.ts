export type MeshipayWdkAppState =
  | { status: 'UNAVAILABLE'; message: string }
  | { status: 'INITIALIZING' }
  | { status: 'REINITIALIZING' }
  | { status: 'NO_WALLET' }
  | { status: 'LOCKED'; walletId: string }
  | { status: 'READY'; walletId: string }
  | { status: 'ERROR'; error: Error };

export type WdkAppState = MeshipayWdkAppState;

export type UseAccountParams = {
  accountIndex: number;
  network: string;
};

export type TransactionParams = {
  to: string;
  asset: BaseAsset;
  amount: string;
};

/** Minimal asset type for transaction params in shared screen code. */
export class BaseAsset {
  id: string;
  network: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;

  constructor(props: Record<string, unknown>) {
    this.id = String(props.id ?? '');
    this.network = String(props.network ?? '');
    this.symbol = String(props.symbol ?? '');
    this.name = String(props.name ?? '');
    this.decimals = Number(props.decimals ?? 0);
    this.isNative = props.isNative as boolean | undefined;
  }
}

export type TransactionResult = {
  success: boolean;
  hash: string;
  fee: string;
  error?: string;
};

export type UseAccountReturn = {
  address: string | null | undefined;
  send: (params: TransactionParams) => Promise<TransactionResult>;
};

export type WalletManagerReturn = {
  createWallet: (walletId: string) => Promise<void>;
  unlock: (walletId?: string) => Promise<void>;
};
