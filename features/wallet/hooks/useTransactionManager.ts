
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
 * 【交易生命周期管理器 - 高效 RPC 架构版】
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
  // 【RPC 优化：Nonce 内存镜像】
  // 目的：避免每次 handleSendSubmit 都调用 getTransactionCount。
  // 原理：初始化获取一次，后续发送成功后本地 +1，只有出错时才重置并重新同步。
  const localNonceRef = useRef<number | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  /**
   * 同步 Nonce 状态（仅在初始化或错误恢复时调用）
   */
  const syncNonce = useCallback(async () => {
    if (!wallet || !provider || activeChain.chainType === 'TRON' || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    try {
      // 使用 'pending' 标签可以获取内存池中的最新状态，减少因覆盖发送导致的失败
      const n = await provider.getTransactionCount(wallet.address, 'pending');
      localNonceRef.current = n;
      console.log(`[RPC] Nonce synced: ${n}`);
    } catch (e) {
      console.error("Nonce sync failed", e);
    } finally {
      isSyncingRef.current = false;
    }
  }, [wallet, provider, activeChain]);

  /**
   * 【RPC 优化：轮询节流】
   * 只对处于 'submitted' 状态的交易进行收据查询。
   */
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
          // 仅查询收据，不查询整个交易体，节省流量
          const receipt = await provider.getTransactionReceipt(normalizedHash);
          if (receipt) {
            setTransactions(prev => prev.map(t => 
              t.id === tx.id ? { ...t, status: receipt.status === 1 ? 'confirmed' : 'failed' } : t
            ));
            // 成功后延迟 1s 刷新余额，给索引器留出同步时间
            if (receipt.status === 1) setTimeout(fetchData, 1000);
          }
        } catch (e) {
           // 抑制某些 RPC 节点在收据未就绪时的报错
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [provider, transactions, activeChain, activeChainId, fetchData]);

  /**
   * 【转账核心：EOA 与多签的特殊路径处理】
   */
  const handleSendSubmit = async (data: any): Promise<ProcessResult> => {
    try {
      const isTron = activeChain.chainType === 'TRON';
      if (!wallet || (!provider && !isTron)) throw new Error("Wallet/Provider not ready");

      const displaySymbol = data.asset === 'NATIVE' ? activeChain.currencySymbol : data.asset;
      const token = activeChain.tokens.find((t: TokenConfig) => t.symbol === data.asset);

      // --- 路径 A: 多签提议 (Safe Proposal) ---
      // 这里的优化在于 data 预构建，减少对 provider 的依赖
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
          targetAddress, value, callData, `Send ${data.amount} ${displaySymbol}`
        );
        return { success };
      }

      // --- 路径 B: 波场转账 (Tron Path) ---
      // 优化：TronService 封装了本地签名，只产生 broadcast 这一笔网络请求
      if (isTron) {
        if (!tronPrivateKey) throw new Error("TRON private key missing");
        const decimals = data.asset === 'NATIVE' ? 6 : (token?.decimals || 6);
        const amountSun = ethers.parseUnits(data.amount || "0", decimals);

        const result = await TronService.sendTransaction(
          activeChain.defaultRpcUrl, tronPrivateKey, data.recipient, amountSun,
          data.asset === 'NATIVE' ? undefined : token?.address
        );

        if (result.success && result.txid) {
          const id = Date.now().toString();
          setTransactions(prev => [{
            id, chainId: Number(activeChainId), hash: result.txid, status: 'submitted', timestamp: Date.now(), summary: `Send ${data.amount} ${displaySymbol}`
          }, ...prev]);
          return { success: true, hash: result.txid };
        } else {
          throw new Error(result.error || "TRON broadcast failed");
        }
      }

      // --- 路径 C: EVM EOA 转账 ---
      // 1. 检查 Nonce 镜像是否存在，不存在则同步 (1 RPC)
      if (localNonceRef.current === null) {
        await syncNonce();
      }

      let txRequest: ethers.TransactionRequest;
      // 2. 预构建交易请求
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

      // 3. 获取 Gas (1 RPC，但 FeeService 带有 15s 内存缓存)
      const feeData = await FeeService.getOptimizedFeeData(provider, activeChainId);
      const overrides = FeeService.buildOverrides(feeData);
      
      // 4. 应用本地 Nonce 镜像
      if (localNonceRef.current !== null) {
        overrides.nonce = localNonceRef.current;
      }

      const connectedWallet = wallet.connect(provider);
      // 5. 广播交易 (1 RPC)
      const tx = await connectedWallet.sendTransaction({ ...txRequest, ...overrides });
      
      // 6. 本地预测更新 Nonce (关键：不请求网络)
      if (localNonceRef.current !== null) localNonceRef.current++;

      const id = Date.now().toString();
      setTransactions(prev => [{
        id, chainId: Number(activeChainId), hash: tx.hash, status: 'submitted', timestamp: Date.now(), summary: `Send ${data.amount} ${displaySymbol}`
      }, ...prev]);

      return { success: true, hash: tx.hash };
    } catch (e: any) {
      const errorMsg = e?.message || "";
      // 发生 Nonce 冲突时，强制下一次同步网络 (Self-Healing)
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
