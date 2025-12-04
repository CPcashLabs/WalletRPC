
import { useState, useRef } from 'react';
import { ethers } from 'ethers';
import { TronService } from '../TronService';
import { handleTxError, normalizeHex } from '../utils';
import { TransactionRecord, ChainConfig, TokenConfig } from '../types';
import { SendFormData } from '../components/SendForm';
import { ERC20_ABI } from '../constants';

interface UseTransactionManagerProps {
  wallet: ethers.Wallet | ethers.HDNodeWallet | null;
  activeAddress: string | null | undefined;
  activeChain: ChainConfig;
  activeChainTokens: TokenConfig[];
  activeAccountType: 'EOA' | 'SAFE';
  provider: ethers.JsonRpcProvider | null;
  tokenBalances: Record<string, string>;
  balance: string;
  fetchData: () => void;
  setNotification: (msg: string) => void;
  setError: (msg: string | null) => void;
  // Callback to delegate Safe proposal creation
  handleSafeProposal: (to: string, value: bigint, data: string, summary: string) => Promise<void>;
}

/**
 * Hook: useTransactionManager
 * 
 * 作用:
 * 管理交易生命周期。
 * 1. 交易队列 (Queue)
 * 2. Nonce 管理 (乐观更新)
 * 3. 交易广播 (EVM/TRON)
 * 4. 发送表单提交逻辑 (路由到 EOA 直接发送或 Safe 提案)
 */
