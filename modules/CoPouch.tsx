
import React, { useState, useEffect } from 'react';
import { useEvmWallet } from './wallet/hooks/useEvmWallet';
import { WalletOnboarding } from './wallet/components/WalletOnboarding';

// Views
import { HomeView } from './co-pouch/views/HomeView';
import { CreateView } from './co-pouch/views/CreateView';
import { DetailView } from './co-pouch/views/DetailView';
import { SettingsView } from './co-pouch/views/SettingsView';
import { SendView } from './co-pouch/views/SendView';

// Constants
import { ThemeColor } from './co-pouch/constants';

const CoPouch: React.FC = () => {
  const {
    wallet,
    activeChainId,
    setActiveChainId,
    chains,
    trackedSafes,
    setActiveAccountType,
    setActiveSafeAddress,
    activeSafeAddress,
    safeDetails,
    balance,
    deploySafe,
    isDeployingSafe,
    addOwnerTx,
    removeOwnerTx,
    fetchData,
    handleSendSubmit,
    privateKeyOrPhrase,
    setPrivateKeyOrPhrase,
    handleImport,
    error
  } = useEvmWallet();

  const [uiView, setUiView] = useState<'HOME' | 'CREATE' | 'DETAIL' | 'SETTINGS' | 'SEND'>('HOME');
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('ocean');
  const [newPouchName, setNewPouchName] = useState('');
  const [detailTab, setDetailTab] = useState<'BILL' | 'STATS' | 'HISTORY'>('BILL');
  const [sendAmount, setSendAmount] = useState('');
  const [sendTo, setSendTo] = useState('');

  // Auto-switch to BTT
  useEffect(() => {
    if (wallet && activeChainId !== 1029 && activeChainId !== 199) {
      const bttChain = chains.find(c => c.id === 1029) || chains.find(c => c.id === 199);
      if (bttChain) setActiveChainId(bttChain.id);
    }
  }, [wallet, chains, activeChainId, setActiveChainId]);

  const chainSafes = trackedSafes.filter(s => s.chainId === activeChainId);

  const handleCreate = async () => {
    if (!wallet) return;
    await deploySafe([wallet.address], 1);
    setUiView('HOME');
    setNewPouchName('');
  };

  const openPouch = (address: string) => {
    setActiveSafeAddress(address);
    setActiveAccountType('SAFE');
    fetchData();
    setUiView('DETAIL');
  };

  const handleSendAction = () => {
    if (!sendTo || !sendAmount) return;
    handleSendSubmit({
      recipient: sendTo,
      amount: sendAmount,
      asset: 'NATIVE',
      customData: '0x',
      gasPrice: '',
      gasLimit: ''
    });
    setSendAmount('');
    setSendTo('');
    setUiView('DETAIL');
  };

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <WalletOnboarding input={privateKeyOrPhrase} setInput={setPrivateKeyOrPhrase} onImport={handleImport} error={error} />
      </div>
    );
  }

  // --- View Controller ---
  
  if (uiView === 'HOME') {
    return (
      <HomeView 
        walletAddress={wallet.address}
        chainSafes={chainSafes}
        openPouch={openPouch}
        onCreate={() => setUiView('CREATE')}
      />
    );
  }

  if (uiView === 'CREATE') {
    return (
      <CreateView 
        onBack={() => setUiView('HOME')}
        newPouchName={newPouchName}
        setNewPouchName={setNewPouchName}
        selectedTheme={selectedTheme}
        setSelectedTheme={setSelectedTheme}
        handleCreate={handleCreate}
        isDeployingSafe={isDeployingSafe}
      />
    );
  }

  if (uiView === 'DETAIL') {
    return (
      <DetailView 
        onBack={() => setUiView('HOME')}
        onSettings={() => setUiView('SETTINGS')}
        onSend={() => setUiView('SEND')}
        safeDetails={safeDetails}
        activeSafeAddress={activeSafeAddress}
        balance={balance}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
      />
    );
  }

  if (uiView === 'SETTINGS') {
    return (
      <SettingsView 
        onBack={() => setUiView('DETAIL')}
        safeDetails={safeDetails}
        removeOwnerTx={removeOwnerTx}
        addOwnerTx={addOwnerTx}
      />
    );
  }

  if (uiView === 'SEND') {
    return (
      <SendView 
        onBack={() => setUiView('DETAIL')}
        sendAmount={sendAmount}
        setSendAmount={setSendAmount}
        sendTo={sendTo}
        setSendTo={setSendTo}
        handleSendAction={handleSendAction}
      />
    );
  }

  return null;
};

export default CoPouch;
