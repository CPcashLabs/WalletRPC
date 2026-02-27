import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChainConfig, TransactionRecord, TronFinanceActionState, TronResourceType, TronVoteItem } from '../types';
import { TronService } from '../../../services/tronService';

type FailedSnapshot =
  | {
      step: 'CLAIM_REWARD';
      payload: {};
    }
  | {
      step: 'STAKE_RESOURCE';
      payload: { amountSun: bigint; resource: TronResourceType };
    }
  | {
      step: 'VOTE_WITNESS';
      payload: { votes: Array<{ address: string; votes: number }> };
    };

type OneClickInput = {
  resource: TronResourceType;
  stakeAmountSun: bigint;
  stakeAllAfterClaim?: boolean;
  votes: Array<{ address: string; votes: number }>;
};

type OneClickProgress = {
  stage: 'idle' | 'claim' | 'stake' | 'vote' | 'done' | 'failed';
  active: boolean;
  skippedClaim: boolean;
  message: string;
  steps: Array<{
    key: 'claim' | 'stake' | 'vote';
    label: string;
    status: 'pending' | 'running' | 'success' | 'skipped' | 'failed';
    detail?: string;
    txid?: string;
    at?: number;
  }>;
};

interface UseTronFinanceManagerParams {
  activeChain: ChainConfig;
  activeAddress: string | null;
  tronPrivateKey: string | null;
  enabled: boolean;
  t: (path: string) => string;
  setError: (msg: string | null) => void;
  setNotification: (msg: string | null) => void;
  addTransactionRecord: (record: TransactionRecord) => void;
  refreshWalletData: (force?: boolean) => Promise<void> | void;
}

const emptyAction: TronFinanceActionState = { phase: 'idle' };
const TRON_CONFIRM_TIMEOUT_MS = 90_000;
const TRON_CONFIRM_POLL_INTERVAL_MS = 1_500;
const TRON_POWER_SYNC_TIMEOUT_MS = 25_000;
const TRON_POWER_SYNC_POLL_MS = 1_200;
const ONE_CLICK_TRX_RESERVE_SUN = 100_000_000n;
const TRON_FINANCE_INIT_REFRESH_DEDUPE_MS = 1_500;
const TRON_FINANCE_INIT_REFRESH_TTL_MS = 60_000;
const ONE_CLICK_DEFAULT_STEPS: OneClickProgress['steps'] = [
  { key: 'claim', label: '领取奖励', status: 'pending' },
  { key: 'stake', label: '追加质押', status: 'pending' },
  { key: 'vote', label: '平均再投票', status: 'pending' }
];
const tronFinanceInitRefreshMap = new Map<string, number>();
export const __tronFinanceTesting = {
  clearInitRefreshDedupe: () => {
    tronFinanceInitRefreshMap.clear();
  }
};

