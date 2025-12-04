
import { useState } from 'react';
import { ethers } from 'ethers';
import { TronService } from '../../../services/tronService';
import { TokenConfig } from '../types';

/**
 * Hook: useWalletState
 * 
 * 作用:
 * 管理钱包的基础状态和 UI 视图状态。
 * 包括：钱包实例、当前账户模式、视图路由、加载/错误状态、弹窗控制等。
 */
export const useWalletState = (initialChainId: number) => {
  // --- 钱包实例状态 ---
  
  /** 当前 EOA 钱包 (ethers.js 实例) - 仅内存存储 */
  const [wallet, setWallet] = useState<ethers.Wallet | ethers.HDNodeWallet | null>(null);
  
  /** 派生的 Tron 地址 */
  const [tronWalletAddress, setTronWalletAddress] = useState<string | null>(null);

  /** 当前账户模式: 'EOA' (个人) 或 'SAFE' (多签) */
  const [activeAccountType, setActiveAccountType] = useState<'EOA' | 'SAFE'>('EOA');
  
  /** 当前选中的 Safe 地址 */
  const [activeSafeAddress, setActiveSafeAddress] = useState<string | null>(null);
  
  /** 当前选中的链 ID */
  const [activeChainId, setActiveChainId] = useState<number>(initialChainId);

  // --- UI/视图状态 ---

  /** 当前主视图 */
  const [view, setView] = useState<'onboarding' | 'dashboard' | 'send' | 'create_safe' | 'add_safe' | 'safe_queue' | 'settings'>('onboarding');
  
  /** 导入输入框的值 */
  const [privateKeyOrPhrase, setPrivateKeyOrPhrase] = useState('');
  
  /** 账户切换菜单 */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  /** 全局加载指示器 */
  const [isLoading, setIsLoading] = useState(false);
  
  /** 全局错误信息 */
  const [error, setError] = useState<string | null>(null);
  
  /** 全局通知信息 */
  const [notification, setNotification] = useState<string | null>(null);

  // --- 模态框状态 ---
  
  const [tokenToEdit, setTokenToEdit] = useState<TokenConfig | null>(null);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);
  const [isAddingToken, setIsAddingToken] = useState(false);

  /**
   * 处理钱包导入
   * 解析私钥或助记词，并同时生成 EVM 和 Tron 地址。
   */
  const handleImport = async () => {
    setError(null);
    try {
      const input = privateKeyOrPhrase.trim();
      let newWallet: ethers.Wallet | ethers.HDNodeWallet;
      let derivedTronAddr: string | null = null;

      if (input.includes(' ')) {
        newWallet = ethers.Wallet.fromPhrase(input);
      } else {
        const pk = input.startsWith('0x') ? input : '0x' + input;
        newWallet = new ethers.Wallet(pk);
      }
      
      try {
         const pk = newWallet.privateKey.startsWith('0x') ? newWallet.privateKey : '0x' + newWallet.privateKey;
         derivedTronAddr = TronService.addressFromPrivateKey(pk);
      } catch (e) {
         console.warn("无法派生 Tron 地址", e);
      }

      setWallet(newWallet);
      setTronWalletAddress(derivedTronAddr);
      setView('dashboard');
    } catch (e) {
      console.error(e);
      setError("无效的私钥或助记词");
    }
  };

  return {
    wallet, setWallet,
    tronWalletAddress,
    activeAccountType, setActiveAccountType,
    activeSafeAddress, setActiveSafeAddress,
    activeChainId, setActiveChainId,
    view, setView,
    privateKeyOrPhrase, setPrivateKeyOrPhrase,
    isMenuOpen, setIsMenuOpen,
    isLoading, setIsLoading,
    error, setError,
    notification, setNotification,
    tokenToEdit, setTokenToEdit,
    isChainModalOpen, setIsChainModalOpen,
    isAddTokenModalOpen, setIsAddTokenModalOpen,
    isAddingToken, setIsAddingToken,
    handleImport
  };
};
