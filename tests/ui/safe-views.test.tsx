import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { CreateSafe, SafeQueue, SafeSettings, TrackSafe } from '../../features/wallet/components/SafeViews';
import { SafePendingTx } from '../../features/wallet/types';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('Safe views UI', () => {
  it('SafeQueue 在达不到阈值时禁止执行并可触发签名', async () => {
    const user = userEvent.setup();
    const onSign = vi.fn();
    const onExecute = vi.fn();
    const tx: SafePendingTx = {
      id: '1',
      to: '0x00000000000000000000000000000000000000aa',
      value: '0',
      data: '0x',
      nonce: 2,
      safeTxHash: '0x' + 'a'.repeat(64),
      signatures: { '0x1111111111111111111111111111111111111111': '0x1234' },
      summary: 'Send 1 ETH'
    };

    wrap(
      <SafeQueue
        pendingTxs={[tx]}
        safeDetails={{ owners: ['0x1111111111111111111111111111111111111111'], threshold: 2, nonce: 2 }}
        walletAddress="0x2222222222222222222222222222222222222222"
        onSign={onSign}
        onExecute={onExecute}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Sign' }));
    expect(onSign).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Execute' })).toBeDisabled();
  });

  it('SafeSettings 可更新阈值', async () => {
    const user = userEvent.setup();
    const onChangeThreshold = vi.fn(async () => true);
    wrap(
      <SafeSettings
        safeDetails={{
          owners: [
            '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222'
          ],
          threshold: 1,
          nonce: 0
        }}
        walletAddress="0x1111111111111111111111111111111111111111"
        onRemoveOwner={vi.fn(async () => true)}
        onAddOwner={vi.fn(async () => true)}
        onChangeThreshold={onChangeThreshold}
        onBack={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '2');
    await user.click(screen.getByRole('button', { name: 'Update' }));
    expect(onChangeThreshold).toHaveBeenCalledWith(2);
  });

  it('CreateSafe 会过滤空 owner 并提交', async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    wrap(<CreateSafe onDeploy={onDeploy} onCancel={vi.fn()} isDeploying={false} walletAddress="0x1111111111111111111111111111111111111111" />);

    await user.click(screen.getByText('Append Member'));
    const inputs = screen.getAllByPlaceholderText('0x...');
    await user.type(inputs[1], '0x2222222222222222222222222222222222222222');
    await user.click(screen.getByRole('button', { name: 'EXECUTE_DEPLOYMENT_SIG' }));

    expect(onDeploy).toHaveBeenCalledWith(
      ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222'],
      1
    );
  });

  it('TrackSafe 对非法地址报错，对合法地址回调', async () => {
    const user = userEvent.setup();
    const onTrack = vi.fn();
    wrap(<TrackSafe onTrack={onTrack} onCancel={vi.fn()} isLoading={false} />);

    const input = screen.getByPlaceholderText('0x...');
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: 'INITIATE_WATCHLIST_SYNC' }));
    expect(screen.getByText('Invalid prefix')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '0x000000000000000000000000000000000000dEaD');
    await user.click(screen.getByRole('button', { name: 'INITIATE_WATCHLIST_SYNC' }));
    expect(onTrack).toHaveBeenCalledWith('0x000000000000000000000000000000000000dEaD');
  });
});

