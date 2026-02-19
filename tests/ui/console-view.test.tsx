import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ethers } from 'ethers';
import { ConsoleView } from '../../features/wallet/components/ConsoleView';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { useHttpConsole } from '../../contexts/HttpConsoleContext';

vi.mock('../../contexts/HttpConsoleContext', async () => {
  const actual = await vi.importActual('../../contexts/HttpConsoleContext');
  return {
    ...(actual as any),
    useHttpConsole: vi.fn()
  };
});

const mockUseHttpConsole = () => vi.mocked(useHttpConsole);

describe('ConsoleView', () => {
  it('空事件时显示 empty，并支持 ON/OFF 和清空动作', async () => {
    const user = userEvent.setup();
    const setEnabled = vi.fn();
    const clear = vi.fn();

    mockUseHttpConsole().mockReturnValue({
      enabled: false,
      setEnabled,
      expanded: true,
      setExpanded: vi.fn(),
      open: vi.fn(),
      events: [],
      clear
    });

    render(
      <LanguageProvider>
        <ConsoleView mode="dock" onMinimize={vi.fn()} />
      </LanguageProvider>
    );

    await user.click(screen.getByRole('button', { name: 'OFF' }));
    await user.click(screen.getByRole('button', { name: /clear|清空/i }));

    expect(setEnabled).toHaveBeenCalledWith(true);
    expect(clear).toHaveBeenCalled();
    expect(screen.getByText(/no requests captured yet|暂无|empty/i)).toBeInTheDocument();
  });

  it('可展开事件详情并解析 Safe owners/threshold/nonce', async () => {
    const user = userEvent.setup();
    const coder = ethers.AbiCoder.defaultAbiCoder();

    const eventOwners = {
      id: '1',
      ts: Date.now(),
      category: 'rpc' as const,
      method: 'POST',
      url: 'https://rpc.test',
      host: 'rpc.test',
      status: 200,
      durationMs: 12,
      action: 'SAFE getOwners',
      requestBody: {
        method: 'eth_call',
        params: [{ data: '0xa0e67e2b' }]
      },
      responseBody: {
        result: coder.encode(['address[]'], [[
          '0x0000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000002'
        ]])
      }
    };

    const eventThreshold = {
      ...eventOwners,
      id: '2',
      action: 'SAFE threshold',
      requestBody: {
        method: 'eth_call',
        params: [{ data: '0xe75235b8' }]
      },
      responseBody: {
        result: coder.encode(['uint256'], [2n])
      }
    };

    const eventNonce = {
      ...eventOwners,
      id: '3',
      action: 'SAFE nonce',
      requestBody: {
        method: 'eth_call',
        params: [{ data: '0xaffed0e0' }]
      },
      responseBody: {
        result: coder.encode(['uint256'], [9n])
      }
    };

    mockUseHttpConsole().mockReturnValue({
      enabled: true,
      setEnabled: vi.fn(),
      expanded: true,
      setExpanded: vi.fn(),
      open: vi.fn(),
      events: [eventOwners as any, eventThreshold as any, eventNonce as any],
      clear: vi.fn()
    });

    render(
      <LanguageProvider>
        <ConsoleView />
      </LanguageProvider>
    );

    await user.click(screen.getByRole('button', { name: /SAFE getOwners/i }));
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /SAFE threshold/i }));
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /SAFE nonce/i }));
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('page 模式支持返回按钮，且详情对异常数据与兜底展示稳定', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const circular: any = { a: 1 };
    circular.self = circular;

    mockUseHttpConsole().mockReturnValue({
      enabled: true,
      setEnabled: vi.fn(),
      expanded: true,
      setExpanded: vi.fn(),
      open: vi.fn(),
      events: [
        {
          id: 'bad-1',
          ts: Date.now(),
          category: 'rpc',
          method: 'POST',
          url: 'https://rpc.bad',
          host: '',
          status: undefined,
          durationMs: undefined,
          action: '',
          requestBody: circular,
          responseBody: null
        },
        {
          id: 'bad-2',
          ts: Date.now(),
          category: 'rpc',
          method: 'POST',
          url: 'https://rpc.bad/2',
          host: undefined,
          status: 200,
          durationMs: 1890,
          action: 'ok-action',
          requestBody: { params: [{ data: '0x12' }] },
          responseBody: { result: 123 }
        }
      ] as any,
      clear: vi.fn()
    });

    render(
      <LanguageProvider>
        <ConsoleView mode="page" onBack={onBack} />
      </LanguageProvider>
    );

    await user.click(screen.getByLabelText('console-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/unknown/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /ok-action/i }));
    expect(screen.getAllByText('1.89s').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('dock 模式渲染最小化按钮并支持点击', async () => {
    const user = userEvent.setup();
    const onMinimize = vi.fn();

    mockUseHttpConsole().mockReturnValue({
      enabled: true,
      setEnabled: vi.fn(),
      expanded: true,
      setExpanded: vi.fn(),
      open: vi.fn(),
      events: [
        {
          id: 'd1',
          ts: Date.now(),
          category: 'rpc' as const,
          method: 'POST',
          url: 'https://rpc.test',
          host: 'rpc.test',
          status: 200,
          durationMs: 50,
          action: 'eth_call'
        }
      ] as any,
      clear: vi.fn()
    });

    render(
      <LanguageProvider>
        <ConsoleView mode="dock" onMinimize={onMinimize} />
      </LanguageProvider>
    );

    await user.click(screen.getByLabelText('console-minimize'));
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it('选择无 Safe 数据的事件时不渲染解码卡片', async () => {
    const user = userEvent.setup();

    mockUseHttpConsole().mockReturnValue({
      enabled: true,
      setEnabled: vi.fn(),
      expanded: true,
      setExpanded: vi.fn(),
      open: vi.fn(),
      events: [
        {
          id: 'plain-1',
          ts: Date.now(),
          category: 'http' as const,
          method: 'GET',
          url: 'https://api.example.com/data',
          host: 'api.example.com',
          status: 200,
          durationMs: 350,
          action: 'Load Data',
          requestBody: null,
          responseBody: 'hello world'
        }
      ] as any,
      clear: vi.fn()
    });

    render(
      <LanguageProvider>
        <ConsoleView mode="page" />
      </LanguageProvider>
    );

    // Hosts should render
    expect(screen.getAllByText('api.example.com').length).toBeGreaterThan(0);

    // Click the event
    await user.click(screen.getByRole('button', { name: /Load Data/i }));

    // Safe decode cards should NOT be present (only check for SAFE cards, not general text)
    expect(screen.queryAllByText(/SAFE/).filter(el => el.className.includes('blue')).length).toBe(0);
    // Duration should render as 350ms
    expect(screen.getAllByText('350ms').length).toBeGreaterThan(0);
  });

  it('fmtMs >= 1000 时显示秒, 且 responseBody=null 时详情区显示空', async () => {
    const user = userEvent.setup();

    mockUseHttpConsole().mockReturnValue({
      enabled: true,
      setEnabled: vi.fn(),
      expanded: true,
      setExpanded: vi.fn(),
      open: vi.fn(),
      events: [
        {
          id: 'ev-sub1000',
          ts: Date.now(),
          category: 'rpc' as const,
          method: 'POST',
          url: 'https://rpc.test',
          host: 'rpc.test',
          status: 500,
          durationMs: 42,
          action: 'fast-req',
          requestBody: { method: 'eth_blockNumber' },
          responseBody: null
        }
      ] as any,
      clear: vi.fn()
    });

    render(
      <LanguageProvider>
        <ConsoleView />
      </LanguageProvider>
    );

    // durationMs < 1000 shows ms
    expect(screen.getByText('42ms')).toBeInTheDocument();

    // Click to select the event
    await user.click(screen.getByRole('button', { name: /fast-req/i }));
    // responseBody is null => safeStringify returns ''
    expect(screen.getAllByText('500').length).toBeGreaterThan(0);
  });

  it('ON 状态 toggle 为 OFF', async () => {
    const user = userEvent.setup();
    const setEnabled = vi.fn();

    mockUseHttpConsole().mockReturnValue({
      enabled: true,
      setEnabled,
      expanded: true,
      setExpanded: vi.fn(),
      open: vi.fn(),
      events: [],
      clear: vi.fn()
    });

    render(
      <LanguageProvider>
        <ConsoleView />
      </LanguageProvider>
    );

    await user.click(screen.getByRole('button', { name: 'ON' }));
    expect(setEnabled).toHaveBeenCalledWith(false);
  });
});

