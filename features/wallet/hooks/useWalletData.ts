
import { useState, useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { TronService } from '../../../services/tronService';
import { ERC20_ABI, SAFE_ABI } from '../config';
import { SafeDetails, ChainConfig, TokenConfig } from '../types';
import { useTranslation } from '../../../contexts/LanguageContext';
import { handleTxError } from '../utils';

/**
 * 【数据抓取引擎 - 高可靠同步版】
 */
interface UseWalletDataParams {
  wallet: ethers.Wallet | ethers.HDNodeWallet | null;
  activeAddress: string | null;
  activeChain: ChainConfig;
  activeAccountType: 'EOA' | 'SAFE';
  activeChainTokens: TokenConfig[];
  provider: ethers.JsonRpcProvider | null;
  setIsLoading: (isLoading: boolean) => void;
  setError: (message: string | null) => void;
}

export type SafeMetaFields = {
  owners?: boolean;
  threshold?: boolean;
  nonce?: boolean;
};

export type WalletDataSyncState = {
  phase: 'idle' | 'updating' | 'error';
  rpcUrl: string | null;
  balanceKnown: boolean;
  tokenBalancesKnown: boolean;
  lastUpdatedAt: number | null;
  error: string | null;
};

export const useWalletData = ({
  wallet,
  activeAddress,
  activeChain,
  activeAccountType,
  activeChainTokens,
  provider,
  setIsLoading,
  setError
}: UseWalletDataParams) => {
  const { t } = useTranslation();
  
  const [balance, setBalance] = useState<string>('0.00');
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [safeDetails, setSafeDetails] = useState<SafeDetails | null>(null);
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);
  const requestIdRef = useRef(0);
  const [sync, setSync] = useState<WalletDataSyncState>({
    phase: 'idle',
    rpcUrl: null,
    balanceKnown: false,
    tokenBalancesKnown: false,
    lastUpdatedAt: null,
    error: null
  });

  type CacheEntry = {
    balance: string;
    tokenBalances: Record<string, string>;
    safeDetails: SafeDetails | null;
    updatedAt: number;
  };
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const lastAutoRefreshKeyRef = useRef<string | null>(null);
  const walletSessionKey = wallet?.address ? wallet.address.toLowerCase() : null;

  const normalizedRpcUrl = useMemo(() => {
    if (!activeChain.defaultRpcUrl) return null;
    return activeChain.chainType === 'TRON'
      ? TronService.normalizeHost(activeChain.defaultRpcUrl)
      : activeChain.defaultRpcUrl;
  }, [activeChain.chainType, activeChain.defaultRpcUrl]);

  const scopeKey = useMemo(() => {
    if (!activeAddress) return null;
    return `${activeChain.chainType}:${activeChain.id}:${normalizedRpcUrl || ''}:${activeAddress.toLowerCase()}`;
  }, [activeAddress, activeChain.chainType, activeChain.id, normalizedRpcUrl]);

  /**
   * 【RPC 优化：合约身份缓存 (Contract Identity Cache)】
   * 意图：多签钱包地址在链上是不可变的合约。
   * 如何减少 RPC：一旦 getCode 确认过该地址为合约，verifiedContractRef 会锁死该状态。
   * 结果：在同一会话中，对同一个 Safe 地址的重复探测请求从 N 次降为 1 次。
   */
  const verifiedContractRef = useRef<string | null>(null);
  
  /**
   * 【RPC 优化：全量同步节流 (Fetch Throttling)】
   * 意图：防止用户疯狂点击“刷新”或组件频繁 Mount 导致的 RPC 风暴。
   * 策略：强制 3 秒静默期。
   */
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 3000; 

  const lastSafeMetaFetchTimeRef = useRef<number>(0);
  const safeMetaRequestIdRef = useRef(0);
  const safeMetaInFlightRef = useRef(false);
  const SAFE_META_COOLDOWN_MS = 4500;

  // 监听钱包注销
  useEffect(() => {
    if (!walletSessionKey) {
      requestIdRef.current++;
      setIsInitialFetchDone(false);
      verifiedContractRef.current = null;
      lastFetchTime.current = 0;
      lastSafeMetaFetchTimeRef.current = 0;
      safeMetaRequestIdRef.current = 0;
      safeMetaInFlightRef.current = false;
      cacheRef.current.clear();
      setSafeDetails(null);
      setBalance('0.00');
      setTokenBalances({});
      setSync({
        phase: 'idle',
        rpcUrl: null,
        balanceKnown: false,
        tokenBalancesKnown: false,
        lastUpdatedAt: null,
        error: null
      });
      lastAutoRefreshKeyRef.current = null;
    }
  }, [walletSessionKey]);

  /**
   * 【关键修复：账户切换状态清理】
   * 意图：解决切换不同 Safe 或 EOA 时，UI 残留上一个账户数据的问题。
   * 逻辑：只要地址或链发生变化，立即清空内存中的合约验证状态和多签细节。
   */
  useEffect(() => {
    requestIdRef.current++;
    safeMetaRequestIdRef.current++;
    verifiedContractRef.current = null;
    lastFetchTime.current = 0; 
    lastSafeMetaFetchTimeRef.current = 0;
    safeMetaInFlightRef.current = false;
    setSafeDetails(null); // 立即清理成员列表，防止多签合约间数据污染
    // Do not force a "0" flash. Mark as unknown and let cache/refresh populate.
    setSync((prev) => ({
      ...prev,
      phase: 'idle',
      rpcUrl: normalizedRpcUrl,
      balanceKnown: false,
      tokenBalancesKnown: false,
      lastUpdatedAt: null,
      error: null
    }));
    setTokenBalances({});
  }, [activeAddress, activeChain.id]);

  // Node (RPC URL) scope changes: restore cached values if present, otherwise show placeholders.
  useEffect(() => {
    if (!walletSessionKey || !activeAddress) return;
    if (!scopeKey) return;

    const cached = cacheRef.current.get(scopeKey);
    if (cached) {
      setBalance(cached.balance);
      setTokenBalances(cached.tokenBalances);
      setSafeDetails(cached.safeDetails);
      setSync({
        phase: 'updating',
        rpcUrl: normalizedRpcUrl,
        balanceKnown: true,
        tokenBalancesKnown: true,
        lastUpdatedAt: cached.updatedAt,
        error: null
      });
    } else {
      setSafeDetails(null);
      setSync({
        phase: 'updating',
        rpcUrl: normalizedRpcUrl,
        balanceKnown: false,
        tokenBalancesKnown: false,
        lastUpdatedAt: null,
        error: null
      });
    }
  }, [walletSessionKey, activeAddress, scopeKey, normalizedRpcUrl]);

  /**
   * 仅刷新 Safe 元数据（Owners/Threshold/Nonce）。
   * 用途：成员变更的“扫描/验证”阶段需要及时观察链上状态变化，但不应该反复刷新余额/代币余额。
   */
  const refreshSafeDetails = async (force: boolean = false, fields?: SafeMetaFields) => {
    if (!wallet || !activeAddress) return;
    if (activeChain.chainType === 'TRON') return;
    if (activeAccountType !== 'SAFE') return;
    if (!provider) return;

    const wantOwners = fields?.owners ?? true;
    const wantThreshold = fields?.threshold ?? true;
    const wantNonce = fields?.nonce ?? true;

    const now = Date.now();
    if (!force && (now - lastSafeMetaFetchTimeRef.current < SAFE_META_COOLDOWN_MS)) return;
    if (safeMetaInFlightRef.current) return;

    safeMetaInFlightRef.current = true;
    const reqId = ++safeMetaRequestIdRef.current;

    try {
      lastSafeMetaFetchTimeRef.current = now;

      let isContractVerified = verifiedContractRef.current === activeAddress;
      if (!isContractVerified) {
        const code = await provider.getCode(activeAddress);
        if (reqId !== safeMetaRequestIdRef.current) return;
        if (code !== '0x' && code !== '0x0') {
          verifiedContractRef.current = activeAddress;
          isContractVerified = true;
        }
      }
      if (!isContractVerified) return;

      const safeContract = new ethers.Contract(activeAddress, SAFE_ABI, provider);
      // If there are no previous details, fetch full meta to keep the schema consistent.
      const needsFull = !safeDetails || (wantOwners && wantThreshold && wantNonce);
      if (needsFull) {
        const [owners, threshold, nonce] = await Promise.all([
          safeContract.getOwners(),
          safeContract.getThreshold(),
          safeContract.nonce()
        ]);
        if (reqId !== safeMetaRequestIdRef.current) return;
        setSafeDetails({ owners, threshold: Number(threshold), nonce: Number(nonce) });
        return;
      }

      const tasks: Array<Promise<{ k: 'owners' | 'threshold' | 'nonce'; v: any }>> = [];
      if (wantOwners) tasks.push(safeContract.getOwners().then((v: any) => ({ k: 'owners' as const, v })));
      if (wantThreshold) tasks.push(safeContract.getThreshold().then((v: any) => ({ k: 'threshold' as const, v })));
      if (wantNonce) tasks.push(safeContract.nonce().then((v: any) => ({ k: 'nonce' as const, v })));

      const results = await Promise.all(tasks);
      if (reqId !== safeMetaRequestIdRef.current) return;

      setSafeDetails((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        for (const r of results) {
          if (r.k === 'owners') (next as any).owners = r.v;
          if (r.k === 'threshold') (next as any).threshold = Number(r.v);
          if (r.k === 'nonce') (next as any).nonce = Number(r.v);
        }
        return next;
      });
    } catch (e: unknown) {
      // 只在 force（用户意图/关键阶段）时提示，避免后台轮询刷屏
      if (force) {
        const normalized = handleTxError(e as any, t);
        setError(normalized || t('wallet.data_sync_fault'));
      }
    } finally {
      safeMetaInFlightRef.current = false;
    }
  };

  /**
   * 【核心同步逻辑：并行查询策略】
   */
  const fetchData = async (force: boolean = false) => {
    if (!wallet || !activeAddress) return;
    if (activeChain.chainType !== 'TRON' && !provider) return;

    const now = Date.now();
    if (!force && (now - lastFetchTime.current < FETCH_COOLDOWN)) return;

    const requestId = ++requestIdRef.current;

    setSync((prev) => ({
      ...prev,
      phase: 'updating',
      rpcUrl: normalizedRpcUrl,
      error: null
    }));
    setIsLoading(true);
    try {
      lastFetchTime.current = now; 
      const currentBalances: Record<string, string> = {};
      const cached = scopeKey ? cacheRef.current.get(scopeKey) : null;
      const fallbackTokens = cached?.tokenBalances || tokenBalances;
      let nextBalance: string | null = null;
      let nextSafeDetails: SafeDetails | null = safeDetails;

      if (activeChain.chainType === 'TRON') {
        const host = activeChain.defaultRpcUrl;
        if (!host) throw new Error('Missing TRON RPC base URL');

        // Native TRX balance (failures must not appear as a real 0 balance).
        const balSun = await TronService.getBalance(host, activeAddress);
        if (requestId !== requestIdRef.current) return;
        nextBalance = ethers.formatUnits(balSun, 6);

        // TRC20 balances: best-effort per token; preserve last-known on transient errors.
        await Promise.all(activeChainTokens.map(async (tok: TokenConfig) => {
          try {
            const v = await TronService.getTRC20Balance(host, tok.address, activeAddress);
            const formatted = ethers.formatUnits(v, tok.decimals);
            currentBalances[tok.address.toLowerCase()] = formatted;
            if (!(tok.symbol in currentBalances)) currentBalances[tok.symbol] = formatted;
          } catch {
            const prevByAddr = fallbackTokens[tok.address.toLowerCase()];
            const prevBySym = fallbackTokens[tok.symbol];
            const fallback = prevByAddr ?? prevBySym ?? '0.00';
            currentBalances[tok.address.toLowerCase()] = fallback;
            if (!(tok.symbol in currentBalances)) currentBalances[tok.symbol] = prevBySym ?? fallback;
          }
        }));
        if (requestId !== requestIdRef.current) return;

        setBalance(nextBalance);
        setTokenBalances(currentBalances);
      } else {
        // --- EVM 并行同步池 ---
        // 意图：将所有必要的初始化查询压入单个 Batch。
        const baseTasks: Promise<any>[] = [provider.getBalance(activeAddress)];
        
        let isContractVerified = verifiedContractRef.current === activeAddress;
        if (activeAccountType === 'SAFE' && !isContractVerified) {
           baseTasks.push(provider.getCode(activeAddress));
        }

        const baseResults = await Promise.all(baseTasks);
        if (requestId !== requestIdRef.current) return;
        nextBalance = ethers.formatEther(baseResults[0]);
        setBalance(nextBalance);

        if (activeAccountType === 'SAFE' && !isContractVerified) {
           const code = baseResults[1];
           if (code !== '0x' && code !== '0x0') {
              verifiedContractRef.current = activeAddress;
              isContractVerified = true;
           }
        }

        // 如果是已验证的 Safe，并行抓取多签元数据
        if (activeAccountType === 'SAFE' && isContractVerified) {
          const safeContract = new ethers.Contract(activeAddress, SAFE_ABI, provider);
          const [owners, threshold, nonce] = await Promise.all([
             safeContract.getOwners(),
             safeContract.getThreshold(),
             safeContract.nonce()
          ]);
          if (requestId !== requestIdRef.current) return;
          // 确保写入的是当前 activeAddress 的数据
          nextSafeDetails = { owners, threshold: Number(threshold), nonce: Number(nonce) };
          setSafeDetails(nextSafeDetails);
        }

        // 批量获取 ERC20 余额
        await Promise.all(activeChainTokens.map(async (token: TokenConfig) => {
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const bal = await contract.balanceOf(activeAddress);
            const v = ethers.formatUnits(bal, token.decimals);
            currentBalances[token.address.toLowerCase()] = v;
            if (!(token.symbol in currentBalances)) currentBalances[token.symbol] = v;
          } catch (e) {
            // Keep last-known values on transient RPC errors to avoid false zero balances.
            currentBalances[token.address.toLowerCase()] = fallbackTokens[token.address.toLowerCase()] ?? '0.00';
            if (!(token.symbol in currentBalances)) currentBalances[token.symbol] = fallbackTokens[token.symbol] ?? '0.00';
          }
        }));
        if (requestId !== requestIdRef.current) return;

        setTokenBalances(currentBalances);
      }

      // Persist per-node cache only after a successful run.
      if (scopeKey) {
        cacheRef.current.set(scopeKey, {
          balance: nextBalance ?? balance,
          tokenBalances: currentBalances,
          safeDetails: nextSafeDetails ?? null,
          updatedAt: Date.now()
        });
      }

      setSync({
        phase: 'idle',
        rpcUrl: normalizedRpcUrl,
        balanceKnown: true,
        tokenBalancesKnown: true,
        lastUpdatedAt: Date.now(),
        error: null
      });
    } catch (e: unknown) {
      // 尽量把 RPC/网络错误具体化（仍保持可本地化）
      const normalized = handleTxError(e as any, t);
      // handleTxError 的最终兜底可能偏“交易语义”，此处回退到数据同步通用提示
      const fallback = t('wallet.data_sync_fault');
      const msg =
        normalized === (t ? t('tx.err_transaction_failed') : 'Transaction failed')
          ? fallback
          : normalized || fallback;
      setError(msg);
      const hasCached = !!(scopeKey && cacheRef.current.has(scopeKey));
      setSync((prev) => ({
        phase: 'error',
        rpcUrl: normalizedRpcUrl,
        balanceKnown: hasCached ? true : prev.balanceKnown && prev.rpcUrl === normalizedRpcUrl,
        tokenBalancesKnown: hasCached ? true : prev.tokenBalancesKnown && prev.rpcUrl === normalizedRpcUrl,
        lastUpdatedAt: prev.lastUpdatedAt,
        error: msg
      }));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsInitialFetchDone(true);
      }
    }
  };

  // Node switch should force a refresh immediately (no cooldown) to populate cache and clear placeholders.
  useEffect(() => {
    if (!walletSessionKey || !activeAddress) return;
    if (!normalizedRpcUrl) return;
    if (activeChain.chainType !== 'TRON' && !provider) return;
    const autoKey = `${walletSessionKey}:${scopeKey || ''}:${activeAccountType}`;
    if (lastAutoRefreshKeyRef.current === autoKey) return;
    lastAutoRefreshKeyRef.current = autoKey;
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletSessionKey, activeAddress, scopeKey, normalizedRpcUrl, activeAccountType, activeChain.chainType, !!provider]);

  return { balance, tokenBalances, safeDetails, isInitialFetchDone, fetchData, refreshSafeDetails, sync };
};
