import type { ReactNode } from 'react';

/** Web shell only — WDK wallet runs in the native dev client. */
export function MeshipayWdkProvider({ children }: { children: ReactNode }) {
  return children;
}
