import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChainConfig } from '../../features/wallet/types';
import { useEvmWallet } from '../../features/wallet/hooks/useEvmWallet';
import { useWalletStorage } from '../../features/wallet/hooks/useWalletStorage';
import { useWalletState } from '../../features/wallet/hooks/useWalletState';
import { useWalletData } from '../../features/wallet/hooks/useWalletData';
import { useTransactionManager } from '../../features/wallet/hooks/useTransactionManager';
import { useSafeManager } from '../../features/wallet/hooks/useSafeManager';
import { LanguageProvider } from '../../contexts/LanguageContext';

vi.mock('../../features/wallet/hooks/useWalletStorage', () => ({ useWalletStorage: vi.fn() }));
vi.mock('../../features/wallet/hooks/useWalletState', () => ({ useWalletState: vi.fn() }));
vi.mock('../../features/wallet/hooks/useWalletData', () => ({ useWalletData: vi.fn() }));
vi.mock('../../features/wallet/hooks/useTransactionManager', () => ({ useTransactionManager: vi.fn() }));
vi.mock('../../features/wallet/hooks/useSafeManager', () => ({ useSafeManager: vi.fn() }));

const chainA: ChainConfig = {
  id: 199,
  name: 'BitTorrent Chain',
  defaultRpcUrl: 'https://rpc.bittorrentchain.io',
  publicRpcUrls: ['https://rpc.bittorrentchain.io'],
  currencySymbol: 'BTT',
  chainType: 'EVM',
  explorers: [],
  tokens: []
};

const chainB: ChainConfig = {
  id: 1,
  name: 'Ethereum Mainnet',
  defaultRpcUrl: 'https://eth.llamarpc.com',
  publicRpcUrls: ['https://eth.llamarpc.com'],
  currencySymbol: 'ETH',
  chainType: 'EVM',
  explorers: [],
  tokens: []
};

interface SetupOverrides {
  trackedSafes?: Array<{ address: string; name: string; chainId: number }>;
  safeDetails?: any;
  activeSafeAddress?: string | null;
  wallet?: { address: string } | null;
  unstableFetchData?: boolean;
}

const setupMocks = (activeAccountType: 'EOA' | 'SAFE', overrides: SetupOverrides = {}) => {
  const storageMock = {
    trackedSafes: overrides.trackedSafes ?? [],
    setTrackedSafes: vi.fn(),
    chains: [chainA, chainB],
    setChains: vi.fn(),
    customTokens: {},
    setCustomTokens: vi.fn()
  };

  const stateMock = {
    wallet: overrides.wallet ?? null,
    tronPrivateKey: null,
    tronWalletAddress: null,
    activeAccountType,
    setActiveAccountType: vi.fn(),
    activeSafeAddress: overrides.activeSafeAddress ?? '0x000000000000000000000000000000000000dEaD',
    setActiveSafeAddress: vi.fn(),
    activeChainId: 199,
    setActiveChainId: vi.fn(),
    view: 'dashboard',
    setView: vi.fn(),
    error: null,
    setError: vi.fn(),
    notification: null,
    setNotification: vi.fn(),
    tokenToEdit: null,
    setTokenToEdit: vi.fn(),
    isChainModalOpen: false,
    setIsChainModalOpen: vi.fn(),
    isAddTokenModalOpen: false,
    setIsAddTokenModalOpen: vi.fn(),
    handleImport: vi.fn(async () => true),
    privateKeyOrPhrase: '',
    setPrivateKeyOrPhrase: vi.fn(),
    setWallet: vi.fn(),
    isMenuOpen: true,
    setIsMenuOpen: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn()
  };

  const dataMock = {
    fetchData: vi.fn(async () => {}),
    balance: '0.00',
    tokenBalances: {},
    safeDetails: overrides.safeDetails ?? null,
    isInitialFetchDone: true
  };

  const txMgrMock = {
    transactions: [],
    localNonceRef: { current: null },
    handleSendSubmit: vi.fn(async () => ({ success: true })),
    syncNonce: vi.fn(async () => {}),
    addTransactionRecord: vi.fn()
  };

  const safeMgrMock = {
    isDeployingSafe: false,
    handleSafeProposal: vi.fn(async () => true),
    deploySafe: vi.fn(async () => {}),
    addOwnerTx: vi.fn(async () => true),
    removeOwnerTx: vi.fn(async () => true),
    changeThresholdTx: vi.fn(async () => true)
  };

  vi.mocked(useWalletStorage).mockReturnValue(storageMock as any);
  vi.mocked(useWalletState).mockReturnValue(stateMock as any);
  if (overrides.unstableFetchData) {
    const baseFetchData = dataMock.fetchData;
    vi.mocked(useWalletData).mockImplementation(() => ({
      ...dataMock,
      // 每次 render 提供新函数引用，模拟依赖抖动场景
      fetchData: (...args: unknown[]) => (baseFetchData as any)(...args)
    }) as any);
  } else {
    vi.mocked(useWalletData).mockReturnValue(dataMock as any);
  }
  vi.mocked(useTransactionManager).mockReturnValue(txMgrMock as any);
  vi.mocked(useSafeManager).mockReturnValue(safeMgrMock as any);

  return { stateMock, dataMock, storageMock, txMgrMock, safeMgrMock };
};

