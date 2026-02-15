
import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { HttpConsoleProvider } from './contexts/HttpConsoleContext';
import { WalletApp } from './features/wallet/WalletApp';

export default function App() {
  return (
    <LanguageProvider>
      <HttpConsoleProvider>
        <WalletApp />
      </HttpConsoleProvider>
    </LanguageProvider>
  );
}
