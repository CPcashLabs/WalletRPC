
import { useState } from 'react';
import { ethers } from 'ethers';
import { SAFE_ABI, PROXY_FACTORY_ABI, ZERO_ADDRESS, SENTINEL_OWNERS, getSafeConfig } from '../constants';
import { ChainConfig, SafeDetails, SafePendingTx, TrackedSafe, TransactionRecord } from '../types';
import { handleTxError } from '../utils';

interface UseSafeManagerProps {
  wallet: ethers.Wallet | ethers.HDNodeWallet | null;
  activeSafeAddress: string | null;
  activeChainId: number;
  activeChain: ChainConfig;
  provider: ethers.JsonRpcProvider | null;
  safeDetails: SafeDetails | null;
  setPendingSafeTxs: React.Dispatch<React.SetStateAction<SafePendingTx[]>>;
  setTrackedSafes: React.Dispatch<React.SetStateAction<TrackedSafe[]>>;
  setActiveAccountType: (t: 'EOA' | 'SAFE') => void;
  setActiveSafeAddress: (addr: string) => void;
  setView: (v: any) => void;
  setNotification: (msg: string) => void;
  setError: (msg: string | null) => void;
  syncNonce: () => void;
  addTransactionRecord: (record: TransactionRecord) => void;
}

/**
 * Hook: useSafeManager
 * 
 * 作用:
 * 封装 Gnosis Safe 相关的所有核心逻辑。
 * 1. 部署新的 Safe 合约
 * 2. 创建提案 (Proposal)
 * 3. 签名 (Sign)
 * 4. 执行 (Execute)
 * 5. Owner 管理辅助函数
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
}: UseSafeManagerProps) => {

  const [isDeployingSafe, setIsDeployingSafe] = useState(false);

  /**
   * 处理 Safe 提案
   * 创建交易 -> (单签直接执行 | 多签加入队列)
   */
  const handleSafeProposal = async (to: string, value: bigint, data: string, summary?: string) => {
      if (!wallet || !activeSafeAddress || !provider) return;
      const safeContract = new ethers.Contract(activeSafeAddress, SAFE_ABI, provider);
      
      const currentNonce = Number(await safeContract.nonce());
      const owners = await safeContract.getOwners();
      
      // 验证 Owner
      const isOwner = owners.some((o: string) => o.toLowerCase() === wallet.address.toLowerCase());
      if (!isOwner) throw new Error("当前钱包不是该 Safe 的 Owner");
      
      const threshold = Number(await safeContract.getThreshold());
      // 检查 Safe 余额 (如果发送 ETH)
      if (value > 0n) {
          const bal = await provider.getBalance(activeSafeAddress);
          if (bal < value) throw new Error(`Safe ${activeChain.currencySymbol} 余额不足`);
      }

      // 计算哈希
      const safeTxHash = await safeContract.getTransactionHash(to, value, data, 0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, currentNonce);
      
      // 签名
      const flatSig = await wallet.signMessage(ethers.getBytes(safeTxHash));
      const sig = ethers.Signature.from(flatSig);
      let v = sig.v; if (v < 30) v += 4;
      const adjustedSig = ethers.concat([sig.r, sig.s, new Uint8Array([v])]);

      if (threshold === 1) {
         // 单签模式：自动执行
         const connectedWallet = wallet.connect(provider);
         const safeWrite = safeContract.connect(connectedWallet);
         
         let execGasPrice = undefined;
         try { const feeData = await provider.getFeeData(); if (feeData.gasPrice) execGasPrice = (feeData.gasPrice * 150n) / 100n; } catch(e) {}

         try {
             const overrides: any = { gasLimit: 3000000 };
             if (activeChain.id === 1029 && execGasPrice) {
                 overrides.gasPrice = execGasPrice;
                 overrides.type = 0;
             } else if (execGasPrice) {
                 overrides.gasPrice = execGasPrice;
             }

             const tx = await (safeWrite as any).execTransaction(to, value, data, 0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, adjustedSig, overrides);
             
             addTransactionRecord({ 
               id: Date.now().toString(), 
               hash: tx.hash, 
               status: 'submitted', 
               timestamp: Date.now(), 
               summary: summary || "Safe 交易", 
               explorerUrl: activeChain.explorerUrl 
             });
             
             setNotification("Safe 交易已执行!");
         } catch (e: any) {
             throw new Error(handleTxError(e));
         }
      } else {
         // 多签模式：加入队列
         const newPending: SafePendingTx = {
            id: Date.now().toString(), to, value: value.toString(), data, nonce: currentNonce, safeTxHash, signatures: { [wallet.address]: adjustedSig }, summary: summary || "Safe 交易"
         };
         setPendingSafeTxs(prev => [...prev, newPending]);
         setNotification("交易已加入多签队列");
         setView('safe_queue');
      }
  };

  /** 添加签名 */
  const handleAddSignature = async (tx: SafePendingTx) => {
     if (!wallet) return;
     try {
        const flatSig = await wallet.signMessage(ethers.getBytes(tx.safeTxHash));
        const sig = ethers.Signature.from(flatSig);
        let v = sig.v; if (v < 30) v += 4;
        const adjustedSig = ethers.concat([sig.r, sig.s, new Uint8Array([v])]);
        
        const updatedTx = { ...tx, signatures: { ...tx.signatures, [wallet.address]: adjustedSig } };
        setPendingSafeTxs(prev => prev.map(p => p.id === tx.id ? updatedTx : p));
        setNotification("签名成功!");
     } catch (e: any) { setError(e.message); }
  };

  /** 执行待处理交易 */
  const handleExecutePending = async (tx: SafePendingTx) => {
     if (!wallet || !activeSafeAddress || !provider) return;
     try {
        const sortedSigners = Object.keys(tx.signatures).sort((a, b) => { return BigInt(a) < BigInt(b) ? -1 : 1; });
        let packedSigs = "0x";
        for (const owner of sortedSigners) { packedSigs += tx.signatures[owner].slice(2); }
        
        let execGasPrice = undefined;
        try { const feeData = await provider.getFeeData(); if (feeData.gasPrice) execGasPrice = (feeData.gasPrice * 150n) / 100n; } catch(e) {}
        
        const safeContract = new ethers.Contract(activeSafeAddress, SAFE_ABI, wallet.connect(provider));
        const overrides: any = { gasLimit: 3000000 };
        if (activeChainId === 1029 && execGasPrice) { overrides.gasPrice = execGasPrice; overrides.type = 0; }
        
        const execTx = await (safeContract as any).execTransaction(tx.to, BigInt(tx.value), tx.data, 0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, packedSigs, overrides);
        
        addTransactionRecord({ 
          id: Date.now().toString(), 
          hash: execTx.hash, 
          status: 'submitted', 
          timestamp: Date.now(), 
          summary: tx.summary, 
          explorerUrl: activeChain.explorerUrl 
        });

        setPendingSafeTxs(prev => prev.filter(p => p.id !== tx.id));
        setNotification("多签交易已上链执行!");
        if(activeChain.chainType !== 'TRON') syncNonce();
     } catch (e: any) { setError(handleTxError(e)); }
  };

  /** 部署 Safe */
  const deploySafe = async (owners: string[], threshold: number) => {
     if (!wallet || !provider) return;
     if (activeChain.chainType === 'TRON') { setError("Tron 暂不支持 Safe 部署"); return; }
     setIsDeployingSafe(true);
     setError(null);
     try {
       const connectedWallet = wallet.connect(provider);
       const safeConfig = getSafeConfig(activeChainId);
       const factory = new ethers.Contract(safeConfig.proxyFactory, PROXY_FACTORY_ABI, connectedWallet);
       const safeInterface = new ethers.Interface(SAFE_ABI);
       
       const validOwners = owners.filter(o => ethers.isAddress(o));
       if (validOwners.length === 0) throw new Error("至少需要一个有效的 Owner 地址");
       
       const setupData = safeInterface.encodeFunctionData("setup", [validOwners, threshold, ZERO_ADDRESS, "0x", safeConfig.fallbackHandler, ZERO_ADDRESS, 0, ZERO_ADDRESS]);
       const saltNonce = Date.now();
       
       let deployGasPrice = undefined;
       try { const feeData = await provider.getFeeData(); if(feeData.gasPrice) deployGasPrice = (feeData.gasPrice * 150n) / 100n; } catch(e) {}
       
       const tx = await factory.createProxyWithNonce(safeConfig.singleton, setupData, saltNonce, { gasPrice: deployGasPrice });
       const receipt = await tx.wait();
       
       let newAddress = null;
       const factoryInterface = new ethers.Interface(PROXY_FACTORY_ABI);
       if (receipt.logs) { for (const log of receipt.logs) { try { const parsed = factoryInterface.parseLog(log); if (parsed && parsed.name === 'ProxyCreation') { newAddress = parsed.args.proxy; break; } } catch (e) {} } }
       
       if (!newAddress && receipt.logs) { const topic = ethers.id("ProxyCreation(address,address)"); for (const log of receipt.logs) { if (log.topics[0] === topic && log.topics.length > 1) { newAddress = ethers.getAddress(ethers.dataSlice(log.topics[1], 12)); break; } } }
       
       if (newAddress) { 
         setTrackedSafes(prev => [...prev, { address: newAddress, name: `Safe ${newAddress.slice(0,4)}`, chainId: activeChainId }]); 
         setActiveAccountType('SAFE'); 
         setActiveSafeAddress(newAddress); 
         setView('dashboard'); 
         setNotification("Safe 部署成功!"); 
       } else { 
         setError(`Safe 已部署，但地址自动检测失败，请手动添加`); 
       }
     } catch (e: any) { console.error(e); setError(e.reason || e.message || "部署失败"); } finally { setIsDeployingSafe(false); }
  };

  // 辅助函数
  const addOwnerTx = (newOwner: string, newThresh: number) => { if (!wallet || !activeSafeAddress) return; const iface = new ethers.Interface(SAFE_ABI); const data = iface.encodeFunctionData("addOwnerWithThreshold", [newOwner, newThresh]); handleSafeProposal(activeSafeAddress, 0n, data, "添加 Owner"); };
  const removeOwnerTx = (targetOwner: string, newThresh: number) => { if (!wallet || !activeSafeAddress || !safeDetails) return; const index = safeDetails.owners.findIndex(o => o.toLowerCase() === targetOwner.toLowerCase()); let prevOwner = index <= 0 ? SENTINEL_OWNERS : safeDetails.owners[index - 1]; const iface = new ethers.Interface(SAFE_ABI); const data = iface.encodeFunctionData("removeOwner", [prevOwner, targetOwner, newThresh]); handleSafeProposal(activeSafeAddress, 0n, data, "移除 Owner"); };
  const changeThresholdTx = (newThresh: number) => { if (!wallet || !activeSafeAddress) return; const iface = new ethers.Interface(SAFE_ABI); const data = iface.encodeFunctionData("changeThreshold", [newThresh]); handleSafeProposal(activeSafeAddress, 0n, data, "修改门槛"); };

  return {
    isDeployingSafe,
    handleSafeProposal,
    handleAddSignature,
    handleExecutePending,
    deploySafe,
    addOwnerTx,
    removeOwnerTx,
    changeThresholdTx
  };
};
