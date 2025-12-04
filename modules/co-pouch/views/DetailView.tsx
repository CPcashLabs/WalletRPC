
import React from 'react';
import { ArrowLeft, Settings, ArrowUpRight, ArrowDownLeft, TrendingUp, History, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';

interface DetailViewProps {
  onBack: () => void;
  onSettings: () => void;
  onSend: () => void;
  safeDetails: any;
  activeSafeAddress: string | null;
  balance: string;
  detailTab: 'BILL' | 'STATS' | 'HISTORY';
  setDetailTab: (tab: 'BILL' | 'STATS' | 'HISTORY') => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  onBack,
  onSettings,
  onSend,
  safeDetails,
  activeSafeAddress,
  balance,
  detailTab,
  setDetailTab
}) => {
  // Mock Data for History
  const historyData = [
    { id: 1, type: 'sent', sender: activeSafeAddress, recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', amount: '1250.00', status: 'Confirmed', date: 'Oct 24, 2023', hash: '0x123...abc' },
    { id: 2, type: 'received', sender: '0x888...777', recipient: activeSafeAddress, amount: '5000.00', status: 'Confirmed', date: 'Oct 22, 2023', hash: '0x456...def' },
    { id: 3, type: 'sent', sender: activeSafeAddress, recipient: '0x999...111', amount: '200.00', status: 'Pending', date: 'Oct 21, 2023', hash: '0x789...ghi' },
    { id: 4, type: 'sent', sender: activeSafeAddress, recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', amount: '45.00', status: 'Failed', date: 'Oct 20, 2023', hash: '0xabc...jkl' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Confirmed': return 'text-green-600 bg-green-50 border-green-100';
      case 'Pending': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Failed': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Confirmed': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'Pending': return <Clock className="w-3 h-3 mr-1" />;
      case 'Failed': return <XCircle className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-[#F8F9FA] min-h-[700px] flex flex-col rounded-[32px] overflow-hidden shadow-2xl border border-white/50">
      {/* Top Navigation */}
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-100/50 backdrop-blur-md bg-white/80">
         <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
         </button>
         <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2">
            <span className="font-bold text-slate-900 text-sm">
              {safeDetails ? (safeDetails as any).name || `Pouch ${activeSafeAddress?.slice(0,4)}` : 'Loading...'}
            </span>
            <div className="flex items-center space-x-1">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-xs text-slate-500">BTT Chain</span>
            </div>
         </div>
         <button onClick={onSettings} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5 text-slate-600" />
         </button>
      </div>

      <div className="p-6 pb-24 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
         {/* Hero Balance */}
         <div className="text-center py-6 animate-in zoom-in-95 duration-500">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total Assets</p>
            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tighter mb-8">
               <span className="text-3xl align-top mr-1">$</span>{parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
               <button 
                 onClick={onSend}
                 className="flex items-center justify-center space-x-2 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:scale-105 transition-transform active:scale-95"
               >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Send</span>
               </button>
               <button className="flex items-center justify-center space-x-2 bg-white text-slate-900 border border-slate-200 py-4 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors active:scale-95">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Request</span>
               </button>
            </div>
         </div>

         {/* Switcher */}
         <div className="bg-slate-200/50 p-1 rounded-2xl flex relative">
            <div 
              className="absolute top-1 bottom-1 w-[calc(33.33%-2px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out"
              style={{ 
                left: detailTab === 'BILL' ? '4px' : detailTab === 'STATS' ? 'calc(33.33% + 2px)' : 'calc(66.66%)'
              }}
            ></div>
            <button 
              onClick={() => setDetailTab('BILL')}
              className={`flex-1 py-2.5 text-xs font-bold z-10 text-center transition-colors ${detailTab === 'BILL' ? 'text-slate-900' : 'text-slate-500'}`}
            >
              Bill
            </button>
            <button 
              onClick={() => setDetailTab('STATS')}
              className={`flex-1 py-2.5 text-xs font-bold z-10 text-center transition-colors ${detailTab === 'STATS' ? 'text-slate-900' : 'text-slate-500'}`}
            >
              Stats
            </button>
            <button 
              onClick={() => setDetailTab('HISTORY')}
              className={`flex-1 py-2.5 text-xs font-bold z-10 text-center transition-colors ${detailTab === 'HISTORY' ? 'text-slate-900' : 'text-slate-500'}`}
            >
              History
            </button>
         </div>

         {/* Content List */}
         <div className="space-y-4 min-h-[300px]">
            {detailTab === 'BILL' && (
              <>
                 <div className="flex justify-between items-end px-2 animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Today</span>
                 </div>
                 
                 {[
                   { user: 'You', type: 'out', amt: '12.50', desc: 'Coffee Run', time: '10:42 AM', icon: '☕' },
                   { user: 'Alice', type: 'in', amt: '50.00', desc: 'Groceries Split', time: 'Yesterday', icon: '🛒' },
                   { user: 'Bob', type: 'in', amt: '200.00', desc: 'Rent Deposit', time: 'Sep 24', icon: '🏠' },
                 ].map((tx, i) => (
                    <div key={i} className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i*100}ms` }}>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                                {tx.icon}
                              </div>
                             <div>
                                <p className="font-bold text-slate-900 text-sm">{tx.desc}</p>
                                <p className="text-xs text-slate-500 font-medium">{tx.user} • {tx.time}</p>
                             </div>
                          </div>
                          <div className={`text-sm font-bold ${tx.type === 'in' ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg' : 'text-slate-900'}`}>
                             {tx.type === 'in' ? '+' : '-'}${tx.amt}
                          </div>
                       </div>
                    </div>
                 ))}
              </>
            )}
            
            {detailTab === 'STATS' && (
              <div className="animate-in fade-in zoom-in-95">
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-4">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center text-sm">
                      <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" /> Spending Trend
                    </h3>
                    <div className="h-40 flex items-end justify-between gap-2 px-2">
                       {[35, 55, 40, 70, 45, 90, 60].map((h, i) => (
                          <div key={i} className="w-full bg-slate-50 rounded-t-lg relative group overflow-hidden">
                             <div 
                               className="absolute bottom-0 w-full bg-indigo-500 rounded-t-lg transition-all duration-1000 ease-out group-hover:bg-indigo-600" 
                               style={{ height: `${h}%` }}
                             ></div>
                          </div>
                       ))}
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase">
                       <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                    </div>
                 </div>
                 
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 text-sm">Top Contributors</h3>
                    {safeDetails?.owners.map((owner: string, i: number) => (
                        <div key={owner} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                           <div className="flex items-center gap-3">
                              <UserAvatar address={owner} idx={i} />
                              <span className="text-xs font-bold text-slate-700">{owner.slice(0,6)}...</span>
                           </div>
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                           </div>
                        </div>
                    ))}
                 </div>
              </div>
            )}

            {detailTab === 'HISTORY' && (
              <div className="animate-in fade-in slide-in-from-right-4">
                 <div className="flex justify-between items-end px-2 mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase">Transaction History</span>
                 </div>
                 
                 <div className="space-y-3">
                    {historyData.map((tx, i) => (
                       <div key={tx.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                          <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusColor(tx.status)}`}>
                                   {getStatusIcon(tx.status)} {tx.status}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">{tx.date}</span>
                             </div>
                             <span className={`text-sm font-bold ${tx.type === 'received' ? 'text-green-600' : 'text-slate-900'}`}>
                                {tx.type === 'received' ? '+' : '-'}${tx.amount}
                             </span>
                          </div>
                          
                          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                             <div className="flex items-center gap-2 min-w-0">
                                <UserAvatar address={tx.sender || ''} idx={parseInt(tx.sender?.[2] || '0', 16)} size="sm" />
                                <span className="text-xs font-mono text-slate-600 truncate max-w-[60px]">{tx.sender?.slice(0,4)}...{tx.sender?.slice(-2)}</span>
                             </div>
                             <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                             <div className="flex items-center gap-2 min-w-0">
                                <UserAvatar address={tx.recipient} idx={parseInt(tx.recipient[2] || '0', 16)} size="sm" />
                                <span className="text-xs font-mono text-slate-600 truncate max-w-[60px]">{tx.recipient.slice(0,4)}...{tx.recipient.slice(-2)}</span>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
                 
                 <div className="text-center mt-6">
                    <button className="text-xs font-bold text-indigo-500 hover:text-indigo-600 py-2 px-4 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors">
                       View All on Explorer
                    </button>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};
