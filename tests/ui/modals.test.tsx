import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AddTokenModal, ChainModal, EditTokenModal } from '../../features/wallet/components/Modals';
import { ChainConfig } from '../../features/wallet/types';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

const chain: ChainConfig = {
  id: 199,
  name: 'BitTorrent Chain',
  defaultRpcUrl: 'https://rpc.bittorrentchain.io',
  publicRpcUrls: ['https://rpc.bittorrentchain.io', 'https://1rpc.io/btt'],
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

describe('Modals UI', () => {
  it('ChainModal 支持切换网络并保存配置', async () => {
    const user = userEvent.setup();
    const onSwitchNetwork = vi.fn();
    const onSave = vi.fn();

    wrap(
      <ChainModal
        isOpen={true}
        onClose={vi.fn()}
        initialConfig={chain}
        chains={[chain, { ...chain, id: 1, name: 'Ethereum Mainnet' }]}
        onSwitchNetwork={onSwitchNetwork}
        onSave={onSave}
      />
    );

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '1');
    expect(onSwitchNetwork).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('AddTokenModal 可输入地址并触发导入', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    wrap(<AddTokenModal isOpen={true} onClose={vi.fn()} onImport={onImport} isImporting={false} />);

    await user.type(screen.getByPlaceholderText('0x...'), '0x00000000000000000000000000000000000000aa');
    await user.click(screen.getByRole('button', { name: 'Import Token' }));

    expect(onImport).toHaveBeenCalledWith('0x00000000000000000000000000000000000000aa');
  });

  it('EditTokenModal 可保存与删除', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onDelete = vi.fn();
    wrap(
      <EditTokenModal
        token={{ symbol: 'ABC', name: 'Alpha', address: '0x00000000000000000000000000000000000000ab', decimals: 18 }}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={onDelete}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    await user.clear(inputs[0]);
    await user.type(inputs[0], 'XYZ');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('0x00000000000000000000000000000000000000ab');
  });
});

