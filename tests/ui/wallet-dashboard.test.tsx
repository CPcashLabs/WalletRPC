import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { WalletDashboard } from '../../features/wallet/components/WalletDashboard';
import { ChainConfig, TokenConfig, TransactionRecord } from '../../features/wallet/types';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

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
});
