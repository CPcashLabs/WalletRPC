import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Key, Plus, Users, ArrowRight, Check, AlertCircle, RefreshCw, Zap, Settings, Trash2, Coins, History, Wallet, List, ExternalLink, UserPlus, UserMinus, LogOut } from 'lucide-react';
import { ethers } from 'ethers';
import { Button } from '../components/Button';
import { useTranslation } from '../contexts/LanguageContext';

// --- Constants & Static Config ---
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SENTINEL_OWNERS = "0x0000000000000000000000000000000000000001";

// Basic ABI for Safe L2 / 1.3.0 interactions
const SAFE_ABI = [
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 nonce) view returns (bytes32)",
  "function addOwnerWithThreshold(address owner, uint256 _threshold)",
  "function removeOwner(address prevOwner, address owner, uint256 _threshold)"
];

const ERC20_ABI = [
  "function transfer(address to, uint amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
}

interface ChainParams {
  name: string;
  rpc: string;
  symbol: string;
  explorer: string;
  execGasLimit: number;
  tokens: TokenConfig[];
}

const CHAIN_CONFIGS: Record<number, ChainParams> = {
  1: {
    name: "Ethereum Mainnet",
    rpc: "https://eth.llamarpc.com",
    symbol: "ETH",
    explorer: "https://etherscan.io",
    execGasLimit: 250000,
    tokens: [
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    ]
  },
  56: {
    name: "BSC Mainnet",
    rpc: "https://binance.llamarpc.com",
    symbol: "BNB",
    explorer: "https://bscscan.com",
    execGasLimit: 500000,
    tokens: [
      { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
    ]
  },
  199: {
    name: "BitTorrent Chain",
    rpc: "https://rpc.bittorrentchain.io",
    symbol: "BTT",
    explorer: "https://bttcscan.com",
    execGasLimit: 800000,
    tokens: []
  },
  1029: {
    name: "BTT Donau Testnet",
    rpc: "https://pre-rpc.bt.io",
    symbol: "BTT",
    explorer: "https://testscan.bt.io",
    execGasLimit: 1000000,
    tokens: [
      { symbol: 'USDT_b', address: '0x834982c9B0690ED7CA35e10b18887C26c25CdC82', decimals: 6 }
    ]
  }
};

// --- Types ---

interface SafeDetails {
  address: string;
  owners: string[];
  threshold: number;
  nonce: number;
  balance: string;
}

interface TxRecord {
  hash: string;
  timestamp: number;
  to: string;
  value: string;
  asset: string;
  status: 'success' | 'failed';
}

const SafeMultiSig: React.FC = () => {
  const { t } = useTranslation();
  
  // State
  const [safeAddress, setSafeAddress] = useState('');
  const [chainId, setChainId] = useState(56); // Default BSC
  const [privateKey, setPrivateKey] = useState('');
  const [signer, setSigner] = useState<ethers.Wallet | null>(null);
  
  const [safeDetails, setSafeDetails] = useState<SafeDetails | null>(null);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View State
  const [activeTab, setActiveTab] = useState<'assets' | 'send' | 'history' | 'owners'>('assets');
  const [isAdvanced, setIsAdvanced] = useState(false);

  // Transaction Form
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [data, setData] = useState('0x');
  const [selectedAsset, setSelectedAsset] = useState('NATIVE');
  
  // Owner Management Form
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newThreshold, setNewThreshold] = useState(1);
  
  // Execution State
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle'|'executing'|'success'|'failed'>('idle');

  // Optimized Provider Creation
  const provider = useMemo(() => {
    const config = CHAIN_CONFIGS[chainId];
    const staticNetwork = new ethers.Network(config.name, chainId);
    return new ethers.JsonRpcProvider(config.rpc, staticNetwork, { staticNetwork: staticNetwork });
  }, [chainId]);

  const activeChain = CHAIN_CONFIGS[chainId];

  // Load Safe Data
  const loadSafe = async () => {
    if (!safeAddress || !ethers.isAddress(safeAddress)) {
      setError("Invalid Safe Address");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
      
      const [owners, threshold, nonce, balance] = await Promise.all([
        safeContract.getOwners(),
        safeContract.getThreshold(),
        safeContract.nonce(),
        provider.getBalance(safeAddress)
      ]);

      setSafeDetails({
        address: safeAddress,
        owners,
        threshold: Number(threshold),
        nonce: Number(nonce),
        balance: ethers.formatEther(balance)
      });
      
      // Init new threshold state for owner management
      setNewThreshold(Number(threshold));

      // Load Token Balances
      const newBalances: Record<string, string> = {};
      for (const token of activeChain.tokens) {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const bal = await contract.balanceOf(safeAddress);
          newBalances[token.symbol] = ethers.formatUnits(bal, token.decimals);
        } catch (e) {
          console.warn("Token fetch failed", e);
          newBalances[token.symbol] = '0';
        }
      }
      setTokenBalances(newBalances);

    } catch (e: any) {
      console.error(e);
      setError("Failed to load Safe. Check chain and address.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignerImport = () => {
    try {
      if (!privateKey) return;
      const w = new ethers.Wallet(privateKey, provider);
      setSigner(w);
    } catch (e) {
      setError("Invalid Private Key");
    }
  };

  const handleDisconnect = () => {
    setSigner(null);
    setPrivateKey('');
    setError(null);
  };

  const clearSignatures = () => {
    setSignatures({});
    setTxHash(null);
    setTxStatus('idle');
  };

  // --- Transaction Builders ---

  // 1. Create Add Owner Transaction
  const initiateAddOwner = () => {
    if (!newOwnerAddress || !ethers.isAddress(newOwnerAddress)) {
      setError("Invalid new owner address");
      return;
    }
    const iface = new ethers.Interface(SAFE_ABI);
    const payload = iface.encodeFunctionData("addOwnerWithThreshold", [newOwnerAddress, newThreshold]);
    
    setTo(safeAddress); // Self-call
    setAmount('0');
    setData(payload);
    setSelectedAsset('NATIVE');
    setActiveTab('send'); // Switch to send to sign/execute
    clearSignatures();
  };

  // 2. Create Remove Owner Transaction
  const initiateRemoveOwner = (ownerToRemove: string) => {
    if (!safeDetails) return;
    
    // Find prevOwner (Safe uses linked list)
    const index = safeDetails.owners.findIndex(o => o.toLowerCase() === ownerToRemove.toLowerCase());
    let prevOwner = SENTINEL_OWNERS;
    if (index > 0) {
       prevOwner = safeDetails.owners[index - 1];
    } else {
       if (index === 0) prevOwner = SENTINEL_OWNERS;
       else prevOwner = safeDetails.owners[index - 1];
    }

    // Adjust threshold if needed (can't be > owners.length - 1)
    let newThresh = safeDetails.threshold;
    if (newThresh > safeDetails.owners.length - 1) {
       newThresh = safeDetails.owners.length - 1;
    }
    if (newThresh < 1) newThresh = 1;

    const iface = new ethers.Interface(SAFE_ABI);
    const payload = iface.encodeFunctionData("removeOwner", [prevOwner, ownerToRemove, newThresh]);

    setTo(safeAddress);
    setAmount('0');
    setData(payload);
    setSelectedAsset('NATIVE');
    setActiveTab('send');
    clearSignatures();
  };

  // Helper to construct the actual payload
  const getTransactionPayload = () => {
    let targetTo = to;
    let targetValue = amount ? ethers.parseEther(amount) : 0n;
    let targetData = data;

    // In simple mode, if sending a token, we construct the ERC20 transfer call
    if (!isAdvanced && selectedAsset !== 'NATIVE') {
      const token = activeChain.tokens.find(t => t.symbol === selectedAsset);
      if (token) {
        targetTo = token.address; // Safe calls the Token Contract
        targetValue = 0n; // No ETH sent
        
        const iface = new ethers.Interface(ERC20_ABI);
        const parsedAmount = ethers.parseUnits(amount || '0', token.decimals);
        targetData = iface.encodeFunctionData("transfer", [to, parsedAmount]);
      }
    }

    return { targetTo, targetValue, targetData };
  };

  const handleSign = async () => {
    if (!signer || !safeDetails) return;
    setError(null);

    try {
      const { targetTo, targetValue, targetData } = getTransactionPayload();

      const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
      
      const safeTxHash = await safeContract.getTransactionHash(
        targetTo,
        targetValue,
        targetData,
        0, // operation: Call
        0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, // Gas Settings
        safeDetails.nonce
      );

      // Sign with eth_sign (EIP-191)
      const flatSig = await signer.signMessage(ethers.getBytes(safeTxHash));
      const sig = ethers.Signature.from(flatSig);
      
      // Adjust V for Safe (v + 4) if using eth_sign
      let v = sig.v;
      if (v < 30) {
        v += 4;
      }
      
      const adjustedSig = ethers.concat([
        sig.r,
        sig.s,
        new Uint8Array([v])
      ]);

      setSignatures(prev => ({
        ...prev,
        [signer.address]: adjustedSig
      }));

    } catch (e: any) {
      console.error(e);
      setError("Signing failed: " + e.message);
    }
  };

  const handleExecute = async () => {
    if (!signer || !safeDetails) return;
    
    // 1/1 Threshold Optimization: Auto-sign if needed
    if (safeDetails.threshold === 1 && Object.keys(signatures).length === 0) {
       await handleSign();
    }

    setTxStatus('executing');
    setError(null);

    try {
      const { targetTo, targetValue, targetData } = getTransactionPayload();
      const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, signer);
      
      // Re-derive signature if 1/1 and not in state yet (Edge case handling)
      let currentSignatures = signatures;
      if (safeDetails.threshold === 1 && Object.keys(signatures).length === 0) {
         // Perform sign logic specifically for execution context
         const safeTxHash = await safeContract.getTransactionHash(targetTo, targetValue, targetData, 0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, safeDetails.nonce);
         const flatSig = await signer.signMessage(ethers.getBytes(safeTxHash));
         const sig = ethers.Signature.from(flatSig);
         let v = sig.v; if (v < 30) v += 4;
         const adjustedSig = ethers.concat([sig.r, sig.s, new Uint8Array([v])]);
         currentSignatures = { [signer.address]: adjustedSig };
      }

      // Sort signatures
      const sortedSigners = Object.keys(currentSignatures).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
      );

      if (sortedSigners.length < safeDetails.threshold) {
        throw new Error(`Need ${safeDetails.threshold} signatures, got ${sortedSigners.length}`);
      }

      let packedSigs = "0x";
      for (const owner of sortedSigners) {
        packedSigs += currentSignatures[owner].slice(2);
      }

      const tx = await safeContract.execTransaction(
        targetTo,
        targetValue,
        targetData,
        0, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS,
        packedSigs,
        {
          gasLimit: activeChain.execGasLimit
        }
      );

      setTxHash(tx.hash);
      await tx.wait();
      
      // Record History
      const newRecord: TxRecord = {
        hash: tx.hash,
        timestamp: Date.now(),
        to,
        value: amount || '0',
        asset: selectedAsset,
        status: 'success'
      };
      setTxHistory(prev => [newRecord, ...prev]);

      setTxStatus('success');
      loadSafe(); // Refresh
      clearSignatures();
      setTo(''); setAmount(''); setData('0x');
    } catch (e: any) {
      console.error(e);
      setTxStatus('failed');
      setError("Execution failed: " + (e.reason || e.message));
    }
  };

  const getAssetBalance = (symbol: string) => {
    if (symbol === 'NATIVE') return safeDetails?.balance || '0';
    return tokenBalances[symbol] || '0';
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 bg-indigo-900 rounded-lg">
          <Shield className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
             <h2 className="text-2xl font-bold text-slate-900">{t('safe.title')}</h2>
             {safeDetails && (
               <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold flex items-center">
                 <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                 Active
               </span>
             )}
          </div>
          <p className="text-slate-500 text-sm">SDK-Free MultiSig Management</p>
        </div>
        <div className="text-right">
          <select 
            value={chainId} 
            onChange={e => setChainId(Number(e.target.value))}
            className="inline-block p-2 border rounded"
          >
            {Object.entries(CHAIN_CONFIGS).map(([id, conf]) => (
               <option key={id} value={id}>{conf.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Connection Panel */}
      {!safeDetails && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl mx-auto">
          <h3 className="text-lg font-bold mb-4">{t('safe.connect')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('safe.address')}</label>
              <input 
                className="w-full p-2 border rounded font-mono" 
                placeholder="0x..." 
                value={safeAddress}
                onChange={e => setSafeAddress(e.target.value)}
              />
            </div>
            <Button onClick={loadSafe} isLoading={loading} className="w-full">
              {t('safe.connect')}
            </Button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      {safeDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Signer Status */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <h4 className="text-sm font-bold text-slate-500 uppercase">{t('safe.signer')}</h4>
                 {signer && (
                   <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-700 flex items-center">
                     <LogOut className="w-3 h-3 mr-1" /> Lock
                   </button>
                 )}
              </div>
              {signer ? (
                <div className="text-sm text-green-600 flex items-center break-all">
                  <Key className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{signer.address.slice(0,6)}...{signer.address.slice(-4)}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input 
                    type="password"
                    placeholder="Private Key (Browser Memory Only)"
                    className="w-full p-2 border rounded text-xs"
                    value={privateKey}
                    onChange={e => setPrivateKey(e.target.value)}
                  />
                  <Button onClick={handleSignerImport} className="w-full py-1 text-xs">Unlock Signer</Button>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               {[
                 { id: 'assets', label: 'Assets', icon: Wallet },
                 { id: 'send', label: 'Transfer', icon: ArrowRight },
                 { id: 'owners', label: 'Owners', icon: Users },
                 { id: 'history', label: 'History', icon: History },
               ].map((item) => (
                 <button
                   key={item.id}
                   onClick={() => setActiveTab(item.id as any)}
                   className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                     activeTab === item.id ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                   }`}
                 >
                   <item.icon className="w-4 h-4 mr-3" />
                   {item.label}
                 </button>
               ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2">
             
             {/* --- ASSETS TAB --- */}
             {activeTab === 'assets' && (
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 bg-slate-50">
                   <h3 className="font-bold text-slate-700">Wallet Assets</h3>
                 </div>
                 <div className="divide-y divide-slate-100">
                    {/* Native */}
                    <div className="flex items-center justify-between p-4 hover:bg-slate-50">
                       <div className="flex items-center">
                          <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold mr-3 text-xs">
                             {activeChain.symbol[0]}
                          </div>
                          <div>
                             <p className="font-bold text-slate-900">{activeChain.symbol}</p>
                             <p className="text-xs text-slate-500">Native</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-mono font-medium">{parseFloat(safeDetails.balance).toFixed(4)}</p>
                       </div>
                    </div>
                    {/* Tokens */}
                    {activeChain.tokens.map(t => (
                      <div key={t.symbol} className="flex items-center justify-between p-4 hover:bg-slate-50">
                         <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold mr-3 text-xs">
                               {t.symbol[0]}
                            </div>
                            <div>
                               <p className="font-bold text-slate-900">{t.symbol}</p>
                               <p className="text-xs text-slate-500">ERC20</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="font-mono font-medium">{parseFloat(tokenBalances[t.symbol] || '0').toFixed(4)}</p>
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button onClick={() => setActiveTab('send')} className="text-sm text-indigo-600 font-medium hover:underline">Send Assets</button>
                 </div>
               </div>
             )}

             {/* --- SEND TAB --- */}
             {activeTab === 'send' && (
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center">
                      <Plus className="w-5 h-5 mr-2 text-indigo-500" />
                      {t('safe.create_tx')} <span className="ml-2 text-xs text-slate-400 font-normal">Nonce: {safeDetails.nonce}</span>
                    </h3>
                    {safeDetails && (
                      <button 
                          onClick={() => setIsAdvanced(!isAdvanced)}
                          className={`flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${isAdvanced ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        {isAdvanced ? 'Advanced' : 'Simple'}
                      </button>
                    )}
                 </div>

                 <div className="space-y-4">
                   {to === safeAddress ? (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800 mb-4">
                         <strong>Administrative Action:</strong> You are interacting with the Safe contract itself (e.g. Adding/Removing Owners).
                      </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Asset</label>
                          <select 
                            className="w-full p-2 border rounded text-sm bg-white"
                            value={selectedAsset}
                            onChange={e => setSelectedAsset(e.target.value)}
                            disabled={isAdvanced}
                          >
                             <option value="NATIVE">{activeChain.symbol} (Native)</option>
                             {activeChain.tokens.map(t => (
                               <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                             ))}
                          </select>
                          <p className="text-xs text-right text-slate-400 mt-1">
                             Bal: {parseFloat(getAssetBalance(selectedAsset)).toFixed(4)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Amount</label>
                          <input 
                            className="w-full p-2 border rounded font-mono text-sm" 
                            placeholder="0.0" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                          />
                        </div>
                     </div>
                   )}

                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Recipient</label>
                      <input 
                        className="w-full p-2 border rounded font-mono text-sm" 
                        placeholder="0x..." 
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        disabled={to === safeAddress} // Lock if self-call initiated from Owners tab
                      />
                   </div>

                   {isAdvanced && (
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Data (Hex)</label>
                        <textarea 
                          className="w-full p-2 border rounded font-mono text-xs" 
                          rows={2}
                          value={data}
                          onChange={e => setData(e.target.value)}
                          placeholder="0x..."
                        />
                     </div>
                   )}

                   {/* Signature / Execution Area */}
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-6">
                      {/* 1/1 Optimization: Hide complexity */}
                      {safeDetails.threshold === 1 ? (
                         <div className="text-center py-2">
                            <p className="text-sm text-slate-600 mb-4">
                               Single signer wallet detected. Execute directly.
                            </p>
                            <Button 
                              onClick={handleExecute} 
                              disabled={!signer || !to || txStatus === 'executing'}
                              className="w-full bg-green-600 hover:bg-green-700"
                              isLoading={txStatus === 'executing'}
                              icon={<Zap className="w-4 h-4" />}
                            >
                              Execute Transaction
                            </Button>
                         </div>
                      ) : (
                        <>
                          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center justify-between">
                            <span>Signatures Collected</span>
                            <div className="flex items-center space-x-2">
                              <span>{Object.keys(signatures).length} / {safeDetails.threshold}</span>
                              {Object.keys(signatures).length > 0 && (
                                <button onClick={clearSignatures} className="p-1 text-slate-400 hover:text-red-500" title="Clear All">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </h4>
                          
                          <div className="space-y-2 mb-4">
                             {Object.entries(signatures).map(([owner, sig]) => (
                               <div key={owner} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200">
                                  <span className="font-mono">{owner.slice(0,8)}...</span>
                                  <span className="font-mono text-slate-400">{sig.slice(0,10)}...</span>
                               </div>
                             ))}
                             {Object.keys(signatures).length === 0 && (
                               <p className="text-xs text-slate-400 italic">No signatures yet.</p>
                             )}
                          </div>

                          <div className="flex gap-4 pt-2">
                             <Button onClick={handleSign} disabled={!signer || !to} icon={<Key className="w-4 h-4"/>}>
                                {t('safe.sign')}
                             </Button>
                             
                             <div className="flex-1 flex justify-end">
                                <Button 
                                  onClick={handleExecute} 
                                  disabled={Object.keys(signatures).length < safeDetails.threshold || txStatus === 'executing'}
                                  className="bg-green-600 hover:bg-green-700"
                                  isLoading={txStatus === 'executing'}
                                  icon={<ArrowRight className="w-4 h-4" />}
                                >
                                  {t('safe.execute')}
                                </Button>
                             </div>
                          </div>
                        </>
                      )}
                   </div>
                   
                   {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">{error}</div>}
                   
                   {txStatus === 'success' && (
                     <div className="p-3 bg-green-50 text-green-700 text-sm rounded border border-green-100 flex items-center">
                        <Check className="w-4 h-4 mr-2" />
                        Transaction Executed! Hash: {txHash?.slice(0, 10)}...
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* --- OWNERS TAB --- */}
             {activeTab === 'owners' && (
               <div className="space-y-6">
                 {/* Add Owner Box - Optimized Layout */}
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                       <UserPlus className="w-4 h-4 mr-2 text-indigo-600" />
                       Add Owner
                    </h4>
                    <div className="flex gap-3 items-end">
                       <div className="flex-1">
                         <label className="block text-xs text-slate-500 mb-1">Address</label>
                         <input 
                            className="w-full p-2 border border-slate-300 rounded text-xs font-mono h-9"
                            placeholder="New Owner Address (0x...)"
                            value={newOwnerAddress}
                            onChange={e => setNewOwnerAddress(e.target.value)}
                         />
                       </div>
                       <div className="w-28">
                         <label className="block text-xs text-slate-500 mb-1">New Threshold</label>
                         <select 
                            className="w-full p-2 border border-slate-300 rounded text-xs bg-white h-9"
                            value={newThreshold}
                            onChange={e => setNewThreshold(Number(e.target.value))}
                         >
                            {Array.from({length: safeDetails.owners.length + 1}, (_, i) => i + 1).map(n => (
                               <option key={n} value={n}>{n}</option>
                            ))}
                         </select>
                       </div>
                       <Button onClick={initiateAddOwner} disabled={!newOwnerAddress} className="h-9 px-4 text-xs">Add</Button>
                    </div>
                 </div>

                 {/* List */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                       <h3 className="font-bold text-slate-700">Current Owners</h3>
                       <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">
                          Threshold: {safeDetails.threshold} / {safeDetails.owners.length}
                       </span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {safeDetails.owners.map((owner, idx) => (
                        <li key={owner} className="p-4 flex items-center justify-between hover:bg-slate-50 group">
                           <div className="flex items-center">
                              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-xs font-bold mr-3">
                                 {idx + 1}
                              </div>
                              <span className="font-mono text-sm text-slate-700">{owner}</span>
                              {owner.toLowerCase() === signer?.address.toLowerCase() && (
                                 <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">You</span>
                              )}
                           </div>
                           {/* Only allow removal if > 1 owner */}
                           {safeDetails.owners.length > 1 && (
                             <button 
                               onClick={() => initiateRemoveOwner(owner)}
                               className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                               title="Remove Owner"
                             >
                               <UserMinus className="w-4 h-4" />
                             </button>
                           )}
                        </li>
                      ))}
                    </ul>
                 </div>
               </div>
             )}

             {/* --- HISTORY TAB --- */}
             {activeTab === 'history' && (
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                     <h3 className="font-bold text-slate-700">Session History</h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                     {txHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                           No transactions executed in this session.
                        </div>
                     ) : (
                        txHistory.map(tx => (
                           <div key={tx.hash} className="p-4 hover:bg-slate-50">
                              <div className="flex justify-between items-start mb-1">
                                 <div className="flex items-center space-x-2">
                                    <span className={`w-2 h-2 rounded-full ${tx.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className="font-bold text-slate-800 text-sm">Transfer {tx.value} {tx.asset}</span>
                                 </div>
                                 <span className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-xs text-slate-500 font-mono">To: {tx.to.slice(0,6)}...</span>
                                 <a 
                                    href={`${activeChain.explorer}/tx/${tx.hash}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs text-indigo-600 flex items-center hover:underline"
                                 >
                                    View <ExternalLink className="w-3 h-3 ml-1"/>
                                 </a>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
             )}

          </div>
        </div>
      )}
    </div>
  );
};

export default SafeMultiSig;