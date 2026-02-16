import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  SafeSettings: ({ onBack, onRefreshSafeDetails, onAddOwner, onRemoveOwner, onChangeThreshold }: any) => (
    <div>
      <div>safe-settings</div>
      <button onClick={onBack}>safe-settings-back</button>
      <button onClick={() => onRefreshSafeDetails?.(true)}>safe-settings-refresh</button>
      <button onClick={() => onAddOwner?.('0x1', 1)}>safe-settings-add-owner</button>
      <button onClick={() => onRemoveOwner?.('0x1', 1)}>safe-settings-remove-owner</button>
      <button onClick={() => onChangeThreshold?.(2)}>safe-settings-change-threshold</button>
    </div>
  ),
  CreateSafe: ({ onCancel, onDeploy }: any) => (
    <div>
      <div>safe-create</div>
      <button onClick={onCancel}>safe-create-cancel</button>
      <button onClick={() => onDeploy?.(['0x1'], 1)}>safe-create-deploy</button>
    </div>
  ),
  TrackSafe: ({ onCancel, onTrack }: any) => (
    <div>
      <div>safe-track</div>
      <button onClick={onCancel}>safe-track-cancel</button>
      <button onClick={() => onTrack?.('0x000000000000000000000000000000000000c0de')}>safe-track-submit</button>
    </div>
  )
}));
vi.mock('../../features/wallet/components/Modals', () => ({
  ChainModal: ({ onClose, onSwitchNetwork, onOpenConsole, onSave }: any) => (
    <div>
      <div>chain-modal</div>
      <button onClick={() => onSwitchNetwork?.(1)}>chain-modal-switch</button>
      <button onClick={onOpenConsole}>chain-modal-console</button>
      <button onClick={() => onSave?.({ id: 199 })}>chain-modal-save</button>
      <button onClick={onClose}>chain-modal-close</button>
    </div>
  ),
  AddTokenModal: ({ onClose, onImport }: any) => (
    <div>
      <div>add-token-modal</div>
      <button onClick={() => onImport?.('0x00000000000000000000000000000000000000aa')}>add-token-import</button>
      <button onClick={onClose}>add-token-close</button>
    </div>
  ),
  EditTokenModal: ({ onClose, onSave, onDelete }: any) => (
    <div>
      <div>edit-token-modal</div>
      <button onClick={() => onSave?.({ address: '0x1' })}>edit-token-save</button>
      <button onClick={() => onDelete?.('0x1')}>edit-token-delete</button>
      <button onClick={onClose}>edit-token-close</button>
    </div>
  )
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

  it('错误提示可手动关闭，并调用 setError(null)', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.error = 'boom';
    state.errorObject = {
      message: 'boom',
      shownAt: Date.now(),
      lastEventAt: Date.now(),
      expiresAt: Date.now() + 10_000,
      count: 1
    };
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    const alert = await screen.findByRole('alert');
    const closeBtn = within(alert).getByRole('button');
    await user.click(closeBtn);
    expect(state.setError).toHaveBeenCalledWith(null);
  });

  it('通知提示可手动关闭并从页面移除', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.notification = 'hello';
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    const msg = await screen.findByText('hello');
    const closeBtn = msg.parentElement?.querySelector('button') as HTMLButtonElement;
    await user.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText('hello')).not.toBeInTheDocument();
    });
  });

  it('菜单中切回 EOA 与创建/导入 safe 按钮能触发对应回调', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.isMenuOpen = true;
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    const masterKeyEntries = screen.getAllByText(/Master Key/i);
    await user.click(masterKeyEntries[1] ?? masterKeyEntries[0]);
    expect(state.setActiveAccountType).toHaveBeenCalledWith('EOA');
    expect(state.setIsMenuOpen).toHaveBeenCalledWith(false);
    expect(state.setView).toHaveBeenCalledWith('dashboard');

    await user.click(screen.getByText(/DEPLO_NEW|Deploy New/i));
    expect(state.setView).toHaveBeenCalledWith('create_safe');

    await user.click(screen.getByText(/IMPORT/i));
    expect(state.setView).toHaveBeenCalledWith('add_safe');
  });

  it('删除当前激活 safe 时会回退到 EOA 并清空 activeSafeAddress', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.isMenuOpen = true;
    state.activeSafeAddress = '0x000000000000000000000000000000000000c0de';
    state.trackedSafes = [{ address: '0x000000000000000000000000000000000000c0de', name: 'Safe_c0de', chainId: 199 }];
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    const removeBtn = screen.getAllByRole('button').find((btn) =>
      btn.className.includes('hover:text-red-500')
    ) as HTMLButtonElement;
    await user.click(removeBtn);

    expect(state.setTrackedSafes).toHaveBeenCalled();
    expect(state.setActiveAccountType).toHaveBeenCalledWith('EOA');
    expect(state.setActiveSafeAddress).toHaveBeenCalledWith(null);
    expect(state.setView).toHaveBeenCalledWith('dashboard');
  });

  it('send/tron/settings/create/add 视图中的回调能回到 dashboard 或触发动作', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();

    const sendState = makeBase();
    sendState.view = 'send';
    useEvmWallet.mockReturnValue(sendState);
    const r1 = render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );
    await user.click(screen.getByText('back-dashboard'));
    expect(sendState.setView).toHaveBeenCalledWith('dashboard');
    r1.unmount();

    const tronState = makeBase();
    tronState.view = 'tron_finance';
    tronState.activeChain = { ...tronState.activeChain, chainType: 'TRON' };
    useEvmWallet.mockReturnValue(tronState);
    const r2 = render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );
    await user.click(screen.getByText('back-from-tron'));
    expect(tronState.setView).toHaveBeenCalledWith('dashboard');
    r2.unmount();

    const settingsState = makeBase();
    settingsState.view = 'settings';
    settingsState.safeDetails = { owners: [], threshold: 1, nonce: 0 };
    useEvmWallet.mockReturnValue(settingsState);
    const r3 = render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );
    await user.click(screen.getByText('safe-settings-back'));
    await user.click(screen.getByText('safe-settings-refresh'));
    await user.click(screen.getByText('safe-settings-add-owner'));
    await user.click(screen.getByText('safe-settings-remove-owner'));
    await user.click(screen.getByText('safe-settings-change-threshold'));
    expect(settingsState.setView).toHaveBeenCalledWith('dashboard');
    expect(settingsState.refreshSafeDetails).toHaveBeenCalled();
    expect(settingsState.addOwnerTx).toHaveBeenCalled();
    expect(settingsState.removeOwnerTx).toHaveBeenCalled();
    expect(settingsState.changeThresholdTx).toHaveBeenCalled();
    r3.unmount();

    const createState = makeBase();
    createState.view = 'create_safe';
    useEvmWallet.mockReturnValue(createState);
    const r4 = render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );
    await user.click(screen.getByText('safe-create-cancel'));
    await user.click(screen.getByText('safe-create-deploy'));
    expect(createState.setView).toHaveBeenCalledWith('dashboard');
    expect(createState.deploySafe).toHaveBeenCalled();
    r4.unmount();

    const addState = makeBase();
    addState.view = 'add_safe';
    useEvmWallet.mockReturnValue(addState);
    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );
    await user.click(screen.getByText('safe-track-cancel'));
    await user.click(screen.getByText('safe-track-submit'));
    expect(addState.setView).toHaveBeenCalledWith('dashboard');
    expect(addState.handleTrackSafe).toHaveBeenCalled();
  });

  it('modal 回调能够触发对应钱包操作', async () => {
    const user = userEvent.setup();
    const useEvmWallet = await getUseEvmWalletMock();
    const state = makeBase();
    state.isChainModalOpen = true;
    useEvmWallet.mockReturnValue(state);

    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <WalletApp />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    await user.click(await screen.findByText('chain-modal-switch'));
    await user.click(screen.getByText('chain-modal-console'));
    await user.click(screen.getByText('chain-modal-save'));
    await user.click(screen.getByText('chain-modal-close'));

    expect(state.handleSwitchNetwork).toHaveBeenCalledWith(1);
    expect(state.handleSaveChain).toHaveBeenCalled();
    expect(state.setIsChainModalOpen).toHaveBeenCalledWith(false);
  });
});
