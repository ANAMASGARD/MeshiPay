/** Default export for TypeScript; Metro resolves `.native` / `.web` at bundle time. */
export {
  BaseAsset,
  useAccount,
  useWdkApp,
  useWalletManager,
} from './wdk-hooks.web';

export type {
  UseAccountParams,
  UseAccountReturn,
  WdkAppState,
} from './wdk-hooks.web';

export type {
  BaseAsset as MeshipayBaseAsset,
  MeshipayWdkAppState,
  TransactionParams,
  TransactionResult,
} from './wdk-types';