describe('useEvmWallet handleSwitchNetwork', () => {
  it('渲染阶段不应主动触发 nonce 同步（避免重复 nonce RPC）', () => {
    const { stateMock, txMgrMock } = setupMocks('EOA');
    renderHook(() => useEvmWallet(), { wrapper: LanguageProvider });

    // useEvmWallet 不应在渲染/挂载阶段主动调用 txMgr.syncNonce
    expect(txMgrMock.syncNonce).not.toHaveBeenCalled();
    expect(stateMock.setError).not.toHaveBeenCalled();
  });

  it('同一 dashboard 事件上下文下不应因 fetchData 引用变化而循环请求', () => {
    const { dataMock } = setupMocks('EOA', {
      wallet: { address: '0x000000000000000000000000000000000000beef' },
      unstableFetchData: true
    });
    const { rerender } = renderHook(() => useEvmWallet(), { wrapper: LanguageProvider });

    rerender();
    rerender();

    expect(dataMock.fetchData).toHaveBeenCalledTimes(1);
    expect(dataMock.fetchData).toHaveBeenCalledWith(false);
  });

  it('SAFE 模式切链时重置为 EOA 并清空 activeSafeAddress', () => {
    const { stateMock } = setupMocks('SAFE');
    const { result } = renderHook(() => useEvmWallet(), { wrapper: LanguageProvider });

    act(() => {
      result.current.handleSwitchNetwork(1);
    });

    expect(stateMock.setActiveChainId).toHaveBeenCalledWith(1);
    expect(stateMock.setView).toHaveBeenCalledWith('dashboard');
    expect(stateMock.setIsMenuOpen).toHaveBeenCalledWith(false);
    expect(stateMock.setActiveAccountType).toHaveBeenCalledWith('EOA');
    expect(stateMock.setActiveSafeAddress).toHaveBeenCalledWith(null);
  });

  it('EOA 模式切链不会重复触发 SAFE 重置', () => {
    const { stateMock } = setupMocks('EOA');
    const { result } = renderHook(() => useEvmWallet(), { wrapper: LanguageProvider });

    act(() => {
      result.current.handleSwitchNetwork(1);
    });

    expect(stateMock.setActiveChainId).toHaveBeenCalledWith(1);
    expect(stateMock.setView).toHaveBeenCalledWith('dashboard');
    expect(stateMock.setIsMenuOpen).toHaveBeenCalledWith(false);
    expect(stateMock.setActiveAccountType).not.toHaveBeenCalled();
    expect(stateMock.setActiveSafeAddress).not.toHaveBeenCalled();
  });

  it('handleRefreshData 会触发强制刷新', () => {
    const { stateMock, dataMock } = setupMocks('EOA');

    const { result } = renderHook(() => useEvmWallet(), { wrapper: LanguageProvider });
    act(() => {
      result.current.handleRefreshData();
    });

    expect(stateMock.setActiveAccountType).not.toHaveBeenCalled();
    expect(dataMock.fetchData).toHaveBeenCalledWith(true);
  });

  it('handleTrackSafe 对同链同地址执行去重', () => {
    const existing = {
      address: '0x000000000000000000000000000000000000dEaD',
      name: 'Safe_dead',
      chainId: 199
    };
    const { storageMock } = setupMocks('EOA', { trackedSafes: [existing] });
    const { result } = renderHook(() => useEvmWallet(), { wrapper: LanguageProvider });

    act(() => {
      result.current.handleTrackSafe('0x000000000000000000000000000000000000dead');
    });

    expect(storageMock.setTrackedSafes).toHaveBeenCalledTimes(1);
    const updater = storageMock.setTrackedSafes.mock.calls[0][0] as (prev: typeof existing[]) => typeof existing[];
    const next = updater([existing]);
    expect(next).toHaveLength(1);
  });

});
