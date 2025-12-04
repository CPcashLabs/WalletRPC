import React, { useState } from 'react';
import { List, CheckCircle, Key, Zap, Trash2, ArrowLeft, Users, Shield, Plus, Clock } from 'lucide-react';
import { Button } from '../../../components/Button';
import { SafePendingTx, SafeDetails } from '../types';
import { ethers } from 'ethers';

// --- Safe Queue ---

interface SafeQueueProps {
  pendingTxs: SafePendingTx[];
  safeDetails: SafeDetails | null;
  walletAddress?: string;
  onSign: (tx: SafePendingTx) => void;
  onExecute: (tx: SafePendingTx) => void;
  onBack: () => void;
}

export const SafeQueue: React.FC<SafeQueueProps> = ({
  pendingTxs,
  safeDetails,
  walletAddress,
  onSign,
  onExecute,
  onBack
}) => {
  const nonce = safeDetails?.nonce;
  const filteredTxs = pendingTxs.filter(tx => tx.nonce === nonce);

  return (
    <div className="space-y-6 animate-tech-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
           <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors mr-2">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
             <h2 className="text-lg font-bold text-slate-900">Transaction Queue</h2>
             <p className="text-xs text-slate-500 font-mono">Current Nonce: {nonce}</p>
           </div>
        </div>
      </div>
      
      {filteredTxs.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <List className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">All clear. No pending transactions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTxs.map((tx, idx) => {
            const sigCount = Object.keys(tx.signatures).length;
            const threshold = safeDetails?.threshold || 1;
            const hasSigned = walletAddress && tx.signatures[walletAddress];
            const canExecute = sigCount >= threshold;
            
            return (
              <div 
                key={tx.id} 
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 animate-tech-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start">
                     <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                        <Clock className="w-5 h-5 text-indigo-500" />
                     </div>
                     <div>
                       <h3 className="font-bold text-slate-800 text-sm">{tx.summary}</h3>
                       <p className="text-xs text-slate-400 font-mono mt-0.5">To: {tx.to.slice(0,10)}...{tx.to.slice(-8)}</p>
                     </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${canExecute ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    {sigCount} / {threshold} Signatures
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${canExecute ? 'bg-green-500' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.min(100, (sigCount/threshold)*100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-slate-500 mr-2 font-medium">Signed by:</span>
                    {Object.keys(tx.signatures).map(addr => (
                      <div key={addr} className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center" title={addr}>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {!hasSigned && (
                      <Button onClick={() => onSign(tx)} icon={<Key className="w-3 h-3" />} className="text-xs py-1.5 px-3 h-auto btn-tech-press">
                        Sign
                      </Button>
                    )}
                    <Button 
                      onClick={() => onExecute(tx)} 
                      disabled={!canExecute} 
                      variant={canExecute ? 'primary' : 'outline'} 
                      icon={<Zap className="w-3 h-3" />} 
                      className={`text-xs py-1.5 px-3 h-auto btn-tech-press ${canExecute ? 'shadow-lg shadow-green-100' : 'opacity-50'}`}
                    >
                      Execute
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Safe Settings ---

interface SafeSettingsProps {
  safeDetails: SafeDetails;
  onRemoveOwner: (owner: string, threshold: number) => void;
  onAddOwner: (owner: string, threshold: number) => void;
  onChangeThreshold: (threshold: number) => void;
  onBack: () => void;
}

export const SafeSettings: React.FC<SafeSettingsProps> = ({
  safeDetails,
  onRemoveOwner,
  onAddOwner,
  onChangeThreshold,
  onBack
}) => {
  const [newOwnerInput, setNewOwnerInput] = useState('');
  const [newThresholdSelect, setNewThresholdSelect] = useState(safeDetails.threshold);

  return (
    <div className="space-y-6 animate-tech-in">
      <div className="flex items-center">
         <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors mr-2">
            <ArrowLeft className="w-5 h-5" />
         </button>
         <h2 className="text-lg font-bold text-slate-900">Safe Settings</h2>
      </div>
      
      {/* Owners List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center">
             <Users className="w-4 h-4 text-slate-400 mr-2" />
             <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">Owners</h3>
          </div>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold border border-indigo-200">
            Threshold: {safeDetails.threshold} / {safeDetails.owners.length}
          </span>
        </div>
        
        <div className="divide-y divide-slate-50">
          {safeDetails.owners.map((owner, idx) => (
            <div key={owner} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 mr-3">
                   {idx + 1}
                </div>
                <span className="font-mono text-sm text-slate-600">{owner}</span>
              </div>
              {safeDetails.owners.length > 1 && (
                <button 
                  onClick={() => onRemoveOwner(owner, Math.max(1, safeDetails.threshold - 1))} 
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove Owner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Add Owner Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="flex gap-2">
             <div className="relative flex-1">
                <input 
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-100 outline-none" 
                  placeholder="New Owner Address (0x...)" 
                  value={newOwnerInput}
                  onChange={e => setNewOwnerInput(e.target.value)}
                />
                <Plus className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
             </div>
             <Button 
               onClick={() => { if(newOwnerInput) onAddOwner(newOwnerInput, safeDetails.threshold); }} 
               className="text-xs px-4 h-auto btn-tech-press"
               disabled={!newOwnerInput}
             >
               Add
             </Button>
          </div>
        </div>
      </div>
      
      {/* Threshold Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
           <span className="text-sm font-bold text-slate-800 block">Update Threshold</span>
           <span className="text-xs text-slate-400">Signatures required to execute transactions.</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <select 
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer py-1 pl-2 pr-6" 
            value={newThresholdSelect}
            onChange={e => setNewThresholdSelect(Number(e.target.value))}
          >
            {safeDetails.owners.map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
          </select>
          <Button 
            onClick={() => onChangeThreshold(newThresholdSelect)} 
            className="text-xs py-1.5 h-auto btn-tech-press"
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Create Safe ---

interface CreateSafeProps {
  onDeploy: (owners: string[], threshold: number) => void;
  onCancel: () => void;
  isDeploying: boolean;
}

export const CreateSafe: React.FC<CreateSafeProps> = ({ onDeploy, onCancel, isDeploying }) => {
  const [owners, setOwners] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState(1);

  return (
    <div className="animate-tech-in">
      <div className="flex items-center mb-6">
         <button onClick={onCancel} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors mr-2">
            <ArrowLeft className="w-5 h-5" />
         </button>
         <h2 className="font-bold text-xl text-slate-900">Deploy New Safe</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
               <Users className="w-3 h-3 mr-1" /> Initial Owners
            </label>
            {owners.map((owner, i) => (
              <div key={i} className="flex gap-2 animate-tech-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <input 
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                  value={owner} 
                  onChange={e => { const n = [...owners]; n[i] = e.target.value; setOwners(n); }} 
                  placeholder="0x..."
                />
                {owners.length > 1 && (
                  <button onClick={() => setOwners(owners.filter((_, idx) => idx !== i))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setOwners([...owners, ''])} className="text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center mt-2 px-1">
              <Plus className="w-3 h-3 mr-1" /> Add Another Owner
            </button>
          </div>
          
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center mb-2">
               <Shield className="w-3 h-3 mr-1" /> Signature Threshold
            </label>
            <div className="inline-block relative">
               <select 
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-8 py-2 text-sm font-bold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                  value={threshold} 
                  onChange={e => setThreshold(Number(e.target.value))}
               >
                  {owners.map((_, i) => <option key={i} value={i+1}>{i+1} Signatures</option>)}
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
               </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
               Any transaction requires confirmation from {threshold} out of {owners.length} owners.
            </p>
          </div>
          
          <div className="pt-6 border-t border-slate-100 mt-2">
            <Button onClick={() => onDeploy(owners, threshold)} isLoading={isDeploying} className="w-full py-3 shadow-lg shadow-indigo-100 btn-tech-press">
              Deploy Safe Contract
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Track Safe ---

interface TrackSafeProps {
  onTrack: (address: string) => void;
  onCancel: () => void;
}

export const TrackSafe: React.FC<TrackSafeProps> = ({ onTrack, onCancel }) => {
  const [address, setAddress] = useState('');

  return (
    <div className="max-w-md mx-auto animate-tech-in">
      <div className="flex items-center mb-6">
         <button onClick={onCancel} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors mr-2">
            <ArrowLeft className="w-5 h-5" />
         </button>
         <h2 className="font-bold text-xl text-slate-900">Track Existing Safe</h2>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Safe Contract Address</label>
        <div className="relative mb-6">
           <input 
             className="w-full pl-4 pr-4 py-3 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all" 
             placeholder="0x..." 
             value={address}
             onChange={e => setAddress(e.target.value)}
           />
        </div>
        
        <Button 
           onClick={() => { if(ethers.isAddress(address)) onTrack(address); }} 
           className="w-full py-3 shadow-lg shadow-indigo-100 btn-tech-press"
           disabled={!address}
        >
          Add to Watchlist
        </Button>
      </div>
    </div>
  );
};