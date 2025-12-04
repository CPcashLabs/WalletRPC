
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    "wallet.title": "Nexus Vault",
    "wallet.intro": "High-performance RPC Wallet",
    "wallet.connect_title": "Initialize Vault",
    "wallet.connect_desc": "Enter your private key or mnemonic to decrypt your session in local memory.",
    "safe.title": "Safe Multisig",
    "safe.connect": "Connect Safe",
    "safe.address": "Safe Address",
  },
  zh: {
    "wallet.title": "Nexus 金库",
    "wallet.intro": "高性能 RPC 钱包",
    "wallet.connect_title": "初始化金库",
    "wallet.connect_desc": "输入您的私钥或助记词以解密本地内存会话。",
    "safe.title": "Safe 多签管理",
    "safe.connect": "连接 Safe",
    "safe.address": "Safe 地址",
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('nexus_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('nexus_lang', lang);
  };

  const t = (key: string) => {
    return TRANSLATIONS[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
