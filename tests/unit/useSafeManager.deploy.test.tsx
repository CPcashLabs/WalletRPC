import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useSafeManager } from '../../features/wallet/hooks/useSafeManager';
import { ethers } from 'ethers';

// Mock Ethers module
vi.mock('ethers', () => {
    class MockContract {
        static _implementation = () => ({});
        constructor(address, abi, provider) {
            // Check if _implementation is a function before calling it
            const implOrFactory = (MockContract as any)._implementation;
            let instance = {};
            if (typeof implOrFactory === 'function') {
                instance = implOrFactory(address, abi, provider);
            } else {
                instance = implOrFactory || {};
            }
            // Ensure connect exists
            if (!(instance as any).connect) {
                (instance as any).connect = vi.fn(() => instance);
            }
            return instance;
        }
    }

    const Interface = vi.fn(function () {
        return {
            encodeFunctionData: vi.fn(),
        };
    });

    return {
        ethers: {
            Contract: MockContract,
            Interface,
            Wallet: vi.fn(),
            HDNodeWallet: vi.fn(),
            JsonRpcProvider: vi.fn(),
            getBytes: vi.fn((str) => str),
            Signature: {
                from: vi.fn(() => ({ v: 27, r: '0xr', s: '0xs' }))
            },
            concat: vi.fn(() => '0xSignature'),
        }
    };
});

// Mock dependencies
vi.mock('../../services/feeService', () => ({
    FeeService: {
        getOptimizedFeeData: vi.fn(),
        buildOverrides: vi.fn(() => ({}))
    }
}));

vi.mock('../../contexts/LanguageContext', () => ({
    useTranslation: () => ({ t: (k: string) => k })
}));

vi.mock('../../features/wallet/config', () => ({
    SAFE_ABI: [],
    PROXY_FACTORY_ABI: [],
    ZERO_ADDRESS: '0x0',
    SENTINEL_OWNERS: '0x1',
    getSafeConfig: () => ({
        proxyFactory: '0xFactory',
        singleton: '0xSingleton',
        fallbackHandler: '0xFallback'
    })
}));

