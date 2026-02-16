import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ChainConfig, TronResourceType } from '../types';

interface TronFinanceViewProps {
  activeChain: ChainConfig;
  isLoading?: boolean;
  onBack: () => void;
  manager: {
    witnesses: Array<{ address: string; name: string; website?: string; description?: string; isActive: boolean }>;
    resources: {
      energyLimit: number;
      energyUsed: number;
      freeNetLimit: number;
      freeNetUsed: number;
      netLimit: number;
      netUsed: number;
      tronPowerLimit: number;
      tronPowerUsed: number;
    } | null;
    reward: { claimableSun: bigint; canClaim: boolean };
    votes: Array<{ address: string; name?: string; votes: number }>;
    action: { phase: 'idle' | 'signing' | 'submitted' | 'confirmed' | 'failed'; step?: string; txid?: string; error?: string };
    failedSnapshot: { step: string; payload: unknown } | null;
    isRefreshing?: boolean;
    refreshFinanceData: () => Promise<void> | void;
    claimReward: () => Promise<boolean>;
    stakeResource: (amountSun: bigint, resource: TronResourceType) => Promise<boolean>;
    unstakeResource: (amountSun: bigint, resource: TronResourceType) => Promise<boolean>;
    withdrawUnfreeze: () => Promise<boolean>;
    voteWitnesses: (
      votes: Array<{ address: string; votes: number }>,
      options?: { skipPowerGuard?: boolean }
    ) => Promise<boolean>;
    runOneClick: (input: {
      resource: TronResourceType;
      stakeAmountSun: bigint;
      votes: Array<{ address: string; votes: number }>;
    }) => Promise<boolean>;
    oneClickProgress?: {
      stage: 'idle' | 'claim' | 'stake' | 'vote' | 'done' | 'failed';
      active: boolean;
      skippedClaim: boolean;
      message: string;
      steps: Array<{
        key: 'claim' | 'stake' | 'vote';
        label: string;
        status: 'pending' | 'running' | 'success' | 'skipped' | 'failed';
        detail?: string;
      }>;
    };
    retryFailedStep: () => Promise<boolean>;
  };
}

const toSun = (trx: string): bigint => {
  const t = trx.trim();
  if (!t) return 0n;
  const [i, d = ''] = t.split('.');
  const intPart = i.replace(/\D/g, '') || '0';
  const decPart = d.replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
  return BigInt(`${intPart}${decPart}`);
};

const fromSun = (sun: bigint): string => {
  const s = sun.toString().padStart(7, '0');
  const intPart = s.slice(0, -6);
  const decPart = s.slice(-6).replace(/0+$/, '') || '0';
  return `${intPart}.${decPart}`;
};

const distributeVotesEvenly = (totalVotes: number, addresses: string[]) => {
  const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase())))
    .map((lower) => addresses.find((a) => a.toLowerCase() === lower) || '')
    .filter(Boolean);
  if (unique.length === 0 || totalVotes <= 0) return [] as Array<{ address: string; votes: number }>;
  const base = Math.floor(totalVotes / unique.length);
  const remainder = totalVotes % unique.length;
  return unique
    .map((address, idx) => ({ address, votes: base + (idx < remainder ? 1 : 0) }))
    .filter((v) => v.votes > 0);
};

