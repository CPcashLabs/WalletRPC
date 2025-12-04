
import React from 'react';
import { PiggyBank, Plus, CreditCard, Users, ArrowUpRight } from 'lucide-react';
import { TiltCard } from '../components/TiltCard';
import { UserAvatar } from '../components/UserAvatar';
import { THEMES, ThemeColor } from '../constants';

interface HomeViewProps {
  walletAddress: string;
  chainSafes: any[];
  openPouch: (address: string) => void;
  onCreate: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ walletAddress, chainSafes, openPouch, onCreate }) => {
  return (
    <div className="max-w-md mx-auto bg-[#F8F9FA] min-h-[700px] flex flex-col relative pb-24 overflow-hidden shadow-2xl rounded-[32px] border border-white/50">
      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 bg-white/60 backdrop-blur-xl sticky top-0 z-20 border-b border-white/50">
         <div className="flex items-center space-x-2">
           <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg shadow-black/20">
             <PiggyBank className="w-5 h-5 text-white" />
           </div>
           <span className="text-lg font-bold text-slate-900 tracking-tight">CoPouch</span>
         </div>
         <div className="flex items-center bg-white rounded-full pl-3 pr-1 py-1 shadow-sm border border-slate-100">
           <span className="text-xs font-medium text-slate-500 mr-2 truncate max-w-[80px]">{walletAddress.slice(0,6)}...</span>
           <UserAvatar address={walletAddress} idx={0} size="sm" />
         </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {chainSafes.length === 0 ? (
           <div className="flex flex-col items-center justify-center pt-20 animate-in fade-in duration-700">
             <div className="relative w-32 h-32 mb-6">
               <div className="absolute top-0 -left-4 w-24 h-24 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
               <div className="absolute top-0 -right-4 w-24 h-24 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
               <div className="absolute -bottom-8 left-8 w-24 h-24 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <PiggyBank className="w-12 h-12 text-slate-300" />
               </div>
             </div>
             <h3 className="text-lg font-bold text-slate-800">No Pouches Yet</h3>
             <p className="text-slate-400 text-sm text-center max-w-[200px] mt-2">Create a shared pouch to manage funds with friends.</p>
           </div>
        ) : (
           chainSafes.map((safe, idx) => {
             // Deterministic Theme
             const themeKeys = Object.keys(THEMES) as ThemeColor[];
             const theme = THEMES[themeKeys[safe.address.charCodeAt(safe.address.length-1) % 4]];
             
             return (
               <TiltCard key={safe.address} onClick={() => openPouch(safe.address)} className="cursor-pointer group">
                  <div className={`relative h-48 rounded-[24px] bg-gradient-to-br ${theme.gradient} p-6 text-white shadow-xl shadow-indigo-200/50 overflow-hidden`}>
                     {/* Background Organic Shapes */}
                     <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                     <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-40 h-40 rounded-full bg-black opacity-10 blur-3xl"></div>
                     
                     <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                           <div>
                              <h3 className="text-xl font-bold tracking-tight">{safe.name || "Untitled Pouch"}</h3>
                              <div className="flex items-center space-x-1 mt-1 opacity-80">
                                 <CreditCard className="w-3 h-3" />
                                 <span className="text-[10px] font-mono tracking-wider">{safe.address.slice(0,6)} •••• {safe.address.slice(-4)}</span>
                              </div>
                           </div>
                           <div className="flex -space-x-2">
                              <div className="w-8 h-8 rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-md flex items-center justify-center text-[10px] font-bold">
                                 <Users className="w-4 h-4" />
                              </div>
                           </div>
                        </div>
                        
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[10px] opacity-80 font-medium uppercase tracking-widest mb-1">Total Balance</p>
                              <p className="text-3xl font-bold tracking-tight">$ ****</p>
                           </div>
                           <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 transition-all duration-300">
                              <ArrowUpRight className="w-5 h-5" />
                           </div>
                        </div>
                     </div>
                  </div>
               </TiltCard>
             );
           })
        )}
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
         <button 
           onClick={onCreate}
           className="group relative flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-full shadow-2xl shadow-slate-900/40 hover:scale-105 transition-all active:scale-95"
         >
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <Plus className="w-5 h-5 mr-2" />
            <span className="font-bold">New Pouch</span>
         </button>
      </div>
    </div>
  );
};
