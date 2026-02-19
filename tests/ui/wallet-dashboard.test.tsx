import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { WalletDashboard } from '../../features/wallet/components/WalletDashboard';
import { ChainConfig, TokenConfig, TransactionRecord } from '../../features/wallet/types';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
const syncOk = {
  phase: 'idle' as const,
  rpcUrl: 'https://rpc.bittorrentchain.io',
  balanceKnown: true,
  tokenBalancesKnown: true,
  lastUpdatedAt: Date.now(),
  error: null as string | null
};

const chain: ChainConfig = {
  id: 199,
  name: 'BitTorrent Chain',
  defaultRpcUrl: 'https://rpc.bittorrentchain.io',
  publicRpcUrls: ['https://rpc.bittorrentchain.io'],
  currencySymbol: 'BTT',
  chainType: 'EVM',
  explorers: [
    {
      name: 'BttcScan',
      key: 'bttcscan',
      url: 'https://bttcscan.com',
      txPath: 'https://bttcscan.com/tx/{txid}',
      addressPath: 'https://bttcscan.com/address/{address}'
    }
  ],
  tokens: []
};

const baseTokens: TokenConfig[] = [
  { symbol: 'BTT', name: 'BitTorrent', address: '0x0000000000000000000000000000000000000001', decimals: 18 },
  { symbol: 'MCK', name: 'Mock Token', address: '0x00000000000000000000000000000000000000aa', decimals: 18, isCustom: true }
];

const txs: TransactionRecord[] = [
  {
    id: '1',
    timestamp: Date.now(),
    status: 'confirmed',
    hash: '0x' + 'a'.repeat(64),
    summary: 'Send 1 BTT',
    chainId: 199
  }
];

