
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { TronService } from '../../../services/tronService';
import { ERC20_ABI, SAFE_ABI } from '../config';
import { SafeDetails, ChainConfig, TokenConfig } from '../types';

/**
 * 【数据层核心 Hook】
 * 引入冷却时间机制，防止 RPC 过载。
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
}: any) => {
  
  const [balance, setBalance] = useState<string>('0.00');
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [safeDetails, setSafeDetails] = useState<SafeDetails | null>(null);
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  const verifiedContractRef = useRef<string | null>(null);
  
  // 性能优化：上次抓取的时间戳，用于节流
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 3000; // 3秒内禁止重复全量同步

  useEffect(() => {
    if (!wallet) {
      setIsInitialFetchDone(false);
      verifiedContractRef.current = null;
      lastFetchTime.current = 0;
    }
  }, [wallet]);

  useEffect(() => {
    verifiedContractRef.current = null;
    lastFetchTime.current = 0; // 切换地址时重置节流
  }, [activeAddress, activeChain.id]);

  /**
   * 【逻辑：带节流的数据同步】
   */
  const fetchData = async (force: boolean = false) => {
    if (!wallet || !activeAddress) return;

    const now = Date.now();
    // 节流检查：如果不是强制刷新且在冷却时间内，直接跳过
    if (!force && (now - lastFetchTime.current < FETCH_COOLDOWN)) {
      console.log("Fetch skipped due to cooldown.");
      return;
    }

    setIsLoading(true);
    try {
      lastFetchTime.current = now; // 更新最后同步时间
      const currentBalances: Record<string, string> = {};

      if (activeChain.chainType === 'TRON') {
        const host = activeChain.defaultRpcUrl;
        
        const balSun = await TronService.getBalance(host, activeAddress);
        setBalance(ethers.formatUnits(balSun, 6)); 

        await Promise.all(activeChainTokens.map(async (token: TokenConfig) => {
          const bal = await TronService.getTRC20Balance(host, token.address, activeAddress);
          currentBalances[token.symbol] = ethers.formatUnits(bal, token.decimals);
        }));
        
        setTokenBalances(currentBalances);
      } else {
        if (!provider) return;
        
        const baseTasks: Promise<any>[] = [provider.getBalance(activeAddress)];
        let isContractVerified = true;
        
        if (activeAccountType === 'SAFE') {
          if (verifiedContractRef.current !== activeAddress) {
            try {
              const code = await provider.getCode(activeAddress);
              if (code === '0x' || code === '0x0') {
                isContractVerified = false;
              } else {
                verifiedContractRef.current = activeAddress;
              }
            } catch (e) { isContractVerified = false; }
          }
          
          if (isContractVerified) {
            const safeContract = new ethers.Contract(activeAddress, SAFE_ABI, provider);
            baseTasks.push(safeContract.getOwners(), safeContract.getThreshold(), safeContract.nonce());
          }
        }

        const baseResults = await Promise.all(baseTasks);
        setBalance(ethers.formatEther(baseResults[0]));

        if (activeAccountType === 'SAFE' && isContractVerified && baseResults.length > 1) {
          setSafeDetails({
            owners: baseResults[1],
            threshold: Number(baseResults[2]),
            nonce: Number(baseResults[3])
          });
        }

        const tokenTasks = activeChainTokens.map(async (token: TokenConfig) => {
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const bal = await contract.balanceOf(activeAddress);
            currentBalances[token.symbol] = ethers.formatUnits(bal, token.decimals);
          } catch (e) {
            currentBalances[token.symbol] = '0.00';
          }
        });

        await Promise.all(tokenTasks);
        setTokenBalances(currentBalances);
      }
    } catch (e: any) {
      console.error(e);
      setError("Data synchronization fault");
    } finally {
      setIsLoading(false);
      setIsInitialFetchDone(true);
    }
  };

  return { balance, tokenBalances, safeDetails, isInitialFetchDone, fetchData };
};
