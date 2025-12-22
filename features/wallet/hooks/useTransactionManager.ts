
import { useState, useRef, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { TransactionRecord, ChainConfig, TokenConfig } from '../types';
import { FeeService } from '../../../services/feeService';
import { handleTxError, normalizeHex } from '../utils';
import { TronService } from '../../../services/tronService';
import { ERC20_ABI } from '../config';

export interface ProcessResult {
  success: boolean;
  hash?: string;
  error?: string;
  isTimeout?: boolean;
}

/**
 * 【交易生命周期管理器】
 */
export const useTransactionManager = ({
  wallet,
  tronPrivateKey,
  provider,
  activeChain,
  activeChainId,
  activeAccountType,
  fetchData,
  setError,
  handleSafeProposal
}: any) => {

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const localNonceRef = useRef<number | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  /**
   * 【优化点：带锁的 Nonce 同步】
   */
  const syncNonce = useCallback(async () => {
    if (!wallet || !provider || activeChain.chainType === 'TRON' || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    try {
      const n = await provider.getTransactionCount(wallet.address, 'pending');
      localNonceRef.current = n;
    } catch (e) {
      console.error("Nonce sync failed", e);
    } finally {
      isSyncingRef.current = false;
    }
  }, [wallet, provider, activeChain]);

  useEffect(() => {
    if (activeChain.chainType === 'TRON' || !provider || transactions.length === 0) return;
    
    const interval = setInterval(async () => {
      const currentId = Number(activeChainId);
      const pending = transactions.filter(t => 
        t.status === 'submitted' && 
        Number(t.chainId) === currentId &&
        t.hash
      );
      
      if (pending.length === 0) return;

      for (const tx of pending) {
        if (!tx.hash) continue;
        
        try {
          const normalizedHash = normalizeHex(tx.hash);
          const receipt = await provider.getTransactionReceipt(normalizedHash);
          if (receipt) {
            setTransactions(prev => prev.map(t => 
              t.id === tx.id ? { ...t, status: receipt.status === 1 ? 'confirmed' : 'failed' } : t
            ));
            if (receipt.status === 1) setTimeout(fetchData, 1000);
          }
        } catch (e) {
          const errStr = String(e);
          if (!errStr.includes("json: cannot unmarshal")) {
            console.error("Receipt check failed", e);
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [provider, transactions, activeChain, activeChainId, fetchData]);

  const handleSendSubmit = async (data: any): Promise<ProcessResult> => {
    try {
      const isTron = activeChain.chainType === 'TRON';
      
      if (!wallet || (!provider && !isTron)) {
        throw new Error("Wallet/Provider not ready");
      }

      const displaySymbol = data.asset === 'NATIVE' ? activeChain.currencySymbol : data.asset;
      const token = activeChain.tokens.find((t: TokenConfig) => t.symbol === data.asset);

      if (activeAccountType === 'SAFE') {
        if (!handleSafeProposal) throw new Error("Safe manager not initialized");
        
        let targetAddress = data.recipient;
        let value = 0n;
        let callData = data.customData || "0x";

        if (data.asset !== 'NATIVE' && token) {
          targetAddress = token.address;
          value = 0n; 
          const erc20Iface = new ethers.Interface(ERC20_ABI);
          const amountParsed = ethers.parseUnits(data.amount || "0", token.decimals);
          callData = erc20Iface.encodeFunctionData("transfer", [data.recipient, amountParsed]);
        } else {
          value = ethers.parseEther(data.amount || "0");
          callData = "0x";
        }

        const success = await handleSafeProposal(
          targetAddress, 
          value, 
          callData, 
          `Send ${data.amount} ${displaySymbol}`
        );
        return { success };
      }

      if (isTron) {
        if (!tronPrivateKey) throw new Error("TRON private key missing");
        const decimals = data.asset === 'NATIVE' ? 6 : (token?.decimals || 6);
        const amountSun = ethers.parseUnits(data.amount || "0", decimals);

        const result = await TronService.sendTransaction(
          activeChain.defaultRpcUrl,
          tronPrivateKey,
          data.recipient,
          amountSun,
          data.asset === 'NATIVE' ? undefined : token?.address
        );

        if (result.success && result.txid) {
          const id = Date.now().toString();
          setTransactions(prev => [{
            id,
            chainId: Number(activeChainId),
            hash: result.txid,
            status: 'submitted',
            timestamp: Date.now(),
            summary: `Send ${data.amount} ${displaySymbol}`
          }, ...prev]);
          
          setTimeout(fetchData, 3000);
          return { success: true, hash: result.txid };
        } else {
          throw new Error(result.error || "TRON broadcast failed");
        }
      }

      if (localNonceRef.current === null) {
        await syncNonce();
      }

      let txRequest: ethers.TransactionRequest;
      
      if (data.asset !== 'NATIVE' && token) {
        const erc20Iface = new ethers.Interface(ERC20_ABI);
        const amountParsed = ethers.parseUnits(data.amount || "0", token.decimals);
        txRequest = {
          to: token.address,
          value: 0n,
          data: erc20Iface.encodeFunctionData("transfer", [data.recipient, amountParsed])
        };
      } else {
        txRequest = {
          to: data.recipient,
          value: ethers.parseEther(data.amount || "0"),
          data: data.customData || "0x"
        };
      }

      const feeData = await FeeService.getOptimizedFeeData(provider, activeChainId);
      const overrides = FeeService.buildOverrides(feeData);
      
      if (localNonceRef.current !== null) {
        overrides.nonce = localNonceRef.current;
      }

      const connectedWallet = wallet.connect(provider);
      const tx = await connectedWallet.sendTransaction({ ...txRequest, ...overrides });
      
      if (localNonceRef.current !== null) localNonceRef.current++;

      const id = Date.now().toString();
      setTransactions(prev => [{
        id,
        chainId: Number(activeChainId),
        hash: tx.hash,
        status: 'submitted',
        timestamp: Date.now(),
        summary: `Send ${data.amount} ${displaySymbol}`
      }, ...prev]);

      return { success: true, hash: tx.hash };
    } catch (e: any) {
      const errorMsg = e?.message || "";
      if (errorMsg.includes("nonce") || errorMsg.includes("replacement transaction")) {
        localNonceRef.current = null;
      }
      const error = handleTxError(e);
      setError(error);
      return { success: false, error };
    }
  };

  return { transactions, localNonceRef, handleSendSubmit, syncNonce, addTransactionRecord: (r: any) => setTransactions(p => [r, ...p]) };
};
