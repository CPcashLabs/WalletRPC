
import React, { useState, useRef } from 'react';
import { ethers } from 'ethers';
import { SAFE_ABI, PROXY_FACTORY_ABI, ZERO_ADDRESS, SENTINEL_OWNERS, getSafeConfig, ERC20_ABI } from '../config';
import { FeeService } from '../../../services/feeService';
import { SafePendingTx } from '../types';

/**
 * 【多签中枢管理器 - RPC 优化增强版】
 */
export const useSafeManager = ({
  wallet,
  activeSafeAddress,
  activeChainId,
  activeChain,
  provider,
  safeDetails,
  setPendingSafeTxs,
  setTrackedSafes,
  setActiveAccountType,
  setActiveSafeAddress,
  setView,
  setNotification,
  setError,
  syncNonce,
  addTransactionRecord
}: any) => {

  const [isDeployingSafe, setIsDeployingSafe] = useState(false);
  const isProposingRef = useRef(false);

  /**
   * 【RPC 优化策略：提议操作 (Safe Proposal)】
   * 
   * 1. 零 getCode 调用：依赖数据层已验证的状态。
   * 2. 原子化批量查询：通过 Promise.all 同时获取 Nonce/Owners/Threshold，减少 RPC 轮询次数。
   * 3. 离线签名：getTransactionHash 和 signMessage 全部在本地 CPU 完成，无网络开销。
   */
  const handleSafeProposal = async (to: string, value: bigint, data: string, summary?: string): Promise<boolean> => {
      if (!wallet || !activeSafeAddress || !provider) return false;
      
      if (isProposingRef.current) throw new Error("Busy...");
      isProposingRef.current = true;
      
      try {
        const safeContract = new ethers.Contract(activeSafeAddress, SAFE_ABI, provider);
        
        // 【关键优化：Batch Query】
        // 意图：将 3 个独立的 eth_call 合并到单个 Promise.all 中。
        // 如果底层 Provider 支持 Batching，这只会产生一次 HTTP 请求。
        const [currentNonce, owners, threshold] = await Promise.all([
           safeContract.nonce().then(n => Number(n)),
           safeContract.getOwners(),
           safeContract.getThreshold().then(t => Number(t))
        ]);
        
        // 本地所有权验证，不请求网络
        const isOwner = owners.some((o: string) => o.toLowerCase() === wallet.address.toLowerCase());
        if (!isOwner) throw new Error("Not an owner");
        
        // 本地计算交易哈希 (Pure CPU)
        const safeTxHash = await safeContract.getTransactionHash(
            to, value, data, 0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, currentNonce
        );

        // 本地私钥签名 (Pure CPU)
        const flatSig = await wallet.signMessage(ethers.getBytes(safeTxHash));
        const sig = ethers.Signature.from(flatSig);
        
        // Safe 协议 V+4 逻辑修正
        let v = sig.v; if (v < 30) v += 4;
        const adjustedSig = ethers.concat([sig.r, sig.s, new Uint8Array([v])]);

        // 如果是 1/n 多签，直接执行 (Flash Execution)
        if (threshold === 1) {
           const feeData = await FeeService.getOptimizedFeeData(provider, activeChainId);
           const overrides = FeeService.buildOverrides(feeData, activeChain.gasLimits?.safeExec || 500000);
           const safeWrite = safeContract.connect(wallet.connect(provider));

           const tx = await (safeWrite as any).execTransaction(
              to, value, data, 0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, adjustedSig, overrides
           );
           
           addTransactionRecord({ 
             id: Date.now().toString(), chainId: activeChainId, hash: tx.hash, status: 'submitted', timestamp: Date.now(), summary: summary || "Safe Exec"
           });
           setNotification("Transaction broadcasted directly");
           return true;
        } else {
           // 否则进入本地持久化队列，待其他所有者签名，无进一步 RPC 消耗
           setPendingSafeTxs((prev: any) => [...prev, {
              id: Date.now().toString(), to, value: value.toString(), data, nonce: currentNonce, safeTxHash, signatures: { [wallet.address]: adjustedSig }, summary: summary || "Proposal"
           }]);
           setView('safe_queue');
           setNotification("Proposal added to queue");
           return true;
        }
      } catch (e: any) {
        console.error("Proposal error", e);
        setError(e.message || "Proposal failed");
        return false;
      } finally {
        isProposingRef.current = false;
      }
  };

  /**
   * 【提议签名逻辑 (Signature Addition)】
   * 修复报错：定义缺失的 handleAddSignature 函数
   */
  const handleAddSignature = async (tx: SafePendingTx) => {
    if (!wallet) return;
    try {
      // 本地私钥签名，无需 RPC
      const flatSig = await wallet.signMessage(ethers.getBytes(tx.safeTxHash));
      const sig = ethers.Signature.from(flatSig);
      
      // Safe 协议 V+4 逻辑
      let v = sig.v; if (v < 30) v += 4;
      const adjustedSig = ethers.concat([sig.r, sig.s, new Uint8Array([v])]);

      setPendingSafeTxs((prev: SafePendingTx[]) => prev.map(p => 
        p.id === tx.id ? { ...p, signatures: { ...p.signatures, [wallet.address]: adjustedSig } } : p
      ));
      setNotification("Signature added to proposal");
    } catch (e: any) {
      setError(e.message || "Signing failed");
    }
  };

  /**
   * 【队列执行逻辑 (Safe Execution)】
   * 修复报错：定义缺失的 handleExecutePending 函数
   */
  const handleExecutePending = async (tx: SafePendingTx) => {
    if (!wallet || !provider || !activeSafeAddress) return;
    try {
      const safeContract = new ethers.Contract(activeSafeAddress, SAFE_ABI, wallet.connect(provider));
      
      // Gnosis Safe 要求签名必须按所有者地址升序排列
      const sortedOwners = Object.keys(tx.signatures).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      const combinedSigs = ethers.concat(sortedOwners.map(owner => tx.signatures[owner]));

      const feeData = await FeeService.getOptimizedFeeData(provider, activeChainId);
      const overrides = FeeService.buildOverrides(feeData, activeChain.gasLimits?.safeExec || 500000);

      const txResponse = await (safeContract as any).execTransaction(
        tx.to, tx.value, tx.data, 0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, combinedSigs, overrides
      );

      addTransactionRecord({
        id: Date.now().toString(),
        chainId: activeChainId,
        hash: txResponse.hash,
        status: 'submitted',
        timestamp: Date.now(),
        summary: tx.summary || "Safe Exec"
      });

      // 执行成功后从待处理队列移除
      setPendingSafeTxs((prev: SafePendingTx[]) => prev.filter(p => p.id !== tx.id));
      setNotification("Safe transaction broadcasted");
    } catch (e: any) {
      setError(e.message || "Execution failed");
    }
  };

  /**
   * 【RPC 优化策略：部署操作 (Multisig Deployment)】
   * 
   * 1. 预测式交互：使用 staticCall (eth_call) 在发送交易前获取预期的合约地址。
   * 2. 避免轮询：通过 receipt.logs 深度解析确定结果，不依赖多次 eth_getCode 确认部署成功。
   */
  const deploySafe = async (owners: string[], threshold: number) => {
    if (!wallet || !provider) return;
    setIsDeployingSafe(true);
    try {
      const config = getSafeConfig(activeChain);
      const factory = new ethers.Contract(config.proxyFactory, PROXY_FACTORY_ABI, wallet.connect(provider));
      const safeIface = new ethers.Interface(SAFE_ABI);
      
      // 预构建 initializer
      const initializer = safeIface.encodeFunctionData("setup", [
        owners, threshold, ZERO_ADDRESS, "0x", config.fallbackHandler, ZERO_ADDRESS, 0, ZERO_ADDRESS
      ]);

      const saltNonce = Date.now();
      
      // 【关键优化：staticCall 预测地址】
      // 意图：通过静态调用模拟执行，提前拿到 Safe 地址。这不仅能减少部署后的查询，
      // 还能作为一种验证手段确保部署参数正确。
      let predictedAddress: string | null = null;
      try {
        predictedAddress = await (factory as any).createProxyWithNonce.staticCall(config.singleton, initializer, saltNonce);
      } catch (e) {
        console.warn("Prediction failed, using fallback log parsing.");
      }

      const feeData = await FeeService.getOptimizedFeeData(provider, activeChainId);
      const overrides = FeeService.buildOverrides(feeData, activeChain.gasLimits?.safeSetup || 2000000);

      // 发起部署
      const tx = await factory.createProxyWithNonce(config.singleton, initializer, saltNonce, overrides);
      addTransactionRecord({
        id: Date.now().toString(), chainId: activeChainId, hash: tx.hash, status: 'submitted', timestamp: Date.now(), summary: "Deploying Safe Vault"
      });

      const receipt = await tx.wait();
      
      // 解析结果
      let proxyAddress: string | null = predictedAddress;
      if (!proxyAddress) {
        // 从事件日志中高效提取
        for (const log of receipt.logs) {
           // ProxyCreation 事件过滤
           if (log.topics[0] === "0x4f5193cfda12fabc88506c73f9e5c706a139a0592846990d0963ef5e056d6120") {
              proxyAddress = ethers.getAddress(ethers.dataSlice(log.data, 12, 32));
              break;
           }
        }
      }

      if (proxyAddress) {
        setTrackedSafes((prev: any) => [...prev, { address: proxyAddress, name: `Safe_${proxyAddress.slice(2, 6)}`, chainId: activeChainId }]);
        setActiveSafeAddress(proxyAddress);
        setActiveAccountType('SAFE');
        setView('dashboard');
        setNotification("Safe deployed successfully");
      }
    } catch (e: any) {
      setError(e.message || "Deployment failed");
    } finally {
      setIsDeployingSafe(false);
    }
  };

  /**
   * 【管理操作：所有权变更 (Ownership Change)】
   * 意图：将复杂的管理逻辑转化为简单的 Proposal，复用 handleSafeProposal 的优化路径。
   */
  const addOwnerTx = async (owner: string, threshold: number) => {
    const safeContract = new ethers.Contract(activeSafeAddress, SAFE_ABI);
    const data = safeContract.interface.encodeFunctionData("addOwnerWithThreshold", [owner, threshold]);
    return handleSafeProposal(activeSafeAddress, 0n, data, `Add Owner: ${owner.slice(0,6)}`);
  };

  const removeOwnerTx = async (owner: string, threshold: number) => {
    const safeContract = new ethers.Contract(activeSafeAddress, SAFE_ABI, provider);
    const owners = await safeContract.getOwners(); // 这里产生一次 RPC，用于查找 prevOwner
    const prevOwner = owners.indexOf(owner) === 0 ? SENTINEL_OWNERS : owners[owners.indexOf(owner) - 1];
    const data = safeContract.interface.encodeFunctionData("removeOwner", [prevOwner, owner, threshold]);
    return handleSafeProposal(activeSafeAddress, 0n, data, `Remove Owner: ${owner.slice(0,6)}`);
  };

  const changeThresholdTx = async (threshold: number) => {
    const safeContract = new ethers.Contract(activeSafeAddress, SAFE_ABI);
    const data = safeContract.interface.encodeFunctionData("changeThreshold", [threshold]);
    return handleSafeProposal(activeSafeAddress, 0n, data, `Change Threshold: ${threshold}`);
  };

  return { 
    isDeployingSafe, handleSafeProposal, deploySafe, handleAddSignature, handleExecutePending,
    addOwnerTx, removeOwnerTx, changeThresholdTx
  };
};
