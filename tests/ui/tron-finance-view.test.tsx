import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TronFinanceView } from '../../features/wallet/components/TronFinanceView';
import type { ChainConfig } from '../../features/wallet/types';

const wrap = (ui: React.ReactElement) => render(ui);

const tronChain: ChainConfig = {
  id: 2494104990,
  name: 'Tron Nile Testnet',
  defaultRpcUrl: 'https://nile.trongrid.io',
  publicRpcUrls: ['https://nile.trongrid.io'],
  currencySymbol: 'TRX',
  chainType: 'TRON',
  explorers: [],
  tokens: []
};

const createManager = () => ({
  witnesses: [
    { address: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn', name: 'Witness A', isActive: true },
    { address: 'TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp', name: 'Witness B', isActive: true }
  ],
  resources: {
    energyLimit: 1000,
    energyUsed: 100,
    freeNetLimit: 1000,
    freeNetUsed: 200,
    netLimit: 500,
    netUsed: 100,
    tronPowerLimit: 20,
    tronPowerUsed: 8
  },
  reward: { claimableSun: 0n, canClaim: false },
  votes: [
    { address: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn', name: 'Witness A', votes: 8 },
    { address: 'TNotInCurrentWitnessListxxxxxxxxxxxx', name: 'Stale Witness', votes: 2 }
  ],
  action: { phase: 'idle' as const },
  failedSnapshot: null,
  isRefreshing: false,
  refreshFinanceData: vi.fn(),
  claimReward: vi.fn(async () => true),
  stakeResource: vi.fn(async () => true),
  unstakeResource: vi.fn(async () => true),
  withdrawUnfreeze: vi.fn(async () => true),
  voteWitnesses: vi.fn(async () => true),
  runOneClick: vi.fn(async () => true),
  oneClickProgress: {
    stage: 'failed' as const,
    active: false,
    skippedClaim: false,
    message: '失败：再投票未完成',
    steps: [
      { key: 'claim' as const, label: '领取奖励', status: 'success' as const, txid: '0xaaa', at: Date.now() - 2000 },
      { key: 'stake' as const, label: '追加质押', status: 'success' as const, txid: '0xbbb', at: Date.now() - 1000 },
      { key: 'vote' as const, label: '平均再投票', status: 'failed' as const, detail: 'Insufficient Tron Power', txid: '0xccc', at: Date.now() }
    ]
  },
  retryFailedStep: vi.fn(async () => true)
});

describe('TronFinanceView UI', () => {
  it('投票页默认勾选“历史已投票且在当前列表中”的对象', async () => {
    const manager = createManager();
    wrap(<TronFinanceView activeChain={tronChain} onBack={vi.fn()} manager={manager} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '投票' }));

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('闭环快捷展示三步状态并可见失败原因详情', async () => {
    const manager = createManager();
    wrap(<TronFinanceView activeChain={tronChain} onBack={vi.fn()} manager={manager} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '闭环快捷' }));

    const step1 = await screen.findByText(/1\.\s*领取奖励/);
    const step2 = await screen.findByText(/2\.\s*追加质押/);
    const step3 = await screen.findByText(/3\.\s*平均再投票/);
    expect(step1).toBeInTheDocument();
    expect(step2).toBeInTheDocument();
    expect(step3).toBeInTheDocument();
    expect(await screen.findByText(/失败：再投票未完成/)).toBeInTheDocument();

    const voteStepDetails = step3.closest('details');
    expect(voteStepDetails).toBeTruthy();
    const voteSummary = within(voteStepDetails as HTMLElement).getByText(/3\.\s*平均再投票/);
    await user.click(voteSummary);
    expect(await within(voteStepDetails as HTMLElement).findByText(/txid:\s*0xccc/)).toBeInTheDocument();
    expect(await within(voteStepDetails as HTMLElement).findByText(/详情：Insufficient Tron Power/)).toBeInTheDocument();
  });
});
