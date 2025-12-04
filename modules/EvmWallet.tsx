

import React from 'react';
import { ShieldCheck, ChevronDown, LogOut, Settings, Wallet, Trash2, Bell, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useEvmWallet } from './wallet/hooks/useEvmWallet';

// --- UI Components ---
import { WalletOnboarding } from './wallet/components/WalletOnboarding';
import { WalletDashboard } from './wallet/components/WalletDashboard';
import { SendForm } from './wallet/components/SendForm';
import { SafeQueue, SafeSettings, CreateSafe, TrackSafe } from './wallet/components/SafeViews';
import { ChainModal, AddTokenModal, EditTokenModal } from './wallet/components/Modals';

// --- Enhanced Tech UI Components ---

const TechAlert: React.FC<{ type: 'error' | 'success'; message: string; onClose?: () => void }> = ({ type, message, onClose }) => (
  <div className={`
    relative mb-4 p-4 rounded-lg border flex items-start shadow-md animate-tech-in
    ${type === 'error' ? 'bg-red-50/80 border-red-200 text-red-800 animate-shake' : 'bg-green-50/80 border-green-200 text-green-800'}
  `}>
    <div className="flex-shrink-0 mr-3 mt-0.5">
      {type === 'error' ? <XCircle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
    </div>
    <div className="flex-1 text-sm font-medium break-words">{message}</div>
    {onClose && (
      <button onClick={onClose} className={`ml-3 p-1 rounded-md hover:bg-black/5 ${type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
        <XCircle className="w-4 h-4" />
      </button>
    )}
  </div>
);

const NotificationToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed top-6 right-6 z-[100] animate-tech-in max-w-[90vw]">
    <div className="bg-slate-800 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center border border-slate-700 tech-border-glow">
      <Bell className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" />
      <span className="text-sm font-medium mr-6 truncate">{message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const EvmWallet: React.FC = () => {
  const {
    wallet,
    setWallet,
    activeChain,
    activeAddress,
    activeChainTokens,
    activeAccountType,
    setActiveAccountType,
    activeSafeAddress,
    setActiveSafeAddress,
    activeChainId,
    setActiveChainId,
    chains,
    view,
    setView,
    isMenuOpen,
    setIsMenuOpen,
    isLoading,
    error,
    notification,
    isChainModalOpen,
    setIsChainModalOpen,
    isAddTokenModalOpen,
    setIsAddTokenModalOpen,
    isAddingToken,
    tokenToEdit,
    setTokenToEdit,
    balance,
    tokenBalances,
    transactions,
    safeDetails,
    pendingSafeTxs,
    currentNonce,
    isDeployingSafe,
    trackedSafes,
    setTrackedSafes,
    privateKeyOrPhrase,
    setPrivateKeyOrPhrase,
    handleImport,
    fetchData,
    handleSendSubmit,
    handleAddSignature,
    handleExecutePending,
    confirmAddToken,
    handleUpdateToken,
    handleRemoveToken,
    handleSaveChain,
    deploySafe,
    addOwnerTx,
    removeOwnerTx,
    changeThresholdTx,
    setError // Assuming hook exposes setter to clear error
  } = useEvmWallet();

  // Temporary function to clear notifications since it's not exposed by hook directly in previous turn
  // In a real refactor we would expose setNotification from hook, but here we can simulate "onClose"
  const [localNotification, setLocalNotification] = React.useState<string | null>(null);
  React.useEffect(() => { if (notification) { setLocalNotification(notification); const t = setTimeout(() => setLocalNotification(null), 5000); return () => clearTimeout(t); } }, [notification]);

  if (view === 'onboarding') {
    return (
      <WalletOnboarding 
        input={privateKeyOrPhrase} 
        setInput={setPrivateKeyOrPhrase} 
        onImport={handleImport} 
        error={error} 
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 min-h-[500px] flex flex-col relative animate-tech-in transition-all duration-300">
      
      {/* Tech-Style Header - Responsive */}
      <div className="bg-slate-900 text-white p-3 md:p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between z-20 shadow-md">
         
         {/* Left: Account Selector */}
         <div className="flex items-center justify-between md:justify-start w-full md:w-auto relative z-30">
             <div className="relative w-full md:w-auto">
                <button 
                  onClick={() => activeChain.chainType !== 'TRON' && setIsMenuOpen(!isMenuOpen)}
                  className={`
                    w-full md:w-auto flex items-center justify-between md:justify-start space-x-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 transition-all duration-200
                    ${activeChain.chainType === 'TRON' ? 'cursor-default opacity-90' : 'hover:bg-slate-700 hover:border-slate-600 btn-tech-press'}
                  `}
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] flex-shrink-0 ${activeAccountType === 'EOA' ? 'bg-indigo-500 shadow-indigo-500/50' : 'bg-green-500 shadow-green-500/50'}`} />
                    <span className="font-mono text-sm truncate">
                       {activeAccountType === 'EOA' ? (activeChain.chainType === 'TRON' ? 'Tron Wallet' : 'Personal Account') : `Safe: ${activeSafeAddress?.slice(0,6)}...`}
                    </span>
                  </div>
                  {activeChain.chainType !== 'TRON' && <ChevronDown className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />}
                </button>

                {isMenuOpen && activeChain.chainType !== 'TRON' && (
                   <div className="absolute top-full left-0 mt-2 w-full md:w-72 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-tech-in">
                      <div className="p-2 border-b border-slate-100">
                         <button onClick={() => { setActiveAccountType('EOA'); setIsMenuOpen(false); setView('dashboard'); }} className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center transition-colors">
                            <div className="p-1.5 bg-indigo-100 rounded-md mr-3 text-indigo-600"><Wallet className="w-4 h-4" /></div>
                            <span className="text-sm font-medium">Personal Wallet</span>
                         </button>
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
                         <p className="text-[10px] font-bold text-slate-400 px-2 mb-2 uppercase tracking-wider">Tracked Safes</p>
                         {trackedSafes.filter(s => s.chainId === activeChainId).map(s => (
                            <div key={s.address} className="flex justify-between items-center group mb-1">
                               <button 
                                  onClick={() => { setActiveAccountType('SAFE'); setActiveSafeAddress(s.address); setIsMenuOpen(false); setView('dashboard'); }}
                                  className="flex-1 text-left p-2 text-sm flex items-center rounded-lg hover:bg-slate-50 transition-colors"
                               >
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3"></div>
                                  <span className="font-mono text-slate-700 truncate">{s.name}</span>
                               </button>
                               <button onClick={() => setTrackedSafes(prev => prev.filter(x => x.address !== s.address))} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                         ))}
                         {trackedSafes.filter(s => s.chainId === activeChainId).length === 0 && (
                           <div className="px-2 py-3 text-xs text-slate-400 text-center italic">No safes tracked on this network</div>
                         )}
                         <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100">
                            <button onClick={() => { setView('create_safe'); setIsMenuOpen(false); }} className="py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-md font-medium hover:bg-indigo-100 transition-colors">+ Create New</button>
                            <button onClick={() => { setView('add_safe'); setIsMenuOpen(false); }} className="py-1.5 text-xs bg-slate-100 text-slate-700 rounded-md font-medium hover:bg-slate-200 transition-colors">Track Existing</button>
                         </div>
                      </div>
                   </div>
                )}
             </div>
         </div>

         {/* Right: Chain, Settings, Logout */}
         <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="bg-slate-800 rounded-lg p-0.5 flex items-center border border-slate-700 flex-grow md:flex-grow-0 min-w-0">
               <select 
                  value={activeChainId} 
                  onChange={(e) => setActiveChainId(Number(e.target.value))}
                  className="bg-transparent border-none text-xs text-slate-200 rounded px-2 py-1.5 focus:ring-0 cursor-pointer hover:text-white transition-colors w-full"
               >
                  {chains.map(c => <option key={c.id} value={c.id} className="bg-slate-800 text-white">{c.name}</option>)}
               </select>
            </div>
            
            <button onClick={() => setIsChainModalOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex-shrink-0"><Settings className="w-4 h-4"/></button>
            <div className="w-px h-4 bg-slate-700 mx-1 flex-shrink-0"></div>
            <button 
               onClick={() => { 
                  setWallet(null); 
                  setPrivateKeyOrPhrase('');
                  setView('onboarding'); 
               }} 
               className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
               title="Log Out"
            >
               <LogOut className="w-4 h-4"/>
            </button>
         </div>
      </div>

      <div className="flex-1 bg-slate-50/50 p-4 md:p-6 overflow-y-auto relative">
         
         {/* Notifications */}
         {localNotification && (
            <NotificationToast message={localNotification} onClose={() => setLocalNotification(null)} />
         )}

         {/* Contextual Error Display */}
         {error && (
           <TechAlert type="error" message={error} onClose={() => setError(null)} />
         )}

         {/* Animated View Container */}
         <div key={view} className="animate-tech-in">
             {view === 'dashboard' && (
                <WalletDashboard 
                  balance={balance} 
                  activeChain={activeChain} 
                  address={activeAddress || ''} 
                  isLoading={isLoading} 
                  onRefresh={fetchData} 
                  onSend={() => setView('send')} 
                  activeAccountType={activeAccountType} 
                  pendingTxCount={pendingSafeTxs.filter(t => t.nonce === safeDetails?.nonce).length}
                  onViewQueue={() => setView('safe_queue')} 
                  onViewSettings={() => setView('settings')} 
                  tokens={activeChainTokens} 
                  tokenBalances={tokenBalances} 
                  onAddToken={() => setIsAddTokenModalOpen(true)} 
                  onEditToken={setTokenToEdit}
                  transactions={transactions}
                />
             )}

             {view === 'send' && (
                <SendForm 
                  activeChain={activeChain}
                  tokens={activeChainTokens}
                  balances={tokenBalances}
                  activeAccountType={activeAccountType}
                  recommendedNonce={currentNonce}
                  onSend={handleSendSubmit}
                  onBack={() => setView('dashboard')}
                />
             )}

             {view === 'safe_queue' && (
                <SafeQueue 
                  pendingTxs={pendingSafeTxs}
                  safeDetails={safeDetails}
                  walletAddress={wallet?.address}
                  onSign={handleAddSignature}
                  onExecute={handleExecutePending}
                  onBack={() => setView('dashboard')}
                />
             )}

             {view === 'settings' && safeDetails && (
                <SafeSettings 
                  safeDetails={safeDetails}
                  onRemoveOwner={removeOwnerTx}
                  onAddOwner={addOwnerTx}
                  onChangeThreshold={changeThresholdTx}
                  onBack={() => setView('dashboard')}
                />
             )}

             {view === 'create_safe' && (
               <CreateSafe 
                 onDeploy={deploySafe}
                 onCancel={() => setView('dashboard')}
                 isDeploying={isDeployingSafe}
               />
             )}

             {view === 'add_safe' && (
               <TrackSafe 
                 onTrack={(addr) => {
                   setTrackedSafes(prev => [...prev, { address: addr, name: `Safe ${addr.slice(0,4)}`, chainId: activeChainId }]);
                   setActiveAccountType('SAFE');
                   setActiveSafeAddress(addr);
                   setView('dashboard');
                 }}
                 onCancel={() => setView('dashboard')}
               />
             )}
         </div>

         {/* Modals */}
         <ChainModal 
           isOpen={isChainModalOpen}
           onClose={() => setIsChainModalOpen(false)}
           initialConfig={activeChain}
           onSave={handleSaveChain}
         />

         <AddTokenModal 
           isOpen={isAddTokenModalOpen}
           onClose={() => setIsAddTokenModalOpen(false)}
           onImport={confirmAddToken}
           isImporting={isAddingToken}
         />

         <EditTokenModal 
           token={tokenToEdit}
           onClose={() => setTokenToEdit(null)}
           onSave={handleUpdateToken}
           onDelete={handleRemoveToken}
         />
      </div>
    </div>
  );
};

export default EvmWallet;