export const useTransactionManager = ({
  wallet,
  activeAddress,
  activeChain,
  activeChainTokens,
  activeAccountType,
  provider,
  tokenBalances,
  balance,
  fetchData,
  setNotification,
  setError,
  handleSafeProposal
}: UseTransactionManagerProps) => {

  /** 本地交易记录 (Session 级别) */
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  /** 
   * 本地 Nonce 追踪器
   * 用于在交易未上链前，乐观地增加本地 Nonce，允许连续发送多笔交易。
   */
  const localNonceRef = useRef<number | null>(null);
  const noncePromiseRef = useRef<Promise<number> | null>(null);

  /**
   * 同步 Nonce
   * 从链上获取最新计数，仅在无本地乐观 Nonce 时更新。
   */
  const syncNonce = async () => {
    if (!wallet || !activeAddress || !provider) return;
    try {
       if (localNonceRef.current === null) {
          const nonce = await provider.getTransactionCount(activeAddress);
          if (localNonceRef.current === null || localNonceRef.current < nonce) {
             localNonceRef.current = nonce;
          }
       }
    } catch (e) {
       console.warn("Nonce sync failed", e);
    }
  };

  /**
   * 交易入队
   */
  const queueTransaction = async (
     txRequest: any,
     summary: string, 
     id: string,
     isTron: boolean = false
  ) => {
     setTransactions(prev => [{ 
        id, 
        status: 'queued', 
        timestamp: Date.now(), 
        summary, 
        explorerUrl: activeChain.explorerUrl 
     }, ...prev]);

     if (isTron) {
        processTronTransaction(txRequest, id);
     } else {
        processTransaction(txRequest, id);
     }
  };

  /** 处理 Tron 交易 */
  const processTronTransaction = async (txRequest: any, id: string) => {
     try {
        if (!wallet) throw new Error("钱包未解锁");
        const host = activeChain.defaultRpcUrl;
        
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'submitted' } : t));

        let hash;
        const pk = wallet.privateKey.startsWith('0x') ? wallet.privateKey : '0x' + wallet.privateKey;

        if (txRequest.type === 'NATIVE') {
            hash = await TronService.sendTrx(host, pk, txRequest.to, Number(txRequest.amount));
        } else if (txRequest.type === 'TOKEN') {
            hash = await TronService.sendTrc20(host, pk, txRequest.to, txRequest.amount, txRequest.contractAddress);
        }

        if (hash) {
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, hash: hash, status: 'confirmed' } : t));
            setNotification(`Tron 交易已发送: ${hash.slice(0,6)}...`);
            fetchData();
        } else {
            throw new Error("Tron 交易失败或被拒绝");
        }

     } catch (e: any) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'failed', error: e.message || "失败" } : t));
     }
  };

  /** 处理 EVM 交易 */
  const processTransaction = async (txRequest: ethers.TransactionRequest, id: string) => {
     if (!wallet || !provider) return;
     try {
        const connectedWallet = wallet.connect(provider);
        let nonceToUse: number;

        // Nonce 逻辑
        if (txRequest.nonce !== undefined && txRequest.nonce !== null) {
            nonceToUse = Number(txRequest.nonce);
            localNonceRef.current = null;
        } else {
            if (localNonceRef.current !== null) {
                nonceToUse = localNonceRef.current;
                localNonceRef.current++;
            } else {
                if (!noncePromiseRef.current) {
                    noncePromiseRef.current = provider.getTransactionCount(wallet.address);
                }
                const fetchedNonce = await noncePromiseRef.current;
                if (localNonceRef.current !== null) {
                    nonceToUse = localNonceRef.current;
                } else {
                    nonceToUse = fetchedNonce;
                }
                localNonceRef.current = nonceToUse + 1;
                noncePromiseRef.current = null;
            }
            txRequest.nonce = nonceToUse;
        }
        
        // 特殊链适配 (BTT Donau)
        if (activeChain.id === 1029) {
            txRequest.gasLimit = BigInt(2000000); 
            delete txRequest.maxFeePerGas;
            delete txRequest.maxPriorityFeePerGas;
            txRequest.type = 0;
            if (!txRequest.gasPrice) {
               const feeData = await provider.getFeeData();
               txRequest.gasPrice = feeData.gasPrice ? (feeData.gasPrice * 150n) / 100n : undefined;
            }
        } else {
            if (!txRequest.gasLimit && txRequest.data && (txRequest.data as string).length > 10) {
               txRequest.gasLimit = BigInt(200000); 
            }
        }

        setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'submitted' } : t));
        const txResponse = await connectedWallet.sendTransaction(txRequest);
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, hash: txResponse.hash } : t));
        
        await txResponse.wait();
        
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'confirmed' } : t));
        setNotification(`交易已确认: ${txResponse.hash.slice(0,6)}...`);
        fetchData();

     } catch (e: any) {
        console.error(`Tx ${id} failed:`, e);
        const errMsg = handleTxError(e);
        
        if (errMsg.includes('already known')) {
           setTransactions(prev => prev.map(t => t.id === id ? { 
              ...t, status: 'submitted', error: '交易已在内存池中' 
           } : t));
           return; 
        }

        if (errMsg.includes('nonce') || errMsg.includes('replacement')) {
           localNonceRef.current = null;
        }
        
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'failed', error: errMsg } : t));
     }
  };

  /**
   * 提交发送表单
   * 校验数据 -> 路由到直接发送或 Safe 提案
   */
  const handleSendSubmit = async (formData: SendFormData) => {
    if (!wallet || !activeAddress) return;
    setError(null);

    const { recipient, amount, asset, customData, gasPrice, gasLimit, nonce } = formData;

    // 1. 地址校验
    if (activeChain.chainType === 'TRON') {
        try {
           const hex = TronService.toHexAddress(recipient);
           if (!hex || hex.length !== 44) throw new Error("地址无效");
        } catch(e) {
           setError("无效的 Tron 接收地址");
           return;
        }
    } else {
        if (!ethers.isAddress(recipient)) {
            setError("无效的接收地址");
            return;
        }
    }

    const safeAmount = amount || '0';
    if (isNaN(Number(safeAmount)) || Number(safeAmount) < 0) {
        setError("金额无效");
        return;
    }

    // 2. Tron 路径
    if (activeChain.chainType === 'TRON') {
        try {
            const summary = `转账 ${safeAmount} ${asset}`;
            let txPayload: any = {};

            if (asset === 'NATIVE') {
                const amountSun = Math.floor(parseFloat(safeAmount) * 1_000_000);
                const currentSunStr = await TronService.getBalance(activeChain.defaultRpcUrl, activeAddress);
                if (Number(currentSunStr) < amountSun) {
                    setError("TRX 余额不足");
                    return;
                }
                txPayload = { type: 'NATIVE', to: recipient, amount: amountSun };
            } else {
                const token = activeChainTokens.find(t => t.symbol === asset);
                if (!token) throw new Error("未找到代币");
                
                const currentBalStr = await TronService.getTrc20Balance(activeChain.defaultRpcUrl, activeAddress, token.address);
                const decimals = token.decimals || 6;
                const amountInt = ethers.parseUnits(safeAmount, decimals).toString();
                
                if (BigInt(currentBalStr) < BigInt(amountInt)) {
                    setError(`${asset} 余额不足`);
                    return;
                }
                txPayload = { type: 'TOKEN', to: recipient, amount: amountInt, contractAddress: token.address };
            }

            const txId = Date.now().toString();
            queueTransaction(txPayload, summary, txId, true);
            setNotification("Tron 交易已入队");
        } catch (e: any) {
            setError(handleTxError(e));
        }
        return;
    }

    // 3. EVM 余额校验
    if (asset === 'NATIVE') {
        const currentBal = ethers.parseEther(balance);
        const sendAmount = ethers.parseEther(safeAmount);
        if (currentBal < sendAmount) {
            setError(`${activeChain.currencySymbol} 余额不足`);
            return;
        }
    } else {
        const token = activeChainTokens.find(t => t.symbol === asset);
        if (token) {
            const currentBalStr = tokenBalances[asset] || '0';
            const currentBal = ethers.parseUnits(currentBalStr, token.decimals);
            const sendAmount = ethers.parseUnits(safeAmount, token.decimals);
            if (currentBal < sendAmount) {
                setError(`${asset} 余额不足`);
                return;
            }
        }
    }

    // 4. 构建交易
    try {
      let txRequest: ethers.TransactionRequest = {};
      let summary = '';
      let toAddr = recipient;
      let value = ethers.parseEther(safeAmount);
      let data = customData ? normalizeHex(customData) : '0x';
      let txGasLimit = gasLimit ? BigInt(gasLimit) : undefined;
      let txGasPrice = gasPrice ? ethers.parseUnits(gasPrice, 'gwei') : undefined;

      if (asset !== 'NATIVE') {
         const token = activeChainTokens.find(t => t.symbol === asset);
         if (!token) throw new Error("Token not found");
         toAddr = token.address;
         value = 0n;
         const erc20 = new ethers.Interface(ERC20_ABI);
         data = erc20.encodeFunctionData("transfer", [recipient, ethers.parseUnits(safeAmount, token.decimals)]);
      }

      summary = `转账 ${safeAmount} ${asset}`;

      if (activeAccountType === 'EOA') {
        txRequest = { 
            to: toAddr, 
            value, 
            data, 
            gasLimit: txGasLimit, 
            gasPrice: txGasPrice,
            nonce: nonce 
        };
        const txId = Date.now().toString();
        queueTransaction(txRequest, summary, txId, false);
        setNotification("交易已入队!");
      } else {
        await handleSafeProposal(toAddr, value, data, summary);
      }
    } catch (e: any) {
      setError(handleTxError(e));
    }
  };

  // 暴露给外部以添加记录 (例如 Safe 执行成功时)
  const addTransactionRecord = (record: TransactionRecord) => {
    setTransactions(prev => [record, ...prev]);
  };

  return {
    transactions,
    localNonceRef,
    syncNonce,
    queueTransaction,
    handleSendSubmit,
    addTransactionRecord
  };
};
