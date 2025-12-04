
import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { EvmWallet } from './modules/EvmWallet';

export default function App() {
  return (
    <LanguageProvider>
      <EvmWallet />
    </LanguageProvider>
  );
}