describe('useSafeManager Deployment Coverage', () => {
    let mockProvider: any;
    let mockWallet: any;
    let setTrackedSafes: any;
    let setError: any;
    let setNotification: any;
    let setActiveSafeAddress: any;
    let setView: any;
    let mockCreateProxyWithNonce: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockProvider = {
            getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
            getCode: vi.fn().mockResolvedValue('0x'),
        };
        mockWallet = {
            address: '0xUser',
            connect: vi.fn(() => mockWallet),
            signMessage: vi.fn(),
        };
        setTrackedSafes = vi.fn();
        setError = vi.fn();
        setNotification = vi.fn();
        setActiveSafeAddress = vi.fn();
        setView = vi.fn();

        // Setup Contract mock behavior for each test
        mockCreateProxyWithNonce = vi.fn();
        // Default staticCall success
        mockCreateProxyWithNonce.staticCall = vi.fn().mockResolvedValue('0xPredictedSafe');

        // Inject implementation into the mocked class static property
        (ethers.Contract as any)._implementation = () => ({
            createProxyWithNonce: mockCreateProxyWithNonce
        });
    });

    const renderHookOpts = () => renderHook(() => useSafeManager({
        wallet: mockWallet,
        activeSafeAddress: null,
        activeChainId: 1,
        activeChain: { id: 1, name: 'Test', chainType: 'EVM', gasLimits: { safeSetup: 1000 } } as any,
        provider: mockProvider,
        setTrackedSafes,
        setActiveAccountType: vi.fn(),
        setActiveSafeAddress,
        setView,
        setNotification,
        setError,
        addTransactionRecord: vi.fn()
    }));

    it('should handle deployment when safe already tracked', async () => {
        const mockWait = vi.fn().mockResolvedValue({ status: 1 });
        const mockTx = { hash: '0xTxHash', wait: mockWait };
        mockCreateProxyWithNonce.mockResolvedValue(mockTx);

        // Tracked safes already has 0xPredictedSafe
        setTrackedSafes.mockImplementation((cb: any) => {
            const prev = [{ address: '0xPredictedSafe', chainId: 1 }];
            if (typeof cb === 'function') {
                const next = cb(prev);
                expect(next).toEqual(prev);
            }
        });

        const { result } = renderHookOpts();

        await act(async () => {
            await result.current.deploySafe(['0xOwner'], 1);
        });

        await waitFor(() => {
            expect(setTrackedSafes).toHaveBeenCalled();
            expect(setActiveSafeAddress).toHaveBeenCalledWith('0xPredictedSafe');
            expect(setNotification).toHaveBeenCalledWith('safe.notice_safe_deployed_success');
        });
    });

    it('should handle tx.wait() rejection gracefully', async () => {
        const mockWait = vi.fn().mockRejectedValue(new Error('Mining Reverted'));
        const mockTx = { hash: '0xTxHash', wait: mockWait };
        mockCreateProxyWithNonce.mockResolvedValue(mockTx);

        const { result } = renderHookOpts();

        await act(async () => {
            await result.current.deploySafe(['0xOwner'], 1);
        });

        await waitFor(() => {
            expect(setError).toHaveBeenCalledWith('Mining Reverted');
        });
    });

    it('should handle staticCall failure (deployment error)', async () => {
        // staticCall fails
        mockCreateProxyWithNonce.staticCall.mockRejectedValue(new Error('Prediction Failed'));

        const { result } = renderHookOpts();

        await act(async () => {
            await result.current.deploySafe(['0xOwner'], 1);
        });

        await waitFor(() => {
            expect(setError).toHaveBeenCalledWith('Prediction Failed');
        });
    });

    describe('handleSafeProposal', () => {
        let mockContract: any;
        beforeEach(() => {
            mockContract = {
                nonce: vi.fn(),
                getOwners: vi.fn(),
                getThreshold: vi.fn(),
                getTransactionHash: vi.fn(),
                execTransaction: vi.fn(),
            };
            (ethers.Contract as any)._implementation = () => mockContract;
            // Set active safe address for tests
        });

        const renderProposalHookFull = () => renderHook(() => useSafeManager({
            wallet: mockWallet,
            activeSafeAddress: '0xSafeAddress',
            activeChainId: 1,
            activeChain: { id: 1, name: 'Test', chainType: 'EVM', gasLimits: { safeSetup: 1000 } } as any,
            provider: mockProvider,
            setTrackedSafes,
            setActiveAccountType: vi.fn(),
            setActiveSafeAddress,
            setView,
            setNotification,
            setError,
            addTransactionRecord: vi.fn()
        }));

        it('should execute transaction when threshold is 1 (Flash Execution)', async () => {
            mockContract.nonce.mockResolvedValue(5n);
            mockContract.getOwners.mockResolvedValue(['0xUser', '0xOther']); // Current user is 0xUser
            mockContract.getThreshold.mockResolvedValue(1n);
            mockContract.getTransactionHash.mockResolvedValue('0xHashBytes');

            mockWallet.signMessage.mockResolvedValue('0xSig');
            mockContract.execTransaction.mockResolvedValue({ hash: '0xExecHash' });

            const { result } = renderProposalHookFull();

            let res: boolean = false;
            await act(async () => {
                res = await result.current.handleSafeProposal('0xTarget', 0n, '0xData');
            });

            expect(mockContract.getThreshold).toHaveBeenCalled();
            expect(mockContract.execTransaction).toHaveBeenCalled();
            expect(res).toBe(true);
        });

        it('should throw error when threshold > 1 (Queue unavailable)', async () => {
            mockContract.nonce.mockResolvedValue(5n);
            mockContract.getOwners.mockResolvedValue(['0xUser', '0xOther']);
            mockContract.getThreshold.mockResolvedValue(2n); // > 1
            mockContract.getTransactionHash.mockResolvedValue('0xHashBytes');
            mockWallet.signMessage.mockResolvedValue('0xSig');

            const { result } = renderProposalHookFull();

            await expect(async () => {
                await result.current.handleSafeProposal('0xTarget', 0n, '0xData');
            }).rejects.toThrow('safe.err_multisig_queue_unavailable');
        });

        it('should throw "not owner" error if wallet address is not in owners', async () => {
            mockContract.nonce.mockResolvedValue(5n);
            mockContract.getOwners.mockResolvedValue(['0xOther']); // User not in owners
            mockContract.getThreshold.mockResolvedValue(1n);

            const { result } = renderProposalHookFull();

            await expect(async () => {
                await result.current.handleSafeProposal('0xTarget', 0n, '0xData');
            }).rejects.toThrow('safe.err_not_owner');
        });
    });
});
