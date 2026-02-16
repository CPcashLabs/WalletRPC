import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HttpConsoleProvider } from '../../contexts/HttpConsoleContext';
import { WalletApp } from '../../features/wallet/WalletApp';

vi.mock('../../features/wallet/hooks/useEvmWallet', () => ({
  useEvmWallet: vi.fn()
}));

vi.mock('../../features/wallet/components/WalletOnboarding', () => ({
  WalletOnboarding: ({ onImport }: any) => (
    <div>
      <div>onboarding-screen</div>
      <button onClick={onImport}>mock-import</button>
    </div>
  )
}));
vi.mock('../../features/wallet/components/WalletDashboard', () => ({
  WalletDashboard: ({ onSend, onOpenTronFinance, onViewSettings }: any) => (
    <div>
      <button onClick={onSend}>go-send</button>
      <button onClick={onOpenTronFinance}>go-tron</button>
      <button onClick={onViewSettings}>go-settings</button>
    </div>
  )
}));
vi.mock('../../features/wallet/components/SendForm', () => ({
  SendForm: ({ onBack }: any) => <button onClick={onBack}>back-dashboard</button>
}));
vi.mock('../../features/wallet/components/TronFinanceView', () => ({
  TronFinanceView: ({ onBack }: any) => <button onClick={onBack}>back-from-tron</button>
}));
vi.mock('../../features/wallet/components/SafeViews', () => ({
  SafeSettings: () => <div>safe-settings</div>,
  CreateSafe: () => <div>safe-create</div>,
  TrackSafe: () => <div>safe-track</div>
}));
vi.mock('../../features/wallet/components/Modals', () => ({
  ChainModal: () => <div>chain-modal</div>,
  AddTokenModal: () => <div>add-token-modal</div>,
  EditTokenModal: () => <div>edit-token-modal</div>
}));
vi.mock('../../components/ui/ParticleIntro', () => ({
  ParticleIntro: ({ fadeOut }: any) => <div>intro-{String(fadeOut)}</div>
}));

const getUseEvmWalletMock = async () => {
  const mod = await import('../../features/wallet/hooks/useEvmWallet');
  return vi.mocked(mod.useEvmWallet);
};

const makeBase = () => ({
  wallet: { address: '0x000000000000000000000000000000000000beef' },
  activeChain: {
    id: 199,
    name: 'BitTorrent Chain',
    defaultRpcUrl: 'https://rpc.bittorrentchain.io',
    publicRpcUrls: ['https://rpc.bittorrentchain.io'],
    currencySymbol: 'BTT',
    chainType: 'EVM',
    explorers: [],
    tokens: []
  },
  activeAddress: '0x000000000000000000000000000000000000beef',
  activeChainTokens: [],
  activeAccountType: 'EOA',
  setActiveAccountType: vi.fn(),
  activeSafeAddress: null,
  setActiveSafeAddress: vi.fn(),
  activeChainId: 199,
  chains: [],
  view: 'dashboard',
  setView: vi.fn(),
  isMenuOpen: false,
  setIsMenuOpen: vi.fn(),
  isLoading: false,
  isIntroPreflightDone: true,
  error: null,
  errorObject: null,
  notification: null,
  isChainModalOpen: false,
  setIsChainModalOpen: vi.fn(),
  isAddTokenModalOpen: false,
  setIsAddTokenModalOpen: vi.fn(),
  tokenToEdit: null,
  setTokenToEdit: vi.fn(),
  balance: '1',
  tokenBalances: {},
  sync: { phase: 'idle', rpcUrl: null, balanceKnown: true, tokenBalancesKnown: true, lastUpdatedAt: Date.now(), error: null },
  transactions: [],
  safeDetails: null,
  isDeployingSafe: false,
  trackedSafes: [],
  setTrackedSafes: vi.fn(),
  privateKeyOrPhrase: '',
  setPrivateKeyOrPhrase: vi.fn(),
  handleImport: vi.fn(async () => true),
  handleSendSubmit: vi.fn(),
  confirmAddToken: vi.fn(),
  handleUpdateToken: vi.fn(),
  handleRemoveToken: vi.fn(),
  handleSaveChain: vi.fn(),
  handleTrackSafe: vi.fn(),
  handleSwitchNetwork: vi.fn(),
  handleLogout: vi.fn(),
  handleRefreshData: vi.fn(),
  handleOpenTronFinance: vi.fn(),
  refreshSafeDetails: vi.fn(),
  deploySafe: vi.fn(),
  addOwnerTx: vi.fn(),
  removeOwnerTx: vi.fn(),
  changeThresholdTx: vi.fn(),
  setError: vi.fn(),
  tronFinance: {}
} as any);

