
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
 * 【架构设计：中心化状态编排器 (The Orchestrator)】
 */
export const useEvmWallet = () => {
  const storage = useWalletStorage();
  const { 
    trackedSafes, setTrackedSafes, chains, setChains, 
    customTokens, setCustomTokens, pendingSafeTxs, setPendingSafeTxs 
  } = storage;
  
  // 确保 chains 不为空
  const initialChainId = chains.length > 0 ? chains[0].id : 1;
  const state = useWalletState(initialChainId);
  const { 
    wallet, tronPrivateKey, activeAccountType, setActiveAccountType, activeSafeAddress, setActiveSafeAddress,
    activeChainId, setActiveChainId, view, setView, error, setError, notification, setNotification,
    tokenToEdit, setTokenToEdit, isChainModalOpen, setIsChainModalOpen, isAddTokenModalOpen, setIsAddTokenModalOpen,
    handleImport, privateKeyOrPhrase, setPrivateKeyOrPhrase, setWallet, isMenuOpen, setIsMenuOpen, isLoading, setIsLoading,
    errorObject
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
   * 【性能优化：静态网络模式】
   * 修复点：传入 activeChainId 并设置 staticNetwork: true。
   * 效果：Ethers 不再反复请求 eth_chainId，直接使用我们配置中的 ID，极大减少 RPC 额度消耗。
   */
  const provider = useMemo(() => {
    if (activeChain.chainType === 'TRON' || !activeChain.defaultRpcUrl) return null;
    
    // 使用静态网络配置，避免冗余的 eth_chainId 调用
    const network = ethers.Network.from(activeChain.id);
    return new ethers.JsonRpcProvider(activeChain.defaultRpcUrl, network, {
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

  const { fetchData, balance, tokenBalances, safeDetails, isInitialFetchDone } = dataLayer;

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

  const { transactions, syncNonce, handleSendSubmit } = txMgr;

  const safeMgr = useSafeManager({
    wallet, activeSafeAddress, activeChainId, activeChain, provider, safeDetails,
    setPendingSafeTxs, setTrackedSafes, setActiveAccountType, setActiveSafeAddress,
    setView, setNotification, setError, syncNonce: txMgr.syncNonce,
    addTransactionRecord: txMgr.addTransactionRecord
  });

  // 设置 Safe 提议处理器
  useEffect(() => { 
    if (safeMgr && safeMgr.handleSafeProposal) {
      safeHandlerRef.current = safeMgr.handleSafeProposal; 
    }
  }, [safeMgr?.handleSafeProposal]);

  useEffect(() => {
    const isCoreView = view === 'intro_animation' || view === 'dashboard';
    if (wallet && isCoreView) {
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
      console.error("Token import failure", e);
      setError("Failed to import token. Verify address and network compatibility.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateToken = (token: TokenConfig) => {
    setCustomTokens(prev => ({
      ...prev,
      [activeChainId]: (prev[activeChainId] || []).map(t => t.address === token.address ? token : t)
    }));
    setTokenToEdit(null);
    setNotification("Token metadata updated");
  };

  const handleSaveToken = (token: TokenConfig) => {
    setCustomTokens(prev => ({
      ...prev,
      [activeChainId]: (prev[activeChainId] || []).map(t => t.address === token.address ? token : t)
    }));
    setTokenToEdit(null);
    setNotification("Token metadata updated");
  };

  const handleRemoveToken = (address: string) => {
    setCustomTokens(prev => ({
      ...prev,
      [activeChainId]: (prev[activeChainId] || []).filter(t => t.address !== address)
    }));
    setTokenToEdit(null);
    setNotification("Token removed from display");
  };

  // 返回组合后的状态和方法
  return { 
    ...state, 
    ...dataLayer, 
    ...txMgr, 
    ...safeMgr, 
    ...storage,
    activeChain, activeAddress, activeChainTokens, provider,
    handleSaveChain, handleTrackSafe, confirmAddToken, handleUpdateToken, handleRemoveToken,
    currentNonce: safeDetails?.nonce || 0
  };
};
