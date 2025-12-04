

import React, { useState } from 'react';
import { RefreshCw, Copy, Send, List, Settings, Plus, ExternalLink, Clock, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { TiltCard } from '../../../components/ui/TiltCard';
import { CountUp } from '../../../components/ui/CountUp';
import { ChainConfig, TokenConfig, TransactionRecord } from '../types';
import { getExplorerLink } from '../utils';

interface WalletDashboardProps {
  balance: string;
  activeChain: ChainConfig;
  chains: ChainConfig[]; // Needed to lookup explorers for history
  address: string;
  isLoading: boolean;
  onRefresh: () => void;
  onSend: () => void;
  activeAccountType: 'EOA' | 'SAFE';
  pendingTxCount: number;
  onViewQueue: () => void;
  onViewSettings: () => void;
  tokens: TokenConfig[];
  tokenBalances: Record<string, string>;
  onAddToken: () => void;
  onEditToken: (token: TokenConfig) => void;
  transactions: TransactionRecord[];
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({
  balance,
  activeChain,
  chains,
  address,
  isLoading,
  onRefresh,
  onSend,
  activeAccountType,
  pendingTxCount,
  onViewQueue,
  onViewSettings,
  tokens,
  tokenBalances,
  onAddToken,
  onEditToken,
  transactions
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const getNetworkBadge = (chainId: number) => {
    const chain = chains.find(c => c.id === chainId);
    if (!chain) return <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Unknown</span>;
    
    if (chain.isTestnet) {
      return <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{chain.name}</span>;
    }
    return <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{chain.name}</span>;
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      
      {/* Main Asset Card: 3D on Desktop, High Contrast on Mobile */}
      <TiltCard className="w-full" intensity={10}>
        <div className="p-6 md:p-8 bg-white relative overflow-hidden group h-full flex flex-col justify-between">
          
          {/* Desktop Only Decorative Elements */}
          <div className="hidden md:block absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">总资产 (Total Asset)</h3>
              <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight flex items-baseline flex-wrap">
                <CountUp 
                  value={balance} 
                  decimals={4} 
                  duration={1200} 
                  className="tabular-nums"
                />
                <span className="text-lg md:text-2xl font-bold text-slate-400 ml-2">{activeChain.currencySymbol}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={onRefresh} 
                className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all duration-300 active:scale-95"
                aria-label="刷新余额"
                title="刷新余额"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
              </button>
              <button 
                onClick={handleCopy} 
                className={`p-3 rounded-xl transition-all duration-300 active:scale-95 ${copied ? 'bg-green-50 text-green-600' : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600'}`}
                aria-label="复制地址"
                title="复制地址"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div className="mb-8 relative z-10">
            {/* Address Display: High readability for mobile */}
            <div 
              className="inline-flex max-w-full items-center px-4 py-2 bg-slate-50 md:bg-white md:border md:border-slate-100 rounded-lg cursor-pointer transition-all active:bg-slate-100 group/addr" 
              onClick={handleCopy}
            >
              <div className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 transition-colors ${copied ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-indigo-500 group-hover/addr:bg-indigo-600'}`}></div>
              <span className={`text-sm font-mono font-medium truncate tracking-wide transition-colors ${copied ? 'text-green-700' : 'text-slate-600'}`}>
                {copied ? '复制成功 (Copied)' : address}
              </span>
            </div>
          </div>
          
          {/* Responsive Grid for Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            <Button 
              onClick={onSend} 
              className="w-full h-12 text-sm md:text-base font-bold shadow-lg shadow-indigo-100 btn-tech-press" 
              icon={<Send className="w-4 h-4 md:w-5 md:h-5" />}
            >
              转账
            </Button>
            {activeAccountType === 'SAFE' && activeChain.chainType !== 'TRON' && (
              <>
                <Button onClick={onViewQueue} variant="secondary" className="w-full h-12 font-bold btn-tech-press" icon={<List className="w-4 h-4" />}>
                  队列 {pendingTxCount > 0 && <span className="ml-2 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingTxCount}</span>}
                </Button>
                <Button onClick={onViewSettings} variant="outline" className="w-full h-12 font-bold btn-tech-press" icon={<Settings className="w-4 h-4" />}>
                  成员管理
                </Button>
              </>
            )}
          </div>
        </div>
      </TiltCard>
      
      {/* Tokens Grid */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">资产列表</h4>
          {activeChain.chainType !== 'TRON' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAddToken(); }} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors btn-tech-press"
            >
              <Plus className="w-3 h-3 mr-1.5" /> 添加代币
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {tokens.map((t, idx) => (
            <div 
              key={t.address} 
              onClick={() => t.isCustom && onEditToken(t)}
              className={`
                flex justify-between items-center p-4 rounded-xl md:rounded-2xl 
                bg-white border border-slate-200 md:border-slate-100 
                hover:border-indigo-300 md:hover:shadow-lg md:hover:-translate-y-1 
                transition-all duration-300 cursor-pointer
                active:bg-slate-50
                animate-tech-in
              `}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-center min-w-0">
                {/* Token Icon */}
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-indigo-600 mr-4 flex-shrink-0">
                  {t.symbol[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-base truncate">{t.name}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">{t.symbol}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="font-mono font-bold text-lg text-slate-900">
                  <CountUp 
                    value={tokenBalances[t.symbol] || '0'} 
                    decimals={4}
                    className="tabular-nums"
                  />
                </div>
                {t.isCustom && <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 mt-1">自定义</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 md:border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">近期活动</h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-10 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
               <Clock className="w-6 h-6 text-slate-300" />
             </div>
             <p className="text-sm text-slate-400 font-medium">暂无交易记录</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map((tx, idx) => {
              // Lookup the specific chain config for this transaction to ensure correct explorer link
              const txChain = chains.find(c => c.id === tx.chainId) || activeChain;
              
              return (
                <div key={tx.id} className="flex justify-between items-center text-sm p-4 hover:bg-slate-50 transition-colors animate-tech-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className={`
                      w-2.5 h-2.5 rounded-full ring-4 ring-opacity-20 flex-shrink-0
                      ${tx.status === 'confirmed' ? 'bg-green-500 ring-green-500' : 
                        tx.status === 'failed' ? 'bg-red-500 ring-red-500' : 
                        'bg-amber-500 ring-amber-500 animate-pulse'}
                    `} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-800 text-sm truncate">{tx.summary}</span>
                        {getNetworkBadge(tx.chainId)}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center mt-1 font-medium">
                        <span className="truncate">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className={`uppercase text-[10px] font-bold flex-shrink-0 ${
                          tx.status === 'confirmed' ? 'text-green-600' : 
                          tx.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {tx.status === 'confirmed' ? '已确认' : tx.status === 'failed' ? '失败' : '处理中'}
                        </span>
                      </div>
                      {tx.error && <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate font-medium">{tx.error}</div>}
                    </div>
                  </div>
                  {tx.hash && (
                    <a 
                      href={getExplorerLink(txChain, tx.hash)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex-shrink-0"
                      title="在浏览器查看"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