describe('WalletApp flow', () => {
  it('dashboard 下操作按钮能触发对应事件', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    await user.click(await screen.findByText('go-send'));
    await user.click(await screen.findByText('go-tron'));
    await user.click(screen.getByLabelText('open-network-settings'));

    expect(state.setView).toHaveBeenCalledWith('send');
    expect(state.handleOpenTronFinance).toHaveBeenCalled();
    expect(state.setIsChainModalOpen).toHaveBeenCalledWith(true);
  });

  it('wallet 不存在时显示 onboarding', async () => {
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.wallet = null;
    state.view = 'onboarding';
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    expect(screen.getByText('onboarding-screen')).toBeInTheDocument();
  });

  it('intro_animation 视图渲染 Intro 组件', async () => {
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.view = 'intro_animation';
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    expect(await screen.findByText(/intro-/)).toBeInTheDocument();
  });

  it('send/settings/create/add 视图能渲染对应子页面', async () => {
    const useEvmWallet = await getUseEvmWalletMock();
    const cases: Array<{ view: string; expected: string }> = [
      { view: 'send', expected: 'back-dashboard' },
      { view: 'settings', expected: 'safe-settings' },
      { view: 'create_safe', expected: 'safe-create' },
      { view: 'add_safe', expected: 'safe-track' }
    ];

    for (const c of cases) {
      const state = makeBase();
      state.view = c.view;
      if (c.view === 'settings') {
        state.safeDetails = { owners: [], threshold: 1, nonce: 0 };
      }
      useEvmWallet.mockReturnValue(state);
      const { unmount } = render(
        <LanguageProvider>
          <HttpConsoleProvider>
            <WalletApp />
          </HttpConsoleProvider>
        </LanguageProvider>
      );
      expect(await screen.findByText(c.expected)).toBeInTheDocument();
      unmount();
    }
  });

  it('存在 error/notification 时展示提示层', async () => {
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.error = 'boom';
    state.errorObject = {
      message: 'boom',
      shownAt: Date.now(),
      lastEventAt: Date.now(),
      expiresAt: Date.now() + 3000,
      count: 2
    };
    state.notification = 'hello';
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(await screen.findByText('hello')).toBeInTheDocument();
  });

  it('onboarding 导入成功后会进入 intro_animation（非 e2e bypass）', async () => {
    vi.useFakeTimers();
    try {
      const useEvmWallet = await getUseEvmWalletMock();
      const state = makeBase();
      state.wallet = null;
      state.view = 'onboarding';
      state.handleImport = vi.fn(async () => true);
      useEvmWallet.mockReturnValue(state);

      render(
        <LanguageProvider>
          <HttpConsoleProvider>
            <WalletApp />
          </HttpConsoleProvider>
        </LanguageProvider>
      );

      fireEvent.click(screen.getByText('mock-import'));
      await act(async () => {
        await Promise.resolve();
        vi.advanceTimersByTime(260);
      });
      expect(state.setView).toHaveBeenCalledWith('intro_animation');
    } finally {
      vi.useRealTimers();
    }
  });

  it('onboarding 导入成功且 query 含 e2e=1 时直接进入 dashboard', async () => {
    const useEvmWallet = await getUseEvmWalletMock();
    const oldPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.pushState({}, '', `${window.location.pathname}?e2e=1`);

    const state = makeBase();
    state.wallet = null;
    state.view = 'onboarding';
    state.handleImport = vi.fn(async () => true);
    useEvmWallet.mockReturnValue(state);

    const user = userEvent.setup();
    const { unmount } = render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    await user.click(screen.getByText('mock-import'));
    expect(state.setView).toHaveBeenCalledWith('dashboard');

    unmount();
    window.history.pushState({}, '', oldPath);
  });

  it('菜单展开时可切换到指定 SAFE 账户上下文', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.isMenuOpen = true;
    state.trackedSafes = [{ address: '0x000000000000000000000000000000000000c0de', name: 'Safe_c0de', chainId: 199 }];
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    await user.click(await screen.findByText('Safe_c0de'));

    expect(state.setActiveAccountType).toHaveBeenCalledWith('SAFE');
    expect(state.setActiveSafeAddress).toHaveBeenCalledWith('0x000000000000000000000000000000000000c0de');
    expect(state.setIsMenuOpen).toHaveBeenCalledWith(false);
    expect(state.setView).toHaveBeenCalledWith('dashboard');
  });

  it('TRON 链下即使 isMenuOpen=true 也不渲染账户菜单', async () => {
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.activeChain = { ...state.activeChain, chainType: 'TRON' };
    state.view = 'tron_finance';
    state.isMenuOpen = true;
    state.trackedSafes = [{ address: '0x000000000000000000000000000000000000c0de', name: 'Safe_c0de', chainId: 199 }];
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    expect(screen.queryByText('Safe_c0de')).not.toBeInTheDocument();
    expect(await screen.findByText('back-from-tron')).toBeInTheDocument();
  });
});
