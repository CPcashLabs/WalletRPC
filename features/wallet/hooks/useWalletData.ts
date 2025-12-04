
import { useState } from 'react';
import { ethers } from 'ethers';
import { TronService } from '../../../services/tronService';
import { ERC20_ABI, SAFE_ABI } from '../config';
import { SafeDetails, ChainConfig, TokenConfig } from '../types';

interface UseWalletDataProps {
  wallet: ethers.Wallet | ethers.HDNodeWallet | null;
  activeAddress: string | null | undefined;
  activeChain: ChainConfig;
  activeAccountType: 'EOA' | 'SAFE';
  activeChainTokens: TokenConfig[];
  provider: ethers.JsonRpcProvider | null;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Hook: useWalletData
 * 
 * 作用:
 * 负责从链上获取数据。
 * 包括：原生余额、Token 余额、Safe 合约详情 (Owners, Threshold, Nonce)。
 */
export const useWalletData = ({
  wallet,
  activeAddress,
  activeChain,
  activeAccountType,
  activeChainTokens,
  provider,
  setIsLoading,
  setError
}: UseWalletDataProps) => {
  
  /** 原生代币余额 */
  const [balance, setBalance] = useState<string>('0.00');
  
  /** Token 余额映射表 */
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  
  /** Safe 详情 (仅 SAFE 模式) */
  const [safeDetails, setSafeDetails] = useState<SafeDetails | null>(null);
  
  /** EOA 当前 Nonce (仅 EOA 模式) */
  const [currentNonce, setCurrentNonce] = useState<number>(0);

  /**
   * 获取链上数据
   * 区分 EVM 和 TRON 的获取逻辑。
   */
  const fetchData = async () => {
    if (!wallet || !activeAddress) return;
    setIsLoading(true);
    setError(null);

    try {
      if (activeChain.chainType === 'TRON') {
         // --- TRON 逻辑 (HTTP API) ---
         const host = activeChain.defaultRpcUrl;
         const balSun = await TronService.getBalance(host, activeAddress);
         setBalance(ethers.formatUnits(balSun, 6)); 

         const nextBalances: Record<string, string> = {};
         await Promise.all(activeChainTokens.map(async (token) => {
            try {
               const bal = await TronService.getTrc20Balance(host, activeAddress, token.address);
               const decimals = token.decimals || 6;
               nextBalances[token.symbol] = ethers.formatUnits(bal, decimals);
            } catch (e) {
               nextBalances[token.symbol] = '0';
            }
         }));
         setTokenBalances(nextBalances);
         setSafeDetails(null);

      } else {
         // --- EVM 逻辑 (JSON-RPC) ---
         if (!provider) return;
         const nativeBal = await provider.getBalance(activeAddress);
         setBalance(ethers.formatEther(nativeBal));

         const nextBalances: Record<string, string> = {};
         await Promise.all(activeChainTokens.map(async (token) => {
            try {
               const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
               const bal = await contract.balanceOf(activeAddress);
               nextBalances[token.symbol] = ethers.formatUnits(bal, token.decimals);
            } catch (e) {
               nextBalances[token.symbol] = '0';
            }
         }));
         setTokenBalances(nextBalances);

         if (activeAccountType === 'SAFE') {
            const safeContract = new ethers.Contract(activeAddress, SAFE_ABI, provider);
            const [owners, threshold, nonce] = await Promise.all([
               safeContract.getOwners(),
               safeContract.getThreshold(),
               safeContract.nonce()
            ]);
            setSafeDetails({ owners, threshold: Number(threshold), nonce: Number(nonce) });
         } else {
            const txCount = await provider.getTransactionCount(activeAddress);
            setCurrentNonce(txCount);
            setSafeDetails(null);
         }
      }

    } catch (e: any) {
      console.error(e);
      if (e.code === 'NETWORK_ERROR') setError("网络错误: RPC 节点无法连接");
      else setError("数据获取失败: " + (e.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    balance,
    tokenBalances,
    safeDetails,
    setSafeDetails,
    currentNonce,
    fetchData
  };
};
