
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { TronService } from '../../../services/tronService';
import { ERC20_ABI, SAFE_ABI } from '../config';
import { SafeDetails, ChainConfig, TokenConfig } from '../types';

/**
 * 【数据同步引擎 - RPC 优化增强版】
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

  // 【RPC 优化：合约身份缓存】
  // 意图：一旦通过 getCode 确认地址是合约，就不再重复查询。
  const verifiedContractRef = useRef<string | null>(null);
  
  // 【RPC 优化：时间片节流】
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 3000; 

  useEffect(() => {
    if (!wallet) {
      setIsInitialFetchDone(false);
      verifiedContractRef.current = null;
      lastFetchTime.current = 0;
    }
  }, [wallet]);

  useEffect(() => {
    verifiedContractRef.current = null;
    lastFetchTime.current = 0; 
  }, [activeAddress, activeChain.id]);

  /**
   * 【核心同步逻辑：并行请求策略】
   */
  const fetchData = async (force: boolean = false) => {
    if (!wallet || !activeAddress) return;

    const now = Date.now();
    // 拦截 3 秒内的重复刷新请求
    if (!force && (now - lastFetchTime.current < FETCH_COOLDOWN)) return;

    setIsLoading(true);
    try {
      lastFetchTime.current = now; 
      const currentBalances: Record<string, string> = {};

      if (activeChain.chainType === 'TRON') {
        const host = activeChain.defaultRpcUrl;
        // Tron 路径优化：并行查询 TRX 余额和所有 TRC20 余额
        const [balSun, ...tokenResults] = await Promise.all([
          TronService.getBalance(host, activeAddress),
          ...activeChainTokens.map((t: TokenConfig) => TronService.getTRC20Balance(host, t.address, activeAddress))
        ]);
        
        setBalance(ethers.formatUnits(balSun, 6)); 
        activeChainTokens.forEach((t: TokenConfig, i: number) => {
           currentBalances[t.symbol] = ethers.formatUnits(tokenResults[i], t.decimals);
        });
        setTokenBalances(currentBalances);
      } else {
        if (!provider) return;
        
        // --- EVM 并行同步池 ---
        const baseTasks: Promise<any>[] = [provider.getBalance(activeAddress)];
        let isContractVerified = verifiedContractRef.current === activeAddress;
        
        // 只有未验证过的 Safe 地址才需要 getCode
        if (activeAccountType === 'SAFE' && !isContractVerified) {
           baseTasks.push(provider.getCode(activeAddress));
        }

        const baseResults = await Promise.all(baseTasks);
        setBalance(ethers.formatEther(baseResults[0]));

        if (activeAccountType === 'SAFE' && !isContractVerified) {
           const code = baseResults[1];
           if (code !== '0x' && code !== '0x0') {
              verifiedContractRef.current = activeAddress;
              isContractVerified = true;
           }
        }

        // 如果确定是 Safe 合约，批量获取多签元数据
        if (activeAccountType === 'SAFE' && isContractVerified) {
          const safeContract = new ethers.Contract(activeAddress, SAFE_ABI, provider);
          const [owners, threshold, nonce] = await Promise.all([
             safeContract.getOwners(),
             safeContract.getThreshold(),
             safeContract.nonce()
          ]);
          setSafeDetails({ owners, threshold: Number(threshold), nonce: Number(nonce) });
        }

        // 批量获取 ERC20 余额
        await Promise.all(activeChainTokens.map(async (token: TokenConfig) => {
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const bal = await contract.balanceOf(activeAddress);
            currentBalances[token.symbol] = ethers.formatUnits(bal, token.decimals);
          } catch (e) {
            currentBalances[token.symbol] = '0.00';
          }
        }));

        setTokenBalances(currentBalances);
      }
    } catch (e: any) {
      setError("Data synchronization fault");
    } finally {
      setIsLoading(false);
      setIsInitialFetchDone(true);
    }
  };

  return { balance, tokenBalances, safeDetails, isInitialFetchDone, fetchData };
};
