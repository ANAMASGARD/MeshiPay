/** Local WDK network config — avoids importing Tether packages from shared config. */
export type MeshipayWdkConfigs = {
  networks: Record<
    string,
    {
      blockchain: string;
      config: Record<string, unknown>;
    }
  >;
};

export const wdkConfigs: MeshipayWdkConfigs = {
  networks: {
    ethereum: {
      blockchain: 'ethereum',
      config: {
        chainId: 11155111,
        provider: 'https://rpc.sepolia.org',
        bundlerUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
        // Required by @tetherto/wdk-wallet-evm-erc-4337 — without this, getAddress throws
        // "Unsupported safe modules version: undefined".
        safeModulesVersion: '0.3.0',
        transferMaxFee: 5000000,
        paymasterToken: {
          address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        },
      },
    },
  },
};
