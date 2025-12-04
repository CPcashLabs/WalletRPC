
import React from 'react';
import { ArrowLeft, Plus, X, ChevronRight } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';

interface SettingsViewProps {
  onBack: () => void;
  safeDetails: any;
  removeOwnerTx: (owner: string, threshold: number) => void;
  addOwnerTx: (owner: string, threshold: number) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  safeDetails,
  removeOwnerTx,
  addOwnerTx
}) => {
  return (
    <div className="max-w-md mx-auto bg-white min-h-[700px] flex flex-col rounded-[32px] overflow-hidden shadow-2xl">
       <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg">Pouch Settings</h2>
          <div className="w-8"></div>
       </div>

       <div className="p-6 space-y-8">
          <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 text-sm">Members ({safeDetails?.owners.length})</h3>
                <span className="text-[10px] bg-white px-2 py-1 rounded-full text-indigo-600 font-bold border border-indigo-100 shadow-sm">
                   {safeDetails?.threshold} / {safeDetails?.owners.length} Sig
                </span>
             </div>
             
             <div className="flex flex-wrap gap-4">
                {safeDetails?.owners.map((owner: string, i: number) => (
                   <div key={owner} className="flex flex-col items-center space-y-2 group relative">
                      <div className="relative transition-transform group-hover:scale-110">
                         <UserAvatar address={owner} idx={i} size="lg" />
                         {safeDetails.owners.length > 1 && (
                            <button 
                              onClick={() => removeOwnerTx(owner, Math.max(1, safeDetails.threshold - 1))}
                              className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                               <X className="w-3 h-3" />
                            </button>
                         )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 rounded-md border border-slate-100">{owner.slice(0,4)}</span>
                   </div>
                ))}
                
                <button 
                  onClick={() => {
                     const newOwner = prompt("Enter new owner address (0x...):");
                     if (newOwner) addOwnerTx(newOwner, safeDetails?.threshold || 1);
                  }}
                  className="flex flex-col items-center space-y-2 group"
                >
                   <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-500 bg-white transition-all">
                      <Plus className="w-5 h-5" />
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500">Invite</span>
                </button>
             </div>
          </div>

          <div className="space-y-3">
             <h3 className="font-bold text-slate-900 text-sm ml-1">General</h3>
             {['Edit Pouch Name', 'Change Background', 'Notification Settings', 'Share Pouch'].map((item, i) => (
               <button key={i} className="w-full flex justify-between items-center p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group">
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
               </button>
             ))}
          </div>
       </div>
    </div>
  );
};
