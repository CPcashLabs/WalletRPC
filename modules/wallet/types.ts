
export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logo?: string;
  isCustom?: boolean;
}

export interface ChainConfig {
  id: number;
  name: string;
  defaultRpcUrl: string;
  currencySymbol: string;
  explorerUrl: string;
  tokens: TokenConfig[];
  isTestnet?: boolean;
  isCustom?: boolean;
  chainType?: 'EVM' | 'TRON';
}

export interface TrackedSafe {
  address: string;
  name: string;
  chainId: number;
}

export interface TransactionRecord {
  id: string;
  hash?: string;
  status: 'queued' | 'submitted' | 'confirmed' | 'failed';
  timestamp: number;
  summary: string;
  explorerUrl: string;
  error?: string;
}

export interface SafePendingTx {
  id: string; // timestamp
  to: string;
  value: string;
  data: string;
  nonce: number;
  safeTxHash: string;
  signatures: Record<string, string>; // owner -> signature
  summary: string;
  executor?: string;
}

export interface SafeContracts {
  proxyFactory: string;
  singleton: string;
  fallbackHandler: string;
}

export interface SafeDetails {
  owners: string[];
  threshold: number;
  nonce: number;
}
