
import React from 'react';
import { ChevronDown, LogOut, Settings, Wallet, Trash2, Bell, XCircle, CheckCircle, Shield } from 'lucide-react';
import { useEvmWallet } from './hooks/useEvmWallet';

// --- UI Components ---
import { WalletOnboarding } from './components/WalletOnboarding';
import { WalletDashboard } from './components/WalletDashboard';
import { SendForm } from './components/SendForm';
import { SafeQueue, SafeSettings, CreateSafe, TrackSafe } from './components/SafeViews';
import { ChainModal, AddTokenModal, EditTokenModal } from './components/Modals';
import { ParticleIntro } from '../../components/ui/ParticleIntro';

const TechAlert: React.FC<{ type: 'error' | 'success'; message: string; onClose?: () => void }> = ({ type, message, onClose }) => (
  <div className={`
    fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]
    flex items-center px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md animate-tech-in min-w-[300px]
    ${type === 'error' ? 'bg-red-900/90 border-red-700 text-white' : 'bg-emerald-900/90 border-emerald-700 text-white'}
  `}>
    <div className="flex-shrink-0 mr-3">
      {type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
    </div>
    <div className="flex-1 text-sm font-medium">{message}</div>
    {onClose && (
      <button onClick={onClose} className="ml-3 p-1 rounded-md hover:bg-white/20">
        <XCircle className="w-4 h-4" />
      </button>
    )}
  </div>
);

const NotificationToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed top-6 right-6 z-[100] animate-tech-in max-w-[90vw]">
    <div className="bg-slate-900/90 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center border border-slate-700 backdrop-blur-md">
      <Bell className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" />
      <span className="text-sm font-medium mr-6 truncate">{message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export const WalletApp: React.FC = () => {
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
    isInitialFetchDone, // From hook
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
    setError
  } = useEvmWallet();

  const [localNotification, setLocalNotification] = React.useState<string | null>(null);
  React.useEffect(() => { if (notification) { setLocalNotification(notification); const t = setTimeout(() => setLocalNotification(null), 5000); return () => clearTimeout(t); } }, [notification]);

  // --- Animation States ---
  const [isOnboardingExiting, setIsOnboardingExiting] = React.useState(false);
  const [isIntroFadingOut, setIsIntroFadingOut] = React.useState(false);
  const [minTimePassed, setMinTimePassed] = React.useState(false);

  // 1. Handle Import Trigger with Transition
  const onImportWrapper = async () => {
     const success = await handleImport();
     if (success) {
        setIsOnboardingExiting(true);
        // Wait for exit animation (1s) before switching view
        setTimeout(() => {
           setView('intro_animation');
           setIsOnboardingExiting(false);
        }, 1000);
     }
  };

  // 2. Reset state when entering onboarding
  React.useEffect(() => {
    if (view === 'onboarding') {
      setIsIntroFadingOut(false);
      setMinTimePassed(false);
      setIsOnboardingExiting(false);
    }
  }, [view]);

  // 3. Start minimum timer when entering animation
  React.useEffect(() => {
    if (view === 'intro_animation') {
      const t = setTimeout(() => setMinTimePassed(true), 2500); // Minimum 2.5s duration
      return () => clearTimeout(t);
    }
  }, [view]);

  // 4. Trigger fade out when BOTH min time passed AND data is ready
  React.useEffect(() => {
    if (view === 'intro_animation' && minTimePassed && isInitialFetchDone) {
      setIsIntroFadingOut(true);
      
      // Wait for CSS fade transition (1s) before switching view
      const t = setTimeout(() => {
        setView('dashboard');
        // Reset states (optional, but good practice)
        setIsIntroFadingOut(false);
        setMinTimePassed(false);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [view, minTimePassed, isInitialFetchDone, setView]);

  if (view === 'onboarding' || !wallet) {
    return (
      <WalletOnboarding 
        input={privateKeyOrPhrase} 
        setInput={setPrivateKeyOrPhrase} 
        onImport={onImportWrapper} 
        error={error} 
        isExiting={isOnboardingExiting}
      />
    );
  }

  // Show Intro Animation (Full Screen Overlay)
  if (view === 'intro_animation') {
    return <ParticleIntro fadeOut={isIntroFadingOut} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col animate-in fade-in duration-700">
      
      {/* App Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 h-16 flex items-center justify-between shadow-sm">
         
         {/* Left: Account Context */}
         <div className="flex items-center">
             <div className="relative">
                <button 
                  onClick={() => activeChain.chainType !== 'TRON' && setIsMenuOpen(!isMenuOpen)}
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200
                    ${activeChain.chainType === 'TRON' ? 'cursor-default' : 'hover:bg-slate-100 cursor-pointer'}
                  `}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${activeAccountType === 'EOA' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {activeAccountType === 'EOA' ? <Wallet className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <div className="text-left hidden md:block">
                     <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{activeAccountType === 'EOA' ? 'Personal' : 'Safe Multisig'}</div>
                     <div className="text-sm font-bold text-slate-900 truncate max-w-[150px]">
                        {activeAccountType === 'EOA' ? (activeChain.chainType === 'TRON' ? 'Tron Wallet' : 'My Wallet') : `Safe ${activeSafeAddress?.slice(0,4)}`}
                     </div>
                  </div>
                  {activeChain.chainType !== 'TRON' && <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />}
                </button>

                {isMenuOpen && activeChain.chainType !== 'TRON' && (
                   <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-tech-in z-50">
                      <div className="p-2 border-b border-slate-50">
                         <button onClick={() => { setActiveAccountType('EOA'); setIsMenuOpen(false); setView('dashboard'); }} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex items-center transition-colors group">
                            <div className="p-2 bg-indigo-50 rounded-lg mr-3 text-indigo-600 group-hover:bg-indigo-100"><Wallet className="w-4 h-4" /></div>
                            <div>
                               <div className="text-sm font-bold text-slate-900">Personal Wallet</div>
                               <div className="text-xs text-slate-500">EOA • Private Key</div>
                            </div>
                         </button>
                      </div>
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                         <p className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Your Safes</p>
                         {trackedSafes.filter(s => s.chainId === activeChainId).map(s => (
                            <div key={s.address} className="flex justify-between items-center group mb-1">
                               <button 
                                  onClick={() => { setActiveAccountType('SAFE'); setActiveSafeAddress(s.address); setIsMenuOpen(false); setView('dashboard'); }}
                                  className="flex-1 text-left p-2.5 text-sm flex items-center rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                               >
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                                  <span className="font-mono font-medium truncate">{s.name}</span>
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); setTrackedSafes(prev => prev.filter(x => x.address !== s.address)); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                         ))}
                         {trackedSafes.filter(s => s.chainId === activeChainId).length === 0 && (
                           <div className="px-3 py-4 text-xs text-slate-400 text-center italic border border-dashed border-slate-100 rounded-xl mb-2">No safes tracked on this chain</div>
                         )}
                         <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50">
                            <button onClick={() => { setView('create_safe'); setIsMenuOpen(false); }} className="py-2 text-xs bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">New Safe</button>
                            <button onClick={() => { setView('add_safe'); setIsMenuOpen(false); }} className="py-2 text-xs bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors">Import</button>
                         </div>
                      </div>
                   </div>
                )}
             </div>
         </div>

         {/* Right: Actions */}
         <div className="flex items-center gap-2">
            <button onClick={() => setIsChainModalOpen(true)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors" title="Settings & Network">
               <Settings className="w-5 h-5"/>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
               onClick={() => { 
                  setWallet(null); 
                  setPrivateKeyOrPhrase('');
                  setView('onboarding'); 
               }} 
               className="flex items-center space-x-2 px-3 py-2 hover:bg-red-50 rounded-xl text-slate-500 hover:text-red-600 transition-colors"
               title="Lock Wallet"
            >
               <LogOut className="w-4 h-4"/>
               <span className="text-xs font-bold hidden md:inline">Lock</span>
            </button>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
         <div className="max-w-5xl mx-auto">
            {localNotification && <NotificationToast message={localNotification} onClose={() => setLocalNotification(null)} />}
            {error && <TechAlert type="error" message={error} onClose={() => setError(null)} />}

            {/* View Switcher */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {view === 'dashboard' && (
                  <WalletDashboard 
                    balance={balance} 
                    activeChain={activeChain} 
                    chains={chains} // Pass full chain list for explorer lookups
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
                    transactions={transactions} // Pass tx list to watch for updates
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
         </div>
      </main>

      {/* Modals */}
      <ChainModal 
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        initialConfig={activeChain}
        onSave={handleSaveChain}
        chains={chains}
        onSwitchNetwork={setActiveChainId}
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
  );
};