export const TronFinanceView: React.FC<TronFinanceViewProps> = ({ activeChain, isLoading, onBack, manager }) => {
  const [tab, setTab] = useState<'resource' | 'vote' | 'reward' | 'oneclick'>('resource');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [resource, setResource] = useState<TronResourceType>('ENERGY');
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  const [voteCount, setVoteCount] = useState('1');
  const [oneClickStake, setOneClickStake] = useState('');
  const [oneClickResource, setOneClickResource] = useState<TronResourceType>('ENERGY');
  const isSigning = manager.action.phase === 'signing';
  const isStepSubmitted = (step: 'CLAIM_REWARD' | 'STAKE_RESOURCE' | 'VOTE_WITNESS') =>
    manager.action.phase === 'submitted' && manager.action.step === step;
  const isStakeBusy = isSigning || isStepSubmitted('STAKE_RESOURCE');
  const isVoteBusy = isSigning || isStepSubmitted('VOTE_WITNESS');
  const isClaimBusy = isSigning || isStepSubmitted('CLAIM_REWARD');
  const isAnyBusy = isSigning || manager.action.phase === 'submitted';
  const totalTronPower = Math.max(0, manager.resources?.tronPowerLimit || 0);
  const votedTronPower = Math.max(0, manager.resources?.tronPowerUsed || 0);
  const availableTronPower = Math.max(0, totalTronPower - votedTronPower);

  useEffect(() => {
    if (!manager.witnesses.length) return;
    const selectable = new Set(manager.witnesses.map((w) => w.address.toLowerCase()));
    const votedInList = manager.votes
      .map((v) => v.address)
      .filter((addr) => selectable.has(addr.toLowerCase()));
    if (selectedWitnesses.length === 0) {
      setSelectedWitnesses(votedInList);
      return;
    }
    setSelectedWitnesses((prev) => prev.filter((addr) => selectable.has(addr.toLowerCase())));
  }, [manager.witnesses, manager.votes, selectedWitnesses.length]);

  const statusText = useMemo(() => {
    if (manager.action.phase === 'idle') return '空闲';
    if (manager.action.phase === 'signing') return `待签名 ${manager.action.step || ''}`;
    if (manager.action.phase === 'submitted') return `已提交 ${manager.action.step || ''}（等待确认）`;
    if (manager.action.phase === 'confirmed') return '已确认';
    return `失败: ${manager.action.error || 'Unknown error'}`;
  }, [manager.action]);

  return (
    <div className="max-w-3xl mx-auto animate-tech-in space-y-5 pb-24 touch-pan-y">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900">TRON Finance</h2>
            <p className="text-xs text-slate-500">Stake / Vote / Claim / Re-stake loop ({activeChain.name})</p>
          </div>
        </div>
        <button
          onClick={() => manager.refreshFinanceData()}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          disabled={!!manager.isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading || manager.isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Action Status</div>
        <div className="mt-2 text-sm font-mono text-slate-800">{statusText}</div>
        {manager.action.txid && (
          <div className="mt-1 text-xs text-slate-500 break-all">txid: {manager.action.txid}</div>
        )}
        {manager.failedSnapshot && (
          <div className="mt-3">
            <Button variant="outline" className="text-xs" onClick={() => manager.retryFailedStep()}>
              Resume From Failed Step ({manager.failedSnapshot.step})
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === 'resource' ? 'primary' : 'outline'} className="text-xs" onClick={() => setTab('resource')}>
          资源
        </Button>
        <Button variant={tab === 'vote' ? 'primary' : 'outline'} className="text-xs" onClick={() => setTab('vote')}>
          投票
        </Button>
        <Button variant={tab === 'reward' ? 'primary' : 'outline'} className="text-xs" onClick={() => setTab('reward')}>
          奖励
        </Button>
        <Button variant={tab === 'oneclick' ? 'primary' : 'outline'} className="text-xs" onClick={() => setTab('oneclick')}>
          闭环快捷
        </Button>
      </div>

      {tab === 'resource' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-sm font-bold">资源总览</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-slate-500 mb-1">Energy</div>
                <div className="font-black text-slate-900">{manager.resources ? `${manager.resources.energyUsed}/${manager.resources.energyLimit}` : '-'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-slate-500 mb-1">Bandwidth</div>
                <div className="font-black text-slate-900">
                  {manager.resources ? `${manager.resources.netUsed + manager.resources.freeNetUsed}/${manager.resources.netLimit + manager.resources.freeNetLimit}` : '-'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-slate-500 mb-1">投票资源</div>
                <div className={`font-black ${availableTronPower > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {votedTronPower}/{totalTronPower}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="text-sm font-bold text-slate-900">质押 TRX</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="px-3 py-2 border rounded-lg" placeholder="质押数量（TRX）" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
              <select className="px-3 py-2 border rounded-lg" value={resource} onChange={(e) => setResource(e.target.value as TronResourceType)}>
                <option value="ENERGY">质押为 ENERGY</option>
                <option value="BANDWIDTH">质押为 BANDWIDTH</option>
              </select>
            </div>
            <Button onClick={() => manager.stakeResource(toSun(stakeAmount), resource)} disabled={isStakeBusy}>
              {isStakeBusy ? '处理中...' : '提交质押'}
            </Button>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="text-sm font-bold text-slate-900">解质押与提取</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="px-3 py-2 border rounded-lg" placeholder="解质押数量（TRX）" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
              <select className="px-3 py-2 border rounded-lg" value={resource} onChange={(e) => setResource(e.target.value as TronResourceType)}>
                <option value="ENERGY">解质押 ENERGY</option>
                <option value="BANDWIDTH">解质押 BANDWIDTH</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => manager.unstakeResource(toSun(unstakeAmount), resource)} disabled={isStakeBusy}>
                提交解质押
              </Button>
              <Button variant="outline" onClick={() => manager.withdrawUnfreeze()} disabled={isStakeBusy}>
                提取已解锁资产
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'vote' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="text-sm font-bold">SR 投票</div>
          {manager.witnesses.length === 0 && (
            <div className="text-xs px-3 py-2 rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
              当前节点未返回可用 SR 列表，请点击右上角刷新后重试。
            </div>
          )}
          <div className={`text-xs px-3 py-2 rounded-lg border ${availableTronPower > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {availableTronPower > 0 ? `当前可投票资源: ${availableTronPower}` : '当前可投票资源不足，请先完成质押。'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="px-3 py-2 border rounded-lg" placeholder="总票数（将平均分配）" value={voteCount} onChange={(e) => setVoteCount(e.target.value)} />
            <div className="px-3 py-2 border rounded-lg text-xs text-slate-600">
              已选 SR: {selectedWitnesses.length}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto border rounded-lg p-2">
            {manager.witnesses.map((w) => {
              const checked = selectedWitnesses.includes(w.address);
              return (
                <label key={w.address} className="flex items-center gap-2 text-xs px-2 py-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWitnesses((prev) => [...prev, w.address]);
                      } else {
                        setSelectedWitnesses((prev) => prev.filter((addr) => addr !== w.address));
                      }
                    }}
                  />
                  <span className="font-medium">{w.name}</span>
                  <span className="text-slate-400">({w.address.slice(0, 6)}...{w.address.slice(-4)})</span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              disabled={isVoteBusy || availableTronPower <= 0 || selectedWitnesses.length === 0 || manager.witnesses.length === 0}
              isLoading={isVoteBusy}
              onClick={() => {
                const total = Math.max(1, Math.floor(Number(voteCount || '0')));
                const payload = distributeVotesEvenly(total, selectedWitnesses);
                manager.voteWitnesses(payload);
              }}
            >
              {isVoteBusy ? '处理中...' : '提交投票'}
            </Button>
          </div>
          <div className="text-xs text-slate-600">
            {manager.votes.length === 0 ? '暂无投票记录' : manager.votes.map((v) => `${v.name || v.address}: ${v.votes}`).join(' | ')}
          </div>
        </div>
      )}

      {tab === 'reward' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="text-sm font-bold">奖励</div>
          <div className="text-xs text-slate-600">Claimable: {fromSun(manager.reward.claimableSun)} TRX</div>
          <Button onClick={() => manager.claimReward()} disabled={!manager.reward.canClaim || isClaimBusy} isLoading={isClaimBusy}>
            Claim Reward
          </Button>
        </div>
      )}

      {tab === 'oneclick' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="text-sm font-bold">领奖 {'->'} 再质押 {'->'} 再投票</div>
          <div className="text-xs px-3 py-2 rounded-lg border bg-slate-50 text-slate-600 border-slate-200">
            若奖励为 0，将跳过领奖。完成追加质押后，会用“当前全部票权”对历史已投票对象做一次平均再投票。
          </div>
          <div className="text-xs px-3 py-2 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
            自动投票对象：已投票 SR（{manager.votes.length} 个）。
            {manager.votes.length > 0
              ? ` ${manager.votes.map((v) => v.name || `${v.address.slice(0, 6)}...${v.address.slice(-4)}`).join(' / ')}`
              : ' 当前无历史投票对象，无法自动再投票。'}
          </div>
          <div className="text-xs px-3 py-2 rounded-lg border bg-slate-50 text-slate-700 border-slate-200">
            当前阶段：
            {manager.oneClickProgress?.message
              ? ` ${manager.oneClickProgress.message}`
              : ' 待执行'}
          </div>
          <div className="text-xs rounded-lg border border-slate-200 overflow-hidden">
            {(manager.oneClickProgress?.steps || [
              { key: 'claim', label: '领取奖励', status: 'pending' as const },
              { key: 'stake', label: '追加质押', status: 'pending' as const },
              { key: 'vote', label: '平均再投票', status: 'pending' as const }
            ]).map((step, idx) => (
              <details key={step.key} className={`${idx < 2 ? 'border-b border-slate-100' : ''}`}>
                <summary className="px-3 py-2 flex items-center justify-between cursor-pointer list-none">
                  <div className="text-slate-700">{idx + 1}. {step.label}</div>
                  <div className={`font-black ${
                    step.status === 'success' ? 'text-emerald-600' :
                    step.status === 'failed' ? 'text-red-600' :
                    step.status === 'running' ? 'text-blue-600' :
                    step.status === 'skipped' ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    {step.status === 'success' && '成功'}
                    {step.status === 'failed' && '失败'}
                    {step.status === 'running' && '进行中'}
                    {step.status === 'skipped' && '跳过'}
                    {step.status === 'pending' && '待执行'}
                  </div>
                </summary>
                <div className="px-3 pb-3 text-[11px] text-slate-500 space-y-1">
                  <div>阶段：{step.label}</div>
                  <div>状态：{
                    step.status === 'success' ? '成功' :
                    step.status === 'failed' ? '失败' :
                    step.status === 'running' ? '进行中' :
                    step.status === 'skipped' ? '跳过' : '待执行'
                  }</div>
                  {step.txid && <div className="break-all">txid: {step.txid}</div>}
                  {step.at && <div>时间：{new Date(step.at).toLocaleString()}</div>}
                  {step.detail && <div className={step.status === 'failed' ? 'text-red-600' : ''}>详情：{step.detail}</div>}
                </div>
              </details>
            ))}
          </div>
          {manager.oneClickProgress?.steps?.some((s) => s.status === 'failed' && s.detail) && (
            <div className="text-xs px-3 py-2 rounded-lg border bg-red-50 text-red-700 border-red-200">
              失败原因：
              {manager.oneClickProgress.steps
                .filter((s) => s.status === 'failed' && s.detail)
                .map((s) => `${s.label}: ${s.detail}`)
                .join('；')}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="px-3 py-2 border rounded-lg" placeholder="Stake TRX amount" value={oneClickStake} onChange={(e) => setOneClickStake(e.target.value)} />
            <select className="px-3 py-2 border rounded-lg" value={oneClickResource} onChange={(e) => setOneClickResource(e.target.value as TronResourceType)}>
              <option value="ENERGY">ENERGY</option>
              <option value="BANDWIDTH">BANDWIDTH</option>
            </select>
          </div>
          <Button
            disabled={isAnyBusy || manager.votes.length === 0}
            isLoading={isAnyBusy}
            onClick={() =>
              manager.runOneClick({
                resource: oneClickResource,
                stakeAmountSun: toSun(oneClickStake),
                // 闭环快捷固定使用“已投票对象”，由 manager 在 runOneClick 内完成平均分配
                votes: []
              })
            }
          >
            {isAnyBusy ? `处理中：${manager.oneClickProgress?.message || '请稍候'}` : '执行闭环快捷'}
          </Button>
        </div>
      )}
    </div>
  );
};
