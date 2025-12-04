
import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { WalletApp } from './features/wallet/WalletApp';

export default function App() {
  return (
    <LanguageProvider>
      <WalletApp />
    </LanguageProvider>
  );
}
