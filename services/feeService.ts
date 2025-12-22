
import { ethers } from 'ethers';

/**
 * 【设计亮点：原子化请求去重 (Request Deduplication)】
 * 
 * 背景：在多签钱包中，提议、签名、执行等多个 Hook 可能会在同一时刻请求 Gas 数据。
 * 目标：彻底消除瞬时的重复 RPC 调用。
 */
const feeCache = {
  data: null as ethers.FeeData | null,
  timestamp: 0,
  chainId: 0
};

// 用于存放正在执行的 Promise，实现并发锁定
let pendingFeeRequest: Promise<ethers.FeeData> | null = null;

const CACHE_DURATION = 15000; // 15秒缓存

export const FeeService = {
  /**
   * 【逻辑关联：并发安全的费用获取】
   */
  getOptimizedFeeData: async (provider: ethers.JsonRpcProvider, chainId: number): Promise<ethers.FeeData> => {
    const now = Date.now();
    
    // 1. 检查强效缓存
    if (feeCache.data && (now - feeCache.timestamp < CACHE_DURATION) && feeCache.chainId === chainId) {
      return feeCache.data;
    }

    // 2. 检查是否有已经在执行的相同请求 (去重核心)
    if (pendingFeeRequest) {
      return pendingFeeRequest;
    }

    // 3. 发起新请求并加锁
    pendingFeeRequest = (async () => {
      try {
        const data = await provider.getFeeData();
        feeCache.data = data;
        feeCache.timestamp = Date.now();
        feeCache.chainId = chainId;
        return data;
      } catch (e) {
        console.warn("Fee fetch failed, fallback to defaults", e);
        return new ethers.FeeData(); 
      } finally {
        // 请求完成（无论成功失败），释放锁定
        pendingFeeRequest = null;
      }
    })();

    return pendingFeeRequest;
  },

  /**
   * 【性能优势：智能 Overrides 构建】
   */
  buildOverrides: (feeData: ethers.FeeData, customGasLimit?: ethers.BigNumberish | null) => {
    const overrides: any = {};
    if (customGasLimit != null) overrides.gasLimit = BigInt(customGasLimit);

    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      overrides.maxFeePerGas = (feeData.maxFeePerGas * 150n) / 100n; 
      overrides.maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * 120n) / 100n;
    } else if (feeData.gasPrice) {
      overrides.gasPrice = (feeData.gasPrice * 130n) / 100n; 
    }

    return overrides;
  }
};
