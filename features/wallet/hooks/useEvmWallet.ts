
import { useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { useWalletStorage } from './useWalletStorage';
import { useWalletState } from './useWalletState';
import { useWalletData } from './useWalletData';
import { useTransactionManager } from './useTransactionManager';
import { useSafeManager } from './useSafeManager';
import { ChainConfig, TokenConfig } from '../types';
import { ERC20_ABI } from '../config';

/**
 * 【核心黑科技：请求塌陷控制器 (Request Collapsing Provider)】
 * 
 * 解决痛点：React 多个 Hook 并行初始化时，会产生完全相同的 RPC 调用（如 eth_gasPrice）。
 * 实现：在底层拦截所有 send 指令。如果同一个 method+params 的请求正在执行，则后续调用直接挂载到该 Promise 上。
 */
class DeduplicatingJsonRpcProvider extends ethers.JsonRpcProvider {
  private _inflight = new Map<string, Promise<any>>();

  async send(method: string, params: Array<any>): Promise<any> {
    // 只有特定的查询方法需要去重，避免拦截执行类方法
    const cacheableMethods = [
      'eth_chainId', 
      'eth_gasPrice', 
      'eth_maxPriorityFeePerGas', 
      'eth_getBlockByNumber', 
      'eth_feeHistory'
    ];

    if (!cacheableMethods.includes(method)) {
      return super.send(method, params);
    }

    const key = `${method}:${JSON.stringify(params)}`;
    const existing = this._inflight.get(key);
    
    if (existing) {
      // console.debug(`[RPC] Collapsed redundant request: ${method}`);
      return existing;
    }

    const promise = super.send(method, params).finally(() => {
      this._inflight.delete(key);
    });

    this._inflight.set(key, promise);
    return promise;
  }
}

export const useEvmWallet = () => {
  const storage = useWalletStorage();
  const { 
    trackedSafes, setTrackedSafes, chains, setChains, 
    customTokens, setCustomTokens, pendingSafeTxs, setPendingSafeTxs 
  } = storage;
  
  const initialChainId = chains.length > 0 ? chains[0].id : 1;
  const state = useWalletState(initialChainId);
  const { 
    wallet, tronPrivateKey, activeAccountType, setActiveAccountType, activeSafeAddress, setActiveSafeAddress,
    activeChainId, setActiveChainId, view, setView, error, setError, notification, setNotification,
    tokenToEdit, setTokenToEdit, isChainModalOpen, setIsChainModalOpen, isAddTokenModalOpen, setIsAddTokenModalOpen,
    handleImport, privateKeyOrPhrase, setPrivateKeyOrPhrase, setWallet, isMenuOpen, setIsMenuOpen, isLoading, setIsLoading,
  } = state;

  const activeChain = useMemo(() => {
    return chains.find(c => c.id === activeChainId) || chains[0];
  }, [chains, activeChainId]);

  const activeAddress = useMemo(() => {
    if (!wallet) return null;
    if (activeAccountType === 'SAFE') return activeSafeAddress;
    return activeChain.chainType === 'TRON' ? state.tronWalletAddress : wallet.address;
  }, [wallet, activeAccountType, activeSafeAddress, activeChain, state.tronWalletAddress]);

  /**
   * 【性能优化：注入去重 Provider】
   */
  const provider = useMemo(() => {
    if (activeChain.chainType === 'TRON' || !activeChain.defaultRpcUrl) return null;
    
    const network = ethers.Network.from(activeChain.id);
    // 使用我们自定义的去重类，而不是原生的 JsonRpcProvider
    return new DeduplicatingJsonRpcProvider(activeChain.defaultRpcUrl, network, {
      staticNetwork: network
    });
  }, [activeChain]);

  const activeChainTokens = useMemo(() => {
    return [...(activeChain.tokens || []), ...(customTokens[activeChainId] || [])];
  }, [activeChain, customTokens, activeChainId]);

  const dataLayer = useWalletData({
    wallet, activeAddress, activeChain, activeAccountType,
    activeChainTokens, provider, setIsLoading, setError
  });

  const { fetchData, balance, tokenBalances, safeDetails } = dataLayer;

  const safeHandlerRef = useRef<any>(null);
  const txMgr = useTransactionManager({
    wallet, 
    tronPrivateKey,
    provider, activeChain, activeChainId,
    activeAccountType,
    fetchData, setError,
    handleSafeProposal: async (t: string, v: bigint, d: string, s: string) => { 
        if (safeHandlerRef.current) return await safeHandlerRef.current(t, v, d, s); 
        return false;
    }
  });

  const safeMgr = useSafeManager({
    wallet, activeSafeAddress, activeChainId, activeChain, provider, safeDetails,
    setPendingSafeTxs, setTrackedSafes, setActiveAccountType, setActiveSafeAddress,
    setView, setNotification, setError, syncNonce: txMgr.syncNonce,
    addTransactionRecord: txMgr.addTransactionRecord
  });

  useEffect(() => { 
    if (safeMgr && safeMgr.handleSafeProposal) {
      safeHandlerRef.current = safeMgr.handleSafeProposal; 
    }
  }, [safeMgr?.handleSafeProposal]);

  useEffect(() => {
    const isCoreView = view === 'intro_animation' || view === 'dashboard';
    if (wallet && isCoreView) {
      // 这里的并发调用现在会被 DeduplicatingJsonRpcProvider 完美合并
      fetchData();
      if (activeChain.chainType !== 'TRON') txMgr.syncNonce();
    }
  }, [activeChainId, activeAccountType, activeSafeAddress, wallet, view, activeChain.chainType]);

  const handleSaveChain = (config: ChainConfig) => {
    setChains(prev => prev.map(c => c.id === config.id ? { ...config, isCustom: true } : c));
    setIsChainModalOpen(false);
    setNotification("Network node updated");
  };

  const handleTrackSafe = (address: string) => {
    const name = `Safe_${address.slice(2, 6)}`;
    setTrackedSafes(prev => [...prev, { address, name, chainId: activeChainId }]);
    setActiveSafeAddress(address);
    setActiveAccountType('SAFE');
    setView('dashboard');
  };

  const confirmAddToken = async (address: string) => {
    if (!provider || !address) return;
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(address, ERC20_ABI, provider);
      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals()
      ]);
      const newToken: TokenConfig = { address, name, symbol, decimals: Number(decimals), isCustom: true };
      setCustomTokens(prev => ({
        ...prev,
        [activeChainId]: [...(prev[activeChainId] || []), newToken]
      }));
      setIsAddTokenModalOpen(false);
      setNotification(`Imported ${symbol} successfully`);
    } catch (e) {
      setError("Failed to import token.");
    } finally { setIsLoading(false); }
  };

  const handleUpdateToken = (token: TokenConfig) => {
    setCustomTokens(prev => ({
      ...prev,
      [activeChainId]: (prev[activeChainId] || []).map(t => t.address === token.address ? token : t)
    }));
    setTokenToEdit(null);
    setNotification("Token updated");
  };

  const handleRemoveToken = (address: string) => {
    setCustomTokens(prev => ({
      ...prev,
      [activeChainId]: (prev[activeChainId] || []).filter(t => t.address !== address)
    }));
    setTokenToEdit(null);
    setNotification("Token removed");
  };

  return { 
    ...state, ...dataLayer, ...txMgr, ...safeMgr, ...storage,
    activeChain, activeAddress, activeChainTokens, provider,
    handleSaveChain, handleTrackSafe, confirmAddToken, handleUpdateToken, handleRemoveToken,
    currentNonce: safeDetails?.nonce || 0
  };
};