describe('WalletDashboard UI', () => {
  it('点击发送和刷新会触发回调', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onSend = vi.fn();

    wrap(
      <WalletDashboard
        balance="1.23"
        dataSync={syncOk}
        activeChain={chain}
        chains={[chain]}
        address="0x000000000000000000000000000000000000dEaD"
        isLoading={false}
        onRefresh={onRefresh}
        onSend={onSend}
        activeAccountType="EOA"
        onViewSettings={vi.fn()}
        tokens={baseTokens}
        tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
        onAddToken={vi.fn()}
        onEditToken={vi.fn()}
        transactions={txs}
      />
    );

    await user.click(screen.getByRole('button', { name: 'refresh-balance' }));
    await user.click(screen.getByRole('button', { name: 'SEND' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('SAFE 模式下显示设置入口，并触发回调', async () => {
    const user = userEvent.setup();
    const onViewSettings = vi.fn();

    wrap(
      <WalletDashboard
        balance="2"
        dataSync={syncOk}
        activeChain={chain}
        chains={[chain]}
        address="0x000000000000000000000000000000000000dEaD"
        isLoading={false}
        onRefresh={vi.fn()}
        onSend={vi.fn()}
        activeAccountType="SAFE"
        onViewSettings={onViewSettings}
        tokens={baseTokens}
        tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
        onAddToken={vi.fn()}
        onEditToken={vi.fn()}
        transactions={txs}
      />
    );

    const settingsBtn = screen.getByRole('button', { name: /SAFE_MOD|MODIFY/i });

    await user.click(settingsBtn);

    expect(onViewSettings).toHaveBeenCalledTimes(1);
  });

  it('点击自定义 token 卡片会触发编辑', async () => {
    const user = userEvent.setup();
    const onEditToken = vi.fn();

    wrap(
      <WalletDashboard
        balance="1"
        dataSync={syncOk}
        activeChain={chain}
        chains={[chain]}
        address="0x000000000000000000000000000000000000dEaD"
        isLoading={false}
        onRefresh={vi.fn()}
        onSend={vi.fn()}
        activeAccountType="EOA"
        onViewSettings={vi.fn()}
        tokens={baseTokens}
        tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
        onAddToken={vi.fn()}
        onEditToken={onEditToken}
        transactions={txs}
      />
    );

    await user.click(screen.getByText(/Mock Token/i));
    expect(onEditToken).toHaveBeenCalledWith(baseTokens[1]);
  });

  it('复制地址时在 clipboard 不可用场景回退到 prompt', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);
    const clipboardBackup = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    });

    try {
      wrap(
        <WalletDashboard
          balance="1"
          dataSync={syncOk}
          activeChain={chain}
          chains={[chain]}
          address="0x000000000000000000000000000000000000dEaD"
          isLoading={false}
          onRefresh={vi.fn()}
          onSend={vi.fn()}
          activeAccountType="EOA"
          onViewSettings={vi.fn()}
          tokens={baseTokens}
          tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
          onAddToken={vi.fn()}
          onEditToken={vi.fn()}
          transactions={txs}
        />
      );
      await user.click(screen.getByText('0x000000000000000000000000000000000000dEaD'));
      expect(promptSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: clipboardBackup
      });
      promptSpy.mockRestore();
    }
  });

  it('点击二维码按钮可打开并关闭地址二维码弹窗', async () => {
    const user = userEvent.setup();
    wrap(
      <WalletDashboard
        balance="1"
        dataSync={syncOk}
        activeChain={chain}
        chains={[chain]}
        address="0x000000000000000000000000000000000000dEaD"
        isLoading={false}
        onRefresh={vi.fn()}
        onSend={vi.fn()}
        activeAccountType="EOA"
        onViewSettings={vi.fn()}
        tokens={baseTokens}
        tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
        onAddToken={vi.fn()}
        onEditToken={vi.fn()}
        transactions={txs}
      />
    );

    await user.click(screen.getByRole('button', { name: 'show-address-qr' }));
    expect(screen.getByRole('button', { name: 'close-qr' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'close-qr' }));
    expect(screen.queryByRole('button', { name: 'close-qr' })).not.toBeInTheDocument();
  });

  it('TRON 链展示理财入口且隐藏导入 token 按钮', async () => {
    const user = userEvent.setup();
    const onOpenTronFinance = vi.fn();
    const tronChain: ChainConfig = {
      ...chain,
      id: 728126428,
      chainType: 'TRON',
      currencySymbol: 'TRX'
    };

    wrap(
      <WalletDashboard
        balance="1"
        dataSync={syncOk}
        activeChain={tronChain}
        chains={[tronChain]}
        address="TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT"
        isLoading={false}
        onRefresh={vi.fn()}
        onSend={vi.fn()}
        activeAccountType="EOA"
        onViewSettings={vi.fn()}
        tokens={baseTokens}
        tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
        onAddToken={vi.fn()}
        onEditToken={vi.fn()}
        transactions={txs}
        onOpenTronFinance={onOpenTronFinance}
      />
    );

    expect(screen.queryByText(/import token/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'TRON Finance' }));
    expect(onOpenTronFinance).toHaveBeenCalledTimes(1);
  });

  it('无交易记录时展示空日志占位', () => {
    wrap(
      <WalletDashboard
        balance="1"
        dataSync={syncOk}
        activeChain={chain}
        chains={[chain]}
        address="0x000000000000000000000000000000000000dEaD"
        isLoading={false}
        onRefresh={vi.fn()}
        onSend={vi.fn()}
        activeAccountType="EOA"
        onViewSettings={vi.fn()}
        tokens={baseTokens}
        tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
        onAddToken={vi.fn()}
        onEditToken={vi.fn()}
        transactions={[]}
      />
    );

    expect(screen.getByText(/No operations logged|暂无操作记录/i)).toBeInTheDocument();
  });

  it('数据未就绪时展示余额与代币占位，并显示同步状态文案', () => {
    const syncing = {
      ...syncOk,
      phase: 'updating' as const,
      balanceKnown: false,
      tokenBalancesKnown: false
    };

    wrap(
      <WalletDashboard
        balance="0"
        dataSync={syncing}
        activeChain={chain}
        chains={[chain]}
        address="0x000000000000000000000000000000000000dEaD"
        isLoading
        onRefresh={vi.fn()}
        onSend={vi.fn()}
        activeAccountType="EOA"
        onViewSettings={vi.fn()}
        tokens={baseTokens}
        tokenBalances={{}}
        onAddToken={vi.fn()}
        onEditToken={vi.fn()}
        transactions={txs}
      />
    );

    expect(screen.getByLabelText('balance-loading')).toBeInTheDocument();
    expect(screen.getAllByLabelText('token-balance-loading').length).toBeGreaterThan(0);
    expect(screen.getByText(/Updating|更新中/i)).toBeInTheDocument();
  });

  it('同步失败时展示错误提示，且无 hash 的交易不渲染外链', () => {
    const dataSyncError = {
      ...syncOk,
      phase: 'error' as const
    };
    const txNoHash: TransactionRecord[] = [
      {
        id: '2',
        timestamp: Date.now(),
        status: 'failed',
        summary: 'Failed tx',
        chainId: 999
      }
    ];
    wrap(
      <WalletDashboard
        balance="1"
        dataSync={dataSyncError}
        activeChain={chain}
        chains={[chain]}
        address="0x000000000000000000000000000000000000dEaD"
        isLoading={false}
        onRefresh={vi.fn()}
        onSend={vi.fn()}
        activeAccountType="EOA"
        onViewSettings={vi.fn()}
        tokens={baseTokens}
        tokenBalances={{ [baseTokens[0].address.toLowerCase()]: '1.23', [baseTokens[1].address.toLowerCase()]: '2.50' }}
        onAddToken={vi.fn()}
        onEditToken={vi.fn()}
        transactions={txNoHash}
      />
    );

    expect(screen.getByText(/Update failed|刷新重试|刷新/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('clipboard 正常可用时 writeText 成功复制地址', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const clipboardBackup = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    try {
      wrap(
        <WalletDashboard
          balance="1"
          dataSync={syncOk}
          activeChain={chain}
          chains={[chain]}
          address="0x000000000000000000000000000000000000dEaD"
          isLoading={false}
          onRefresh={vi.fn()}
          onSend={vi.fn()}
          activeAccountType="EOA"
          onViewSettings={vi.fn()}
          tokens={baseTokens}
          tokenBalances={{}}
          onAddToken={vi.fn()}
          onEditToken={vi.fn()}
          transactions={txs}
        />
      );
      await user.click(screen.getByText('0x000000000000000000000000000000000000dEaD'));
      expect(writeTextMock).toHaveBeenCalledWith('0x000000000000000000000000000000000000dEaD');
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: clipboardBackup
      });
    }
  });

  it('clipboard.writeText 同步抛出异常时回退到 prompt', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);
    const clipboardBackup = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockImplementation(() => { throw new Error('denied'); }) }
    });

    try {
      wrap(
        <WalletDashboard
          balance="1"
          dataSync={syncOk}
          activeChain={chain}
          chains={[chain]}
          address="0x000000000000000000000000000000000000dEaD"
          isLoading={false}
          onRefresh={vi.fn()}
          onSend={vi.fn()}
          activeAccountType="EOA"
          onViewSettings={vi.fn()}
          tokens={baseTokens}
          tokenBalances={{}}
          onAddToken={vi.fn()}
          onEditToken={vi.fn()}
          transactions={txs}
        />
      );
      await user.click(screen.getByText('0x000000000000000000000000000000000000dEaD'));
      expect(promptSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: clipboardBackup
      });
      promptSpy.mockRestore();
    }
  });
});

