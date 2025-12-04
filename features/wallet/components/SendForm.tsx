

import React, { useState, useEffect } from 'react';
import { Settings, ArrowLeft, Zap, Coins } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ChainConfig, TokenConfig, TransactionRecord } from '../types';
import { ProcessResult } from '../hooks/useTransactionManager';
import { TransferStateView, TransferStatus } from './TransferStateView';
import { getExplorerLink } from '../utils';

export interface SendFormData {
  recipient: string;
  amount: string;
  asset: string;
  customData: string;
  gasPrice: string;
  gasLimit: string;
  nonce?: number;
}

interface SendFormProps {
  activeChain: ChainConfig;
  tokens: TokenConfig[];
  balances: Record<string, string>;
  activeAccountType: 'EOA' | 'SAFE';
  recommendedNonce: number;
  onSend: (data: SendFormData) => Promise<ProcessResult>;
  onBack: () => void;
  transactions: TransactionRecord[]; // Needed to watch for updates
}

export const SendForm: React.FC<SendFormProps> = ({
  activeChain,
  tokens,
  balances,
  activeAccountType,
  recommendedNonce,
  onSend,
  onBack,
  transactions
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('NATIVE');
  const [customData, setCustomData] = useState('0x');
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('');
  const [customNonce, setCustomNonce] = useState<string>('');
  const [isAdvancedSend, setIsAdvancedSend] = useState(false);
  
  // Animation State
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  // Watch for transaction updates while in 'timeout' (polling) state
  useEffect(() => {
    if (transferStatus === 'timeout' && txHash) {
        // Find the specific transaction in the global list
        const tx = transactions.find(t => t.hash === txHash);
        // If it flipped to confirmed, update UI to success immediately
        if (tx && tx.status === 'confirmed') {
            setTransferStatus('success');
        }
    }
  }, [transactions, txHash, transferStatus]);

  useEffect(() => {
    // Optional: Pre-fill or logic based on props
  }, [recommendedNonce]);

  const getBalance = () => {
    return balances[selectedAsset] || '0.00';
  };

  const handleSend = async () => {
    setTransferStatus('sending');
    setTxHash(undefined);
    setErrorMsg(undefined);

    const result = await onSend({
      recipient,
      amount,
      asset: selectedAsset,
      customData,
      gasPrice,
      gasLimit,
      nonce: customNonce ? parseInt(customNonce) : undefined
    });

    if (result.success) {
      if (result.isTimeout) {
         setTransferStatus('timeout');
      } else {
         setTransferStatus('success');
      }
      setTxHash(result.hash);
    } else {
      setTransferStatus('error');
      setErrorMsg(result.error);
    }
  };
  
  // If we are in any active transfer state, show the animation view
  if (transferStatus !== 'idle') {
    return (
        <div className="max-w-md mx-auto animate-tech-in bg-white rounded-2xl shadow-lg border border-slate-100 min-h-[400px] flex items-center justify-center">
            <TransferStateView 
                status={transferStatus}
                txHash={txHash}
                error={errorMsg}
                onClose={() => {
                   if (transferStatus === 'success' || transferStatus === 'timeout') {
                      onBack(); // Go back to dashboard on finish
                   } else {
                      setTransferStatus('idle'); // Go back to form on error
                   }
                }}
                explorerUrl={txHash ? getExplorerLink(activeChain, txHash) : undefined}
            />
        </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-tech-in">
      
      <div className="flex items-center mb-6">
         <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors mr-2">
            <ArrowLeft className="w-5 h-5" />
         </button>
         <h2 className="font-bold text-xl text-slate-900">Send Transaction</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-6 relative">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 opacity-20"></div>

        <div className="space-y-4">
          
          {/* Asset Selection */}
          <div className="animate-stagger-1">
            <div className="flex justify-between mb-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Asset</label>
              <span className="text-xs font-medium text-slate-400">
                Balance: <span className="text-indigo-600">{parseFloat(getBalance()).toFixed(4)}</span>
              </span>
            </div>
            <div className="relative">
              <select 
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all appearance-none font-medium text-slate-700"
                value={selectedAsset} 
                onChange={e => setSelectedAsset(e.target.value)}
              >
                <option value="NATIVE">{activeChain.currencySymbol} (Native)</option>
                {tokens.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol} - {t.name}</option>)}
              </select>
              <div className="absolute left-3 top-3.5 text-slate-400 pointer-events-none">
                 <Coins className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          {/* Recipient */}
          <div className="animate-stagger-2">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Recipient</label>
            <input 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-mono text-sm" 
              placeholder={activeChain.chainType === 'TRON' ? "T..." : "0x..."} 
              value={recipient} 
              onChange={e => setRecipient(e.target.value)} 
            />
          </div>
          
          {/* Amount */}
          <div className="animate-stagger-3">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Amount</label>
            <div className="relative">
              <input 
                className="w-full pl-4 pr-16 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-mono text-lg font-bold text-slate-800"
                placeholder="0.0" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
              />
              <div className="absolute right-4 top-3.5">
                <button 
                  onClick={() => setAmount(getBalance())}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Toggle */}
          {selectedAsset === 'NATIVE' && activeChain.chainType !== 'TRON' && (
            <div className="pt-2 animate-stagger-3">
              <button 
                onClick={() => setIsAdvancedSend(!isAdvancedSend)} 
                className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center transition-colors"
              >
                <Settings className={`w-3.5 h-3.5 mr-1.5 transition-transform duration-300 ${isAdvancedSend ? 'rotate-90 text-indigo-600' : ''}`} /> 
                {isAdvancedSend ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </button>
            </div>
          )}

          {/* Advanced Fields */}
          {isAdvancedSend && selectedAsset === 'NATIVE' && activeChain.chainType !== 'TRON' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-tech-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gas Price (Gwei)</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" placeholder="Auto" value={gasPrice} onChange={e => setGasPrice(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gas Limit</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" placeholder="Auto" value={gasLimit} onChange={e => setGasLimit(e.target.value)} />
                </div>
              </div>
              
              <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nonce</label>
                  <input 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" 
                    placeholder={`Auto (${recommendedNonce})`} 
                    value={customNonce} 
                    type="number"
                    onChange={e => setCustomNonce(e.target.value)} 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Override to replace pending transactions.
                  </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Custom Data (Hex)</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-white" 
                  rows={2} 
                  placeholder="0x..." 
                  value={customData} 
                  onChange={e => setCustomData(e.target.value)} 
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex gap-4 animate-stagger-3">
            <Button onClick={handleSend} className="w-full py-3 text-sm shadow-lg shadow-indigo-200 btn-tech-press" icon={activeAccountType === 'SAFE' ? undefined : <Zap className="w-4 h-4" />}>
              {activeAccountType === 'SAFE' && activeChain.chainType !== 'TRON' ? 'Propose Transaction' : 'Confirm Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
