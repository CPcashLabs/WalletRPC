import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { TransferStateView } from '../../features/wallet/components/TransferStateView';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('TransferStateView UI', () => {
  it('idle 状态不渲染内容', () => {
    const { container } = wrap(
      <TransferStateView status="idle" onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('success 状态展示回到主界面和浏览器链接', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(
      <TransferStateView
        status="success"
        txHash={'0x' + 'a'.repeat(64)}
        explorerUrl="https://example.com/tx/1"
        onClose={onClose}
      />
    );

    expect(screen.getByRole('heading', { name: /TRANSMISSION CONFIRMED/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /INSPECT_TX/i })).toHaveAttribute('href', 'https://example.com/tx/1');

    await user.click(screen.getByRole('button', { name: /RETURN_TO_BASE/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('error 状态展示错误并允许重置', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(
      <TransferStateView
        status="error"
        error="RPC timeout"
        onClose={onClose}
      />
    );

    expect(screen.getByText('RPC timeout')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /REBOOT_FORM/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('timeout 状态展示后台处理入口', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(
      <TransferStateView
        status="timeout"
        txHash={'0x' + 'b'.repeat(64)}
        explorerUrl="https://example.com/tx/2"
        onClose={onClose}
      />
    );

    expect(screen.getByRole('heading', { name: /PENDING VALIDATION/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /VIEW_EXPLORER/i })).toHaveAttribute('href', 'https://example.com/tx/2');

    await user.click(screen.getByRole('button', { name: /BACKGROUND_RUN/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