export const useTronFinanceManager = ({
  activeChain,
  activeAddress,
  tronPrivateKey,
  enabled,
  t,
  setError,
  setNotification,
  addTransactionRecord,
  refreshWalletData
}: UseTronFinanceManagerParams) => {
  const [resources, setResources] = useState<{
    energyLimit: number;
    energyUsed: number;
    freeNetLimit: number;
    freeNetUsed: number;
    netLimit: number;
    netUsed: number;
    tronPowerLimit: number;
    tronPowerUsed: number;
  } | null>(null);
  const [reward, setReward] = useState<{ claimableSun: bigint; canClaim: boolean }>({
    claimableSun: 0n,
    canClaim: false
  });
  const [votes, setVotes] = useState<TronVoteItem[]>([]);
  const [witnesses, setWitnesses] = useState(() => TronService.getWitnessWhitelist());
  const [action, setAction] = useState<TronFinanceActionState>(emptyAction);
  const [failedSnapshot, setFailedSnapshot] = useState<FailedSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [oneClickProgress, setOneClickProgress] = useState<OneClickProgress>({
    stage: 'idle',
    active: false,
    skippedClaim: false,
    message: '',
    steps: ONE_CLICK_DEFAULT_STEPS
  });
  const refreshLockRef = useRef(false);
  const witnessesRef = useRef(witnesses);
  const actionRef = useRef(action);

  useEffect(() => {
    witnessesRef.current = witnesses;
  }, [witnesses]);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const isTron = activeChain.chainType === 'TRON';
  const rpcHost = useMemo(() => {
    return isTron ? TronService.normalizeHost(activeChain.defaultRpcUrl || '') : '';
  }, [isTron, activeChain.defaultRpcUrl]);
  const refreshFinanceData = useCallback(async () => {
    if (!enabled || !isTron || !activeAddress || !rpcHost) return;
    if (refreshLockRef.current) return;
    refreshLockRef.current = true;
    setIsRefreshing(true);
    try {
      const [resResult, rewardResult, voteResult, witnessResult] = await Promise.allSettled([
        TronService.getAccountResources(rpcHost, activeAddress),
        TronService.getRewardInfo(rpcHost, activeAddress),
        TronService.getVoteStatus(rpcHost, activeAddress),
        TronService.getNodeWitnesses(rpcHost)
      ]);
      if (witnessResult.status === 'fulfilled' && witnessResult.value.length > 0) {
        const incoming = witnessResult.value;
        const current = witnessesRef.current;
        const changed =
          incoming.length !== current.length ||
          incoming.some((w, idx) => w.address.toLowerCase() !== (current[idx]?.address || '').toLowerCase());
        if (changed) setWitnesses(incoming);
      }
      if (resResult.status === 'fulfilled') {
        setResources(resResult.value);
      }
      if (rewardResult.status === 'fulfilled') {
        setReward(rewardResult.value);
      }
      if (voteResult.status === 'fulfilled') {
        const witnessSource =
          witnessResult.status === 'fulfilled' && witnessResult.value.length > 0
            ? witnessResult.value
            : witnessesRef.current;
        const witnessMap = new Map(witnessSource.map((w) => [w.address.toLowerCase(), w.name]));
        setVotes(
          voteResult.value.map((v) => ({
            address: v.address,
            votes: v.votes,
            name: witnessMap.get(v.address.toLowerCase())
          }))
        );
      }
      if (resResult.status === 'rejected' || rewardResult.status === 'rejected' || voteResult.status === 'rejected') {
        setError('TRON finance data refresh failed, please retry.');
      }
    } finally {
      refreshLockRef.current = false;
      setIsRefreshing(false);
    }
  }, [enabled, isTron, activeAddress, rpcHost, setError]);

  useEffect(() => {
    setAction(emptyAction);
    setFailedSnapshot(null);
    if (!enabled || !isTron || !activeAddress) {
      setResources(null);
      setVotes([]);
      setReward({ claimableSun: 0n, canClaim: false });
      return;
    }
    const now = Date.now();
    const staleAt = now - TRON_FINANCE_INIT_REFRESH_TTL_MS;
    for (const [key, ts] of tronFinanceInitRefreshMap) {
      if (ts < staleAt) tronFinanceInitRefreshMap.delete(key);
    }
    const refreshKey = `${activeChain.id}|${rpcHost}|${activeAddress}`;
    const lastAt = tronFinanceInitRefreshMap.get(refreshKey) || 0;
    // React StrictMode 在开发环境会触发 mount 双执行，这里做短窗口去重避免瞬时重复 RPC。
    if (now - lastAt < TRON_FINANCE_INIT_REFRESH_DEDUPE_MS) return;
    tronFinanceInitRefreshMap.set(refreshKey, now);
    refreshFinanceData();
  }, [enabled, isTron, activeAddress, activeChain.id, rpcHost, refreshFinanceData]);

  const recordTx = useCallback(
    (txid: string | undefined, summary: string, status: 'submitted' | 'confirmed' = 'submitted') => {
      if (!txid) return;
      addTransactionRecord({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        chainId: Number(activeChain.id),
        hash: txid,
        status,
        timestamp: Date.now(),
        summary
      });
    },
    [addTransactionRecord, activeChain.id]
  );

  const ensureWritable = (): string | null => {
    if (!isTron || !rpcHost) return 'TRON chain is not active';
    if (!tronPrivateKey) return 'TRON private key missing';
    return null;
  };

  const guardActionInFlight = useCallback((targetStep: 'CLAIM_REWARD' | 'STAKE_RESOURCE' | 'VOTE_WITNESS'): boolean => {
    // signing 阶段属于钱包交互中，统一阻塞，避免并发签名冲突
    if (action.phase === 'signing') {
      setError('A TRON action is still processing. Please wait for confirmation.');
      return true;
    }
    // submitted 阶段只阻塞同类型动作；不同类型允许继续执行
    if (action.phase === 'submitted' && action.step === targetStep) {
      setError('Same TRON action is still awaiting confirmation. Please wait.');
      return true;
    }
    return false;
  }, [action.phase, action.step, setError]);

  const waitForTxConfirmation = useCallback(
    async (txid: string): Promise<{ confirmed: boolean; failed: boolean }> => {
      const deadline = Date.now() + TRON_CONFIRM_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const info = await TronService.getTransactionInfo(rpcHost, txid);
        if (info.found && info.success === true) return { confirmed: true, failed: false };
        if (info.found && info.success === false) return { confirmed: false, failed: true };
        await new Promise((resolve) => setTimeout(resolve, TRON_CONFIRM_POLL_INTERVAL_MS));
      }
      return { confirmed: false, failed: false };
    },
    [rpcHost]
  );

  const finalizeAction = useCallback(
    async (
      result: { success: boolean; txid?: string; error?: string },
      summary: string,
      step: 'CLAIM_REWARD' | 'STAKE_RESOURCE' | 'VOTE_WITNESS'
    ) => {
      if (!result.success) {
        const msg = result.error || 'Operation failed';
        setAction({ phase: 'failed', step, error: msg, txid: result.txid });
        setError(msg);
        return false;
      }

      setAction({ phase: 'submitted', step, txid: result.txid });
      recordTx(result.txid, summary, 'submitted');

      if (result.txid) {
        const txState = await waitForTxConfirmation(result.txid);
        if (txState.failed) {
          const msg = 'Transaction execution failed on-chain';
          setAction({ phase: 'failed', step, txid: result.txid, error: msg });
          setError(msg);
          return false;
        }
        if (txState.confirmed) {
          setAction({ phase: 'confirmed', step, txid: result.txid });
        } else {
          const msg = '链上确认超时：交易可能仍在打包中，请稍后刷新或在交易记录中核对状态。';
          setAction({ phase: 'failed', step, txid: result.txid, error: msg });
          setError(msg);
          return false;
        }
      }

      setFailedSnapshot(null);
      await refreshFinanceData();
      await refreshWalletData(true);
      return true;
    },
    [recordTx, refreshFinanceData, refreshWalletData, setError, waitForTxConfirmation]
  );

  const claimReward = useCallback(async () => {
    const gateError = ensureWritable();
    if (gateError) {
      setError(gateError);
      return false;
    }
    if (guardActionInFlight('CLAIM_REWARD')) return false;
    setAction({ phase: 'signing', step: 'CLAIM_REWARD' });
    const result = await TronService.claimReward(rpcHost, tronPrivateKey!);
    const ok = await finalizeAction(result, 'TRON Claim Reward', 'CLAIM_REWARD');
    if (!ok) setFailedSnapshot({ step: 'CLAIM_REWARD', payload: {} });
    return ok;
  }, [rpcHost, tronPrivateKey, finalizeAction, setError, guardActionInFlight]);

  const stakeResource = useCallback(
    async (amountSun: bigint, resource: TronResourceType) => {
      const gateError = ensureWritable();
      if (gateError) {
        setError(gateError);
        return false;
      }
      if (amountSun <= 0n) {
        setError('Stake amount must be greater than 0');
        return false;
      }
      if (guardActionInFlight('STAKE_RESOURCE')) return false;
      setAction({ phase: 'signing', step: 'STAKE_RESOURCE' });
      const result = await TronService.stakeResource(rpcHost, tronPrivateKey!, amountSun, resource);
      const ok = await finalizeAction(result, `TRON Stake ${resource}`, 'STAKE_RESOURCE');
      if (!ok) setFailedSnapshot({ step: 'STAKE_RESOURCE', payload: { amountSun, resource } });
      return ok;
    },
    [rpcHost, tronPrivateKey, finalizeAction, setError, guardActionInFlight]
  );

  const unstakeResource = useCallback(
    async (amountSun: bigint, resource: TronResourceType) => {
      const gateError = ensureWritable();
      if (gateError) {
        setError(gateError);
        return false;
      }
      if (amountSun <= 0n) {
        setError('Unstake amount must be greater than 0');
        return false;
      }
      if (guardActionInFlight('STAKE_RESOURCE')) return false;
      setAction({ phase: 'signing', step: 'STAKE_RESOURCE' });
      const result = await TronService.unstakeResource(rpcHost, tronPrivateKey!, amountSun, resource);
      return finalizeAction(result, `TRON Unstake ${resource}`, 'STAKE_RESOURCE');
    },
    [rpcHost, tronPrivateKey, finalizeAction, setError, guardActionInFlight]
  );

  const withdrawUnfreeze = useCallback(async () => {
    const gateError = ensureWritable();
    if (gateError) {
      setError(gateError);
      return false;
    }
    if (guardActionInFlight('STAKE_RESOURCE')) return false;
    setAction({ phase: 'signing', step: 'STAKE_RESOURCE' });
    const result = await TronService.withdrawUnfreeze(rpcHost, tronPrivateKey!);
    return finalizeAction(result, 'TRON Withdraw Unfreeze', 'STAKE_RESOURCE');
  }, [rpcHost, tronPrivateKey, finalizeAction, setError, guardActionInFlight]);

  const voteWitnesses = useCallback(
    async (
      voteItems: Array<{ address: string; votes: number }>,
      options?: { skipPowerGuard?: boolean }
    ) => {
      const gateError = ensureWritable();
      if (gateError) {
        setError(gateError);
        return false;
      }
      const skipPowerGuard = !!options?.skipPowerGuard;
      if (!skipPowerGuard && resources && resources.tronPowerLimit - resources.tronPowerUsed <= 0) {
        setError('Insufficient Tron Power. Stake TRX first, then vote.');
        return false;
      }
      const normalized = voteItems
        .map((v) => ({ address: v.address, votes: Math.floor(Number(v.votes || 0)) }))
        .filter((v) => !!v.address && Number.isFinite(v.votes) && v.votes > 0);
      if (normalized.length === 0) {
        setError('Vote count must be greater than 0');
        return false;
      }
      const witnessAddrSet = new Set(witnesses.map((w) => w.address.toLowerCase()));
      const invalid = normalized.find((v) => !witnessAddrSet.has(v.address.toLowerCase()));
      if (invalid) {
        setError('Selected SR does not exist on current node. Please refresh witness list.');
        return false;
      }
      if (guardActionInFlight('VOTE_WITNESS')) return false;
      setAction({ phase: 'signing', step: 'VOTE_WITNESS' });
      const result = await TronService.voteWitnesses(rpcHost, tronPrivateKey!, normalized);
      const ok = await finalizeAction(result, 'TRON Vote Witness', 'VOTE_WITNESS');
      if (!ok) setFailedSnapshot({ step: 'VOTE_WITNESS', payload: { votes: normalized } });
      return ok;
    },
    [rpcHost, tronPrivateKey, finalizeAction, setError, guardActionInFlight, resources, witnesses]
  );

  const runOneClick = useCallback(
    async (input: OneClickInput) => {
      const markStep = (
        key: 'claim' | 'stake' | 'vote',
        status: 'pending' | 'running' | 'success' | 'skipped' | 'failed',
        detail?: string,
        extra?: { txid?: string; at?: number }
      ) => {
        setOneClickProgress((prev) => ({
          ...prev,
          steps: prev.steps.map((s) => (s.key === key ? { ...s, status, detail, ...extra } : s))
        }));
      };
      const distributeEvenly = (totalVotes: number, addresses: string[]) => {
        const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase())))
          .map((lower) => addresses.find((a) => a.toLowerCase() === lower) || '')
          .filter(Boolean);
        if (unique.length === 0) return [] as Array<{ address: string; votes: number }>;
        const base = Math.floor(totalVotes / unique.length);
        const remainder = totalVotes % unique.length;
        return unique
          .map((address, idx) => ({ address, votes: base + (idx < remainder ? 1 : 0) }))
          .filter((v) => v.votes > 0);
      };

      setFailedSnapshot(null);
      setOneClickProgress({
        stage: 'claim',
        active: true,
        skippedClaim: false,
        message: '准备执行闭环流程',
        steps: ONE_CLICK_DEFAULT_STEPS
      });
      try {
        // 奖励为 0 时跳过 claim，避免无意义交易。
        if (reward.claimableSun > 0n) {
          markStep('claim', 'running', undefined, { at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'claim',
            active: true,
            skippedClaim: false,
            message: '第 1 步：领取奖励'
          }));
          const okClaim = await claimReward();
          if (!okClaim) {
            const reason = actionRef.current.error || '领奖未完成';
            markStep('claim', 'failed', reason, { txid: actionRef.current.txid, at: Date.now() });
            setOneClickProgress((prev) => ({
              ...prev,
              stage: 'failed',
              active: false,
              skippedClaim: false,
              message: `失败：领奖未完成（${reason}）`
            }));
            return false;
          }
          markStep('claim', 'success', undefined, { txid: actionRef.current.txid, at: Date.now() });
        } else {
          markStep('claim', 'skipped', '奖励为 0', { at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'claim',
            active: true,
            skippedClaim: true,
            message: '第 1 步：奖励为 0，已跳过领奖'
          }));
        }

        let stakeAmountSun = input.stakeAmountSun;
        if (input.stakeAllAfterClaim) {
          if (!activeAddress) {
            const reason = 'Active TRON address missing';
            setError(reason);
            markStep('stake', 'failed', reason, { at: Date.now() });
            setOneClickProgress((prev) => ({
              ...prev,
              stage: 'failed',
              active: false,
              message: `失败：${reason}`
            }));
            return false;
          }
          const latestBalanceSun = await TronService.getBalance(rpcHost, activeAddress);
          stakeAmountSun = latestBalanceSun - ONE_CLICK_TRX_RESERVE_SUN;
          if (stakeAmountSun <= 0n) {
            const reason = t('wallet.tron_finance_auto_low_balance_error');
            setError(reason);
            markStep('stake', 'failed', t('wallet.tron_finance_auto_low_balance_detail'), { at: Date.now() });
            setOneClickProgress((prev) => ({
              ...prev,
              stage: 'failed',
              active: false,
              message: `失败：${reason}`
            }));
            return false;
          }
        } else if (stakeAmountSun <= 0n) {
          setError('Stake amount must be greater than 0');
          markStep('stake', 'failed', '质押数量必须大于 0', { at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'failed',
            active: false,
            skippedClaim: false,
            message: '失败：质押数量必须大于 0'
          }));
          return false;
        }

        markStep('stake', 'running', undefined, { at: Date.now() });
        setOneClickProgress((prev) => ({
          ...prev,
          stage: 'stake',
          active: true,
          message: input.stakeAllAfterClaim
            ? t('wallet.tron_finance_auto_step_stake')
            : '第 2 步：执行追加质押'
        }));
        const okStake = await stakeResource(stakeAmountSun, input.resource);
        if (!okStake) {
          const reason = actionRef.current.error || '质押未完成';
          markStep('stake', 'failed', reason, { txid: actionRef.current.txid, at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'failed',
            active: false,
            message: `失败：质押未完成（${reason}）`
          }));
          return false;
        }
        markStep('stake', 'success', undefined, { txid: actionRef.current.txid, at: Date.now() });

        const previousWitnesses = votes.map((v) => v.address).filter(Boolean);
        if (previousWitnesses.length === 0) {
          setError('No previous voted SR found. One-click re-vote requires historical voted witnesses.');
          markStep('vote', 'failed', '没有历史投票对象', { at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'failed',
            active: false,
            message: '失败：没有历史投票对象'
          }));
          return false;
        }

        // 闭环语义：追加质押后，按“当前全部票权”重新平均投票给历史已投票对象。
        const waitForVotingPower = async () => {
          const deadline = Date.now() + TRON_POWER_SYNC_TIMEOUT_MS;
          let last = await TronService.getAccountResources(rpcHost, activeAddress!);
          while (Date.now() < deadline) {
            const available = Number(last.tronPowerLimit || 0) - Number(last.tronPowerUsed || 0);
            if (available > 0 || Number(last.tronPowerLimit || 0) > 0) return last;
            await new Promise((resolve) => setTimeout(resolve, TRON_POWER_SYNC_POLL_MS));
            last = await TronService.getAccountResources(rpcHost, activeAddress!);
          }
          return last;
        };

        const latestResources = await waitForVotingPower();
        setResources(latestResources);
        const totalVotes = Math.floor(Number(latestResources.tronPowerLimit || 0));
        if (!Number.isFinite(totalVotes) || totalVotes <= 0) {
          setError('No voting power available after staking.');
          markStep('vote', 'failed', '质押后无可用票权', { at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'failed',
            active: false,
            message: '失败：质押后无可用票权'
          }));
          return false;
        }

        const targetVotes = distributeEvenly(totalVotes, previousWitnesses);
        if (targetVotes.length === 0) {
          setError('Unable to distribute votes. Please check witness list and voting power.');
          markStep('vote', 'failed', '票权分配失败', { at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'failed',
            active: false,
            message: '失败：票权分配失败'
          }));
          return false;
        }

        markStep('vote', 'running', undefined, { at: Date.now() });
        setOneClickProgress((prev) => ({
          ...prev,
          stage: 'vote',
          active: true,
          message: '第 3 步：平均再投票（等待票权同步后执行）'
        }));
        const okVote = await voteWitnesses(targetVotes, { skipPowerGuard: true });
        if (!okVote) {
          const reason = actionRef.current.error || '再投票未完成';
          markStep('vote', 'failed', reason, { txid: actionRef.current.txid, at: Date.now() });
          setOneClickProgress((prev) => ({
            ...prev,
            stage: 'failed',
            active: false,
            message: `失败：再投票未完成（${reason}）`
          }));
          return false;
        }
        markStep('vote', 'success', undefined, { txid: actionRef.current.txid, at: Date.now() });
        setOneClickProgress((prev) => ({
          ...prev,
          stage: 'done',
          active: false,
          message: '闭环已完成'
        }));
        setNotification('TRON finance one-click flow completed');
        return true;
      } catch (e: any) {
        const reason = e?.message || 'Unexpected error';
        setError(reason);
        setOneClickProgress((prev) => ({
          ...prev,
          stage: 'failed',
          active: false,
          message: `失败：执行异常（${reason}）`
        }));
        return false;
      }
    },
    [claimReward, stakeResource, voteWitnesses, reward.claimableSun, votes, setNotification, setError, rpcHost, activeAddress, t]
  );

  const retryFailedStep = useCallback(async () => {
    if (!failedSnapshot) return false;
    if (failedSnapshot.step === 'CLAIM_REWARD') return claimReward();
    if (failedSnapshot.step === 'STAKE_RESOURCE') {
      return stakeResource(failedSnapshot.payload.amountSun, failedSnapshot.payload.resource);
    }
    return voteWitnesses(failedSnapshot.payload.votes);
  }, [failedSnapshot, claimReward, stakeResource, voteWitnesses]);

  return {
    witnesses,
    resources,
    reward,
    votes,
    action,
    failedSnapshot,
    isRefreshing,
    refreshFinanceData,
    claimReward,
    stakeResource,
    unstakeResource,
    withdrawUnfreeze,
    voteWitnesses,
    runOneClick,
    oneClickProgress,
    retryFailedStep
  };
};
