import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletApp } from '../../features/wallet/WalletApp';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HttpConsoleProvider } from '../../contexts/HttpConsoleContext';

// Mock dependencies
vi.mock('../../features/wallet/hooks/useEvmWallet', () => ({
    useEvmWallet: vi.fn()
}));
vi.mock('../../features/wallet/components/WalletOnboarding', () => ({
    WalletOnboarding: ({ onImport }: any) => <button onClick={onImport}>mock-import</button>
}));
vi.mock('../../components/ui/ParticleIntro', () => ({
    ParticleIntro: ({ fadeOut }: any) => <div data-testid="intro">intro-{String(fadeOut)}</div>
}));
vi.mock('../../features/wallet/components/WalletDashboard', () => ({
    WalletDashboard: () => <div>dashboard</div>
}));

const getUseEvmWalletMock = async () => {
    const mod = await import('../../features/wallet/hooks/useEvmWallet');
    return vi.mocked(mod.useEvmWallet);
};

const makeBase = () => ({
    wallet: { address: '0x123' },
    activeChain: { id: 1, chainType: 'EVM' },
    activeAccountType: 'EOA',
    setActiveAccountType: vi.fn(),
    trackedSafes: [],
    setTrackedSafes: vi.fn(),
    view: 'dashboard',
    setView: vi.fn(),
    isMenuOpen: false,
    setIsMenuOpen: vi.fn(),
    error: null,
    errorObject: null,
    handleImport: vi.fn(async () => true),
    handleLogout: vi.fn(),
    activeChainTokens: [],
    tokens: [],
    tokenBalances: {},
    sync: {},
    chains: [],
    activeAddress: '0x123',
    activeChainId: 1 // Match activeChain.id
} as any);

describe('WalletApp Extra Coverage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('Import 失败时不切换视图', async () => {
        const useEvmWallet = await getUseEvmWalletMock();
        const state = makeBase();
        state.wallet = null;
        state.view = 'onboarding';
        state.handleImport = vi.fn(async () => false); // Fail
        useEvmWallet.mockReturnValue(state);

        render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <WalletApp />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        fireEvent.click(screen.getByText('mock-import'));
        expect(state.setView).not.toHaveBeenCalled();
    });

    it('TRON 链下菜单按钮不可点击', async () => {
        const useEvmWallet = await getUseEvmWalletMock();
        const state = makeBase();
        state.activeChain = { chainType: 'TRON', id: 999 };
        useEvmWallet.mockReturnValue(state);

        render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <WalletApp />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        // Locate header button.
        // The menu button is the third button in the header (Logo ... Menu ... Settings ... Logout)
        // Or find by the Shield/Logo icon.
        // Let's use getByRole('button') and check their contents.
        const buttons = screen.getAllByRole('button');
        // The menu button contains "Active Key" or "Tron Node" (if TRON)
        // If TRON, it renders t('wallet.tron_node').
        // t('wallet.tron_node') likely "Tron Node".

        const menuBtn = buttons.find(b => b.textContent?.match(/Tron Node|Node/i) || b.textContent?.match(/Key/i));

        fireEvent.click(menuBtn!);
        expect(state.setIsMenuOpen).not.toHaveBeenCalled();
    });

    it('Safe 列表为空时显示 Empty Vault 提示', async () => {
        const useEvmWallet = await getUseEvmWalletMock();
        const state = makeBase();
        state.isMenuOpen = true;
        state.trackedSafes = [];
        state.activeChainId = 1; // Match default activeChain.id
        useEvmWallet.mockReturnValue(state);

        render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <WalletApp />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        const emptyMsg = document.querySelector('.border-dashed');
        expect(emptyMsg).toBeInTheDocument();
    });
});
