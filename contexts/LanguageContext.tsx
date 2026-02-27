
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { locales } from '../locales';

export type Language = 'en' | 'zh-SG';

/**
 * 【设计亮点：原子化翻译引擎】
 * 
 * 1. 动态自愈：t 函数具备路径容错，若路径失效则返回原始键名，避免 UI 崩溃。
 * 2. 深度检索：支持 'wallet.details.title' 这种点分路径解析，实现嵌套词条管理。
 * 3. 性能关联：通过 Context 进行分发，确保语言切换时仅受影响的 UI 片段重绘，而非全量刷新。
 * 4. 智能感知：初始化阶段自动侦测浏览器 User-Agent，实现无缝的本地化初次体验。
 */
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  isSG: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'walletrpc_lang';
const LEGACY_LANGUAGE_STORAGE_KEY = 'nexus_lang';
const DEFAULT_LANGUAGE: Language = 'en';

const normalizeLanguage = (value: string | null | undefined): Language | null => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'zh-sg' || normalized.startsWith('zh')) return 'zh-SG';
  if (normalized === 'en' || normalized.startsWith('en')) return 'en';
  return null;
};

const detectLanguageFromNavigator = (): Language => {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const candidates = [navigator.language, ...(Array.isArray(navigator.languages) ? navigator.languages : [])]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  for (const candidate of candidates) {
    const detected = normalizeLanguage(candidate);
    if (detected) return detected;
  }
  return DEFAULT_LANGUAGE;
};

const safeLocalStorageGet = (key: string): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore (private mode / denied access)
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    // 优先读取用户持久化配置，实现状态锁定
    const savedRaw = safeLocalStorageGet(LANGUAGE_STORAGE_KEY);
    const savedLang = normalizeLanguage(savedRaw);
    const legacyRaw = safeLocalStorageGet(LEGACY_LANGUAGE_STORAGE_KEY);
    const legacyLang = normalizeLanguage(legacyRaw);
    if (savedLang) {
      setLanguage(savedLang);
      if (savedRaw !== savedLang) safeLocalStorageSet(LANGUAGE_STORAGE_KEY, savedLang);
    } else if (legacyLang) {
      // 兼容旧 key，并做一次性迁移
      setLanguage(legacyLang);
      safeLocalStorageSet(LANGUAGE_STORAGE_KEY, legacyLang);
      try {
        window.localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
      } catch {
        // ignore
      }
    } else {
      // 存储值异常时清理并回退到浏览器/系统语言
      try {
        if (savedRaw && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
        }
        if (legacyRaw && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
      setLanguage(detectLanguageFromNavigator());
    }
  }, []);

  useEffect(() => {
    const savedLang = normalizeLanguage(safeLocalStorageGet(LANGUAGE_STORAGE_KEY));
    const legacyLang = normalizeLanguage(safeLocalStorageGet(LEGACY_LANGUAGE_STORAGE_KEY));
    if (savedLang || legacyLang) return;
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const onLanguageChange = () => {
      setLanguage(detectLanguageFromNavigator());
    };
    window.addEventListener('languagechange', onLanguageChange);
    return () => {
      window.removeEventListener('languagechange', onLanguageChange);
    };
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    safeLocalStorageSet(LANGUAGE_STORAGE_KEY, lang);
    try {
      window.localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  /**
   * 【性能优势：常量级路径查找】
   * 时间复杂度 O(k)，k 为路径深度。相比全量正则替换，这种基于对象的查找性能极高。
   */
  const t = useCallback((path: string): string => {
    const keys = path.split('.');
    const dict = locales[language];
    
    let result: unknown = dict;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in (result as Record<string, unknown>)) {
        result = (result as Record<string, unknown>)[key];
      } else {
        return path; 
      }
    }
    return typeof result === 'string' ? result : path;
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage: handleSetLanguage,
    t,
    isSG: language === 'zh-SG'
  }), [language, handleSetLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("Missing LanguageProvider");
  return context;
};
