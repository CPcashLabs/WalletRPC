
import React from 'react';
import { RefreshCw, Copy, Send, List, Settings, Plus, ExternalLink, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ChainConfig, TokenConfig, TransactionRecord } from '../types';
import { getExplorerLink } from '../utils';

interface WalletDashboardProps {
  balance: string;
  activeChain: ChainConfig;
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
}) => (
  <div className="space-y-6">
    
    {/* Main Asset Card */}
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden group">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-50 group-hover:bg-indigo-100 transition-colors duration-500"></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Balance</h3>
          <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline flex-wrap">
            {parseFloat(balance).toFixed(4)} 
            <span className="text-sm md:text-lg font-medium text-slate-500 ml-1 md:ml-2">{activeChain.currencySymbol}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={onRefresh} 
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-full transition-all duration-300 btn-tech-press"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          <button 
            onClick={() => navigator.clipboard.writeText(address || '')} 
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-full transition-all duration-300 btn-tech-press"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="mb-8 relative z-10">
        <div className="inline-flex max-w-full items-center px-3 py-1 bg-slate-50 rounded-full border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer group/addr" onClick={() => navigator.clipboard.writeText(address)}>
          <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse flex-shrink-0"></div>
          <span className="text-xs font-mono text-slate-500 group-hover/addr:text-indigo-600 transition-colors truncate">
            {address}
          </span>
        </div>
      </div>
      
      {/* Responsive Grid for Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        <Button onClick={onSend} className="w-full shadow-md shadow-indigo-100 btn-tech-press" icon={<Send className="w-4 h-4" />}>Send</Button>
        {activeAccountType === 'SAFE' && activeChain.chainType !== 'TRON' && (
          <>
            <Button onClick={onViewQueue} variant="secondary" className="w-full btn-tech-press" icon={<List className="w-4 h-4" />}>
              Queue {pendingTxCount > 0 && <span className="ml-1 bg-indigo-200 text-indigo-800 px-1.5 rounded-full text-[10px] font-bold">{pendingTxCount}</span>}
            </Button>
            <Button onClick={onViewSettings} variant="outline" className="w-full btn-tech-press" icon={<Settings className="w-4 h-4" />}>
              Owners
            </Button>
          </>
        )}
      </div>
    </div>
    
    {/* Tokens Grid */}
    <div>
      <div className="flex justify-between items-center mb-3 px-1">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assets</h4>
        {activeChain.chainType !== 'TRON' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAddToken(); }} 
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center px-2 py-1 rounded hover:bg-indigo-50 transition-colors btn-tech-press"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Token
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tokens.map((t, idx) => (
          <div 
            key={t.address} 
            onClick={() => t.isCustom && onEditToken(t)}
            className={`
              flex justify-between items-center p-3 md:p-4 rounded-xl border border-slate-100 bg-white 
              hover:shadow-md hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer
              animate-tech-in
            `}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className="flex items-center min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 mr-3 shadow-sm flex-shrink-0">
                {t.symbol[0]}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-sm truncate">{t.name}</div>
                <div className="text-xs text-slate-400 font-mono truncate">{t.symbol}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="font-mono font-medium text-slate-900">{parseFloat(tokenBalances[t.symbol] || '0').toFixed(4)}</div>
              {t.isCustom && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-400">CUSTOM</span>}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Transactions */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Activity</h3>
      </div>
      
      {transactions.length === 0 ? (
        <div className="p-8 text-center">
           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
             <Clock className="w-5 h-5 text-slate-300" />
           </div>
           <p className="text-sm text-slate-400 font-medium">No recent transactions</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {transactions.map((tx, idx) => (
            <div key={tx.id} className="flex justify-between items-center text-sm p-3 md:p-4 hover:bg-slate-50 transition-colors animate-tech-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-center space-x-3 md:space-x-4 overflow-hidden">
                <div className={`
                  w-2 h-2 rounded-full ring-4 ring-opacity-20 flex-shrink-0
                  ${tx.status === 'confirmed' ? 'bg-green-500 ring-green-500' : 
                    tx.status === 'failed' ? 'bg-red-500 ring-red-500' : 
                    'bg-amber-500 ring-amber-500 animate-pulse'}
                `} />
                <div className="min-w-0">
                  <div className="font-bold text-slate-700 truncate">{tx.summary}</div>
                  <div className="text-xs text-slate-400 flex items-center mt-0.5">
                    <span className="truncate">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span className={`uppercase text-[10px] font-bold flex-shrink-0 ${
                      tx.status === 'confirmed' ? 'text-green-600' : 
                      tx.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  {tx.error && <div className="text-xs text-red-500 mt-1 max-w-[150px] md:max-w-[200px] truncate">{tx.error}</div>}
                </div>
              </div>
              {tx.hash && (
                <a 
                  href={getExplorerLink(activeChain, tx.hash)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
