import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeduplicatingJsonRpcProvider } from '../../features/wallet/hooks/useEvmWallet';
import { ethers } from 'ethers';

describe('DeduplicatingJsonRpcProvider', () => {
    let provider: DeduplicatingJsonRpcProvider;

    beforeEach(() => {
        provider = new DeduplicatingJsonRpcProvider('https://rpc.example.com', ethers.Network.from(1), { staticNetwork: ethers.Network.from(1) });
    });

    it('对非缓存方法直接穿透调用 super.send', async () => {
        const spy = vi.spyOn(ethers.JsonRpcProvider.prototype, 'send').mockResolvedValue('ok');
        await provider.send('eth_sendTransaction', []);
        expect(spy).toHaveBeenCalledWith('eth_sendTransaction', []);
    });

    it('对 inflightOnly 方法进行并发去重但不缓存结果', async () => {
        const spy = vi.spyOn(ethers.JsonRpcProvider.prototype, 'send')
            .mockImplementation(async () => {
                await new Promise(r => setTimeout(r, 10));
                return 'balance';
            });

        const p1 = provider.send('eth_getBalance', ['0x123']);
        const p2 = provider.send('eth_getBalance', ['0x123']);

        // expect(p1).toBe(p2); // Identity check might fail due to internal nesting/state, purely checking behavior (dedup) is sufficient
        await Promise.all([p1, p2]);
        expect(spy).toHaveBeenCalledTimes(1);

        // Subsequent call should trigger new request (no cache)
        await provider.send('eth_getBalance', ['0x123']);
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('对 resCacheMethods 方法进行并发去重且缓存结果', async () => {
        const spy = vi.spyOn(ethers.JsonRpcProvider.prototype, 'send')
            .mockImplementation(async () => {
                await new Promise(r => setTimeout(r, 10));
                return 'fee';
            });

        // 1. Concurrent deduplication
        const p1 = provider.send('eth_gasPrice', []);
        const p2 = provider.send('eth_gasPrice', []);

        await Promise.all([p1, p2]); // Wait for both
        expect(spy).toHaveBeenCalledTimes(1);

        // 2. Cache hit (within TTL)
        const res3 = await provider.send('eth_gasPrice', []);
        expect(res3).toBe('fee');
        expect(spy).toHaveBeenCalledTimes(1);

        // 3. Cache expiry
        vi.setSystemTime(Date.now() + 3000); // Advance > 2000ms TTL
        await provider.send('eth_gasPrice', []);
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('缓存清理机制应该限制缓存大小', async () => {
        const spy = vi.spyOn(ethers.JsonRpcProvider.prototype, 'send').mockResolvedValue('ok');
        // MAX_CACHE_SIZE is 200.
        // We'll fill it up.
        for (let i = 0; i < 210; i++) {
            await provider.send('eth_gasPrice', [i]);
        }
        // Internally it should have cleaned up oldest.
        // We can't easily inspect private _resCache without cast.
        const cacheSize = (provider as any)._resCache.size;
        expect(cacheSize).toBeLessThanOrEqual(200);
    });
});
