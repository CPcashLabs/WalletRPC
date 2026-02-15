

import { ChainConfig, ExplorerConfig } from "./types";

// Polyfill global for crypto libs
if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

export const normalizeHex = (hex: string) => {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  return '0x' + hex;
};

export const getActiveExplorer = (chain: ChainConfig): ExplorerConfig | undefined => {
  if (!chain.explorers || chain.explorers.length === 0) return undefined;
  
  if (chain.defaultExplorerKey) {
    const found = chain.explorers.find(e => e.key === chain.defaultExplorerKey);
    if (found) return found;
  }
  
  return chain.explorers[0];
};

export const getExplorerLink = (chain: ChainConfig, hash: string) => {
  const explorer = getActiveExplorer(chain);
  if (!explorer || !explorer.txPath) return "#";
  return explorer.txPath.replace("{txid}", hash);
};

export const getExplorerAddressLink = (chain: ChainConfig, address: string) => {
  const explorer = getActiveExplorer(chain);
  if (!explorer || !explorer.addressPath) return "#";
  return explorer.addressPath.replace("{address}", address);
};

export const handleTxError = (e: any, t?: (key: string) => string) => {
  console.error(e);
  if (typeof e === 'string') return e;
  
  const msg = e?.message || e?.error?.message || e?.reason || "";
  const code = e?.code || e?.error?.code;

  // Ethers specific codes
  if (code === 'INSUFFICIENT_FUNDS') return t ? t('tx.err_insufficient_funds') : "Insufficient funds for gas + value. Please top up your wallet.";
  if (code === 'NUMERIC_FAULT') return t ? t('tx.err_numeric_fault') : "Invalid numeric value entered. Check amount and decimals.";
  if (code === 'NONCE_EXPIRED') return t ? t('tx.err_nonce_expired') : "Nonce expired or already used. Please refresh and try again.";
  if (code === 'REPLACEMENT_UNDERPRICED') return t ? t('tx.err_replacement_underpriced') : "Replacement transaction underpriced. Increase gas price.";
  if (code === 'ACTION_REJECTED') return t ? t('tx.err_action_rejected') : "Transaction rejected by user.";
  if (code === 'CALL_EXCEPTION') return t ? t('tx.err_call_exception') : "Transaction reverted on-chain. Check contract logic, token balance, or allowance.";
  if (code === 'UNPREDICTABLE_GAS_LIMIT') return t ? t('tx.err_unpredictable_gas') : "Cannot estimate gas. Transaction may fail on-chain.";

  // RPC strings common in Geth/Parity
  if (msg.includes('insufficient funds')) return t ? t('tx.err_insufficient_funds_short') : "Insufficient funds for transaction.";
  if (msg.includes('gas limit')) return t ? t('tx.err_gas_limit_low') : "Gas limit too low.";
  if (msg.includes('nonce too low')) return t ? t('tx.err_nonce_too_low') : "Nonce too low. Resetting sync...";
  if (msg.includes('already known') || code === -32000) return t ? t('tx.err_already_known') : "Transaction already known (in mempool).";
  if (msg.includes('execution reverted')) return (t ? t('tx.err_execution_reverted') : "Execution reverted.") + (e.reason ? ` ${t ? t('tx.err_reason') : 'Reason'}: ${e.reason}` : "");

  // Safe specific
  if (msg.includes('GS013')) return t ? t('tx.err_safe_gs013') : "Safe Transaction Failed (GS013). Check Safe funds or gas limits.";
  if (msg.includes('GS026')) return t ? t('tx.err_safe_gs026') : "Invalid Safe Signature/Owners (GS026).";
  
  // Default fallback with truncation
  if (msg.length > 150) return msg.slice(0, 150) + "...";
  return msg || (t ? t('tx.err_transaction_failed') : "Transaction failed");
};
