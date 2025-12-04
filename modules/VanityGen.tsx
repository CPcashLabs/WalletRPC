
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Key, RefreshCw, Copy, Shield,
  Cpu, Play, Square, Download, Eye, EyeOff, Info, Layers
} from 'lucide-react';
import { ethers } from 'ethers';
import { Button } from '../components/Button';

// --- Types ---

type ChainType = 'EVM' | 'TRON' | 'BTC';

interface ChainConfig {
  id: ChainType;
  name: string;
  path: string; // BIP44 Path
  prefixExample: string;
}

const CHAINS: ChainConfig[] = [
  { id: 'EVM', name: 'Ethereum / BSC / Polygon', path: "m/44'/60'/0'/0/0", prefixExample: '0x' },
  { id: 'TRON', name: 'Tron (TRX)', path: "m/44'/195'/0'/0/0", prefixExample: 'T' },
  { id: 'BTC', name: 'Bitcoin (Legacy P2PKH)', path: "m/44'/0'/0'/0/0", prefixExample: '1' },
];

// --- Worker Code ---
// We inject dependencies via esm.sh but minimize them to just ethers and bs58.
// ethers contains all necessary crypto (sha256, ripemd160, keccak256, signing).
const WORKER_CODE = `
import { Wallet, sha256, ripemd160, getBytes } from 'https://esm.sh/ethers@6.13.4';
import { encode as bs58Encode } from 'https://esm.sh/bs58@5.0.0';

// --- Helpers ---

function getBytesFromHex(hex) {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Bitcoin P2PKH Generator
function generateBtc() {
  const wallet = Wallet.createRandom();
  const pubKeyCompressed = wallet.signingKey.publicKey; // Hex string (0x...)
  const pubKeyBytes = getBytesFromHex(pubKeyCompressed);
  
  // 1. SHA256 (returns hex)
  const s1Hex = sha256(pubKeyBytes);
  const s1Bytes = getBytesFromHex(s1Hex);

  // 2. RIPEMD160 (returns hex)
  const r1Hex = ripemd160(s1Bytes);
  const r1Bytes = getBytesFromHex(r1Hex);
  
  // 3. Add version byte (0x00 for Mainnet)
  const v1 = new Uint8Array(r1Bytes.length + 1);
  v1[0] = 0x00;
  v1.set(r1Bytes, 1);
  
  // 4. Double SHA256 for checksum
  const c1Hex = sha256(sha256(v1));
  const c1Bytes = getBytesFromHex(c1Hex);
  const checksum = c1Bytes.slice(0, 4);
  
  // 5. Concatenate and Base58
  const final = new Uint8Array(v1.length + 4);
  final.set(v1);
  final.set(checksum, v1.length);
  
  return {
    address: bs58Encode(final),
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase
  };
}

// Tron Generator
function generateTron() {
  const wallet = Wallet.createRandom();
  // EVM Address is last 20 bytes of Keccak256(PubKey).
  // Tron uses same keypair but different encoding.
  
  const evmAddr = wallet.address; // 0x...
  const evmBytes = getBytesFromHex(evmAddr);
  
  const tronBytes = new Uint8Array(21);
  tronBytes[0] = 0x41; // Mainnet prefix
  tronBytes.set(evmBytes, 1);
  
  // Double SHA256 Checksum
  const c1Hex = sha256(sha256(tronBytes));
  const c1Bytes = getBytesFromHex(c1Hex);
  const checksum = c1Bytes.slice(0, 4);
  
  const final = new Uint8Array(25);
  final.set(tronBytes);
  final.set(checksum, 21);
  
  return {
    address: bs58Encode(final),
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase
  };
}

self.onmessage = (e) => {
  const { prefix, suffix, caseSensitive, chain } = e.data;
  const targetPrefix = caseSensitive ? prefix : prefix.toLowerCase();
  const targetSuffix = caseSensitive ? suffix : suffix.toLowerCase();
  
  const BATCH_SIZE = 200;
  let attempts = 0;

  while (true) {
    let result;
    
    if (chain === 'BTC') result = generateBtc();
    else if (chain === 'TRON') result = generateTron();
    else {
      // EVM
      const wallet = Wallet.createRandom();
      result = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };
    }

    const checkAddr = caseSensitive ? result.address : result.address.toLowerCase();
    
    // For EVM, strip 0x for checking convenience if user didn't type it
    // For others, keep as is
    let cleanAddr = checkAddr;
    if (chain === 'EVM' && cleanAddr.startsWith('0x')) {
       cleanAddr = cleanAddr.substring(2);
    }

    const matchPrefix = targetPrefix === '' || cleanAddr.startsWith(targetPrefix);
    const matchSuffix = targetSuffix === '' || cleanAddr.endsWith(targetSuffix);

    attempts++;

    if (matchPrefix && matchSuffix) {
      self.postMessage({
        type: 'FOUND',
        payload: result
      });
    }

    if (attempts % BATCH_SIZE === 0) {
      self.postMessage({ type: 'PROGRESS', attempts: BATCH_SIZE });
    }
  }
};
`;

interface VanityResult {
  address: string;
  privateKey: string;
  mnemonic?: string | null;
}

const VanityGen: React.FC = () => {
  const [tab, setTab] = useState<'bip44' | 'vanity'>('bip44');
  const [selectedChain, setSelectedChain] = useState<ChainType>('EVM');
  
  // --- BIP44 State ---
  const [generatedIdentity, setGeneratedIdentity] = useState<{
    mnemonic: string;
    address: string;
    privateKey: string;
    path: string;
  } | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);

  // --- Vanity State ---
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(true);
  const [isMining, setIsMining] = useState(false);
  const [attemptsPerSecond, setAttemptsPerSecond] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [results, setResults] = useState<VanityResult[]>([]);
  
  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number>(0);
  const attemptsRef = useRef<number>(0);

  // --- Actions: BIP44 ---

  const generateIdentity = async () => {
    // 1. Generate Mnemonic
    const randomWallet = ethers.Wallet.createRandom();
    const mnemonic = randomWallet.mnemonic!.phrase;
    
    const config = CHAINS.find(c => c.id === selectedChain)!;
    
    // 2. Derive specific path using HDNodeWallet
    const derivedNode = ethers.HDNodeWallet.fromPhrase(mnemonic, "", config.path);
    
    let address = derivedNode.address;
    let privateKey = derivedNode.privateKey;

    if (selectedChain === 'TRON') {
       try {
         // @ts-ignore
         const { default: bs58 } = await import('bs58');
         
         const cleanEvmAddr = address.slice(2);
         const evmBytes = ethers.getBytes("0x" + cleanEvmAddr);
         
         const tronBytes = new Uint8Array(21);
         tronBytes[0] = 0x41;
         tronBytes.set(evmBytes, 1);
         
         const c1 = ethers.getBytes(ethers.sha256(tronBytes));
         const c2 = ethers.getBytes(ethers.sha256(c1));
         const checksum = c2.slice(0, 4);
         
         const final = new Uint8Array(25);
         final.set(tronBytes);
         final.set(checksum, 21);
         
         address = bs58.encode(final);
       } catch (e) {
         console.error("Tron generation failed", e);
         alert("Failed to load crypto libraries for TRON address generation.");
       }
    } else if (selectedChain === 'BTC') {
       try {
         // @ts-ignore
         const { default: bs58 } = await import('bs58');

         const pubKey = derivedNode.publicKey; 
         const pubKeyBytes = ethers.getBytes(pubKey);

         const s1 = ethers.getBytes(ethers.sha256(pubKeyBytes));
         const r1 = ethers.getBytes(ethers.ripemd160(s1));
         
         const v1 = new Uint8Array(r1.length + 1);
         v1[0] = 0x00; // Mainnet
         v1.set(r1, 1);
         
         const c1 = ethers.getBytes(ethers.sha256(ethers.sha256(v1)));
         const checksum = c1.slice(0, 4);
         
         const final = new Uint8Array(v1.length + 4);
         final.set(v1);
         final.set(checksum, v1.length);
         
         address = bs58.encode(final);
       } catch (e) {
         console.error("BTC generation failed", e);
         alert("Failed to load crypto libraries for BTC address generation.");
       }
    }

    setGeneratedIdentity({
      mnemonic,
      address,
      privateKey,
      path: config.path
    });
    setShowSensitive(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Actions: Vanity ---

  const validateInput = (text: string) => {
    // Validation depends on chain
    if (selectedChain === 'EVM') return /^[0-9a-fA-F]*$/.test(text);
    if (selectedChain === 'TRON' || selectedChain === 'BTC') {
       // Base58 chars (no 0, O, I, l)
       return /^[1-9A-HJ-NP-Za-km-z]*$/.test(text);
    }
    return true;
  };

  const startMining = useCallback(() => {
    if (!validateInput(prefix) || !validateInput(suffix)) {
      alert("Invalid characters for the selected chain.");
      return;
    }

    // Cleanup existing
    if (workerRef.current) workerRef.current.terminate();

    // Create Worker from Blob
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
    workerRef.current = worker;

    setIsMining(true);
    setAttemptsPerSecond(0);
    attemptsRef.current = 0;
    startTimeRef.current = Date.now();

    worker.postMessage({
      prefix,
      suffix,
      caseSensitive: isCaseSensitive,
      chain: selectedChain
    });

    worker.onmessage = (e) => {
      const { type, payload, attempts } = e.data;
      
      if (type === 'PROGRESS') {
        attemptsRef.current += attempts;
      } else if (type === 'FOUND') {
        setResults(prev => [payload, ...prev]);
      }
    };

    // UI Loop for Speedometer
    const speedInterval = setInterval(() => {
        const now = Date.now();
        const diff = (now - startTimeRef.current) / 1000;
        if (diff > 0) {
            setAttemptsPerSecond(Math.floor(attemptsRef.current / diff));
        }
        setTotalAttempts(attemptsRef.current);
    }, 1000);

    (worker as any)._speedInterval = speedInterval;

  }, [prefix, suffix, isCaseSensitive, selectedChain]);

  const stopMining = () => {
    if (workerRef.current) {
      clearInterval((workerRef.current as any)._speedInterval);
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsMining(false);
    setAttemptsPerSecond(0);
  };

  useEffect(() => {
    return () => stopMining();
  }, []);

  const downloadResults = () => {
    if (results.length === 0) return;
    const csvContent = "Address,PrivateKey,Mnemonic\n" + results.map(r => `${r.address},${r.privateKey},${r.mnemonic || ''}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanity_${selectedChain}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getAddressLabel = (chain: ChainType) => {
    switch(chain) {
        case 'EVM': return 'Address (EVM Format)';
        case 'TRON': return 'Address (TRON Format)';
        case 'BTC': return 'Address (P2PKH)';
        default: return 'Address';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Key className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Identity Forge</h2>
            <p className="text-slate-500 text-sm">Multi-Chain Address Generator</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
           {/* Tab Switcher */}
          <div className="flex space-x-1 bg-white p-1 rounded-md border border-slate-200">
            <button
              onClick={() => setTab('bip44')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                tab === 'bip44' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              HD Wallet Generator
            </button>
            <button
              onClick={() => setTab('vanity')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                tab === 'vanity' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Vanity Miner
            </button>
          </div>

          {/* Chain Selector */}
          <div className="flex items-center space-x-2">
             <Layers className="w-4 h-4 text-slate-400" />
             <select 
               value={selectedChain}
               onChange={(e) => {
                 setSelectedChain(e.target.value as ChainType);
                 setPrefix('');
                 setSuffix('');
                 stopMining();
                 setResults([]);
                 setGeneratedIdentity(null);
               }}
               className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
               disabled={isMining}
             >
               {CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
        </div>

        {/* --- BIP44 Tab --- */}
        {tab === 'bip44' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                   <strong>Offline Security:</strong> All keys are generated locally. This tool uses `ethers.js` randomness.
                </div>
             </div>

             <Button onClick={generateIdentity} icon={<RefreshCw className="w-4 h-4" />}>
               Generate {selectedChain} Identity
             </Button>

             {generatedIdentity && (
               <div className="space-y-4 border-t border-slate-100 pt-6">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mnemonic Phrase</label>
                   <div className="relative group">
                     <div className={`p-4 bg-slate-900 rounded-lg font-mono text-lg break-words transition-all ${showSensitive ? 'text-emerald-400' : 'text-slate-900 blur-sm select-none'}`}>
                        {generatedIdentity.mnemonic}
                     </div>
                     <button 
                       onClick={() => setShowSensitive(!showSensitive)}
                       className="absolute top-2 right-2 text-slate-500 hover:text-white"
                     >
                       {showSensitive ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        {getAddressLabel(selectedChain)}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input readOnly value={generatedIdentity.address} className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-sm" />
                        <button onClick={() => copyToClipboard(generatedIdentity.address)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Copy className="w-4 h-4"/></button>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Private Key</label>
                      <div className="flex items-center space-x-2">
                        <input 
                           readOnly 
                           type={showSensitive ? "text" : "password"}
                           value={generatedIdentity.privateKey} 
                           className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-sm" 
                        />
                        <button onClick={() => copyToClipboard(generatedIdentity.privateKey)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Copy className="w-4 h-4"/></button>
                      </div>
                   </div>
                 </div>
                 
                 <div className="text-xs text-slate-400 font-mono">
                   Derivation Path: {generatedIdentity.path}
                 </div>
               </div>
             )}
          </div>
        )}

        {/* --- Vanity Tab --- */}
        {tab === 'vanity' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                   <h3 className="font-bold text-slate-700">Mining Criteria ({selectedChain})</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">Prefix</label>
                       <div className="relative">
                          {selectedChain === 'EVM' && (
                            <span className="absolute left-2 top-2 text-slate-400 text-sm pointer-events-none">
                              0x
                            </span>
                          )}
                          <input 
                            value={prefix} 
                            onChange={e => setPrefix(e.target.value)} 
                            placeholder="abc"
                            maxLength={5}
                            className={`w-full p-2 border border-slate-300 rounded font-mono ${selectedChain === 'EVM' ? 'pl-6' : 'pl-2'}`}
                            disabled={isMining}
                          />
                       </div>
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">Suffix</label>
                       <input 
                         value={suffix} 
                         onChange={e => setSuffix(e.target.value)} 
                         placeholder="123"
                         maxLength={5}
                         className="w-full p-2 border border-slate-300 rounded font-mono"
                         disabled={isMining}
                       />
                     </div>
                   </div>
                   
                   <div className="flex items-center space-x-2">
                     <input 
                       type="checkbox" 
                       id="case" 
                       checked={isCaseSensitive} 
                       onChange={e => setIsCaseSensitive(e.target.checked)}
                       disabled={isMining}
                       className="rounded text-amber-600 focus:ring-amber-500"
                     />
                     <label htmlFor="case" className="text-sm text-slate-600">Case Sensitive (Slower)</label>
                   </div>
                   
                   <div className="flex items-center space-x-2 pt-2">
                     {!isMining ? (
                       <Button onClick={startMining} className="w-full bg-slate-900 hover:bg-slate-800" icon={<Play className="w-4 h-4"/>}>Start Mining</Button>
                     ) : (
                       <Button onClick={stopMining} variant="danger" className="w-full" icon={<Square className="w-4 h-4"/>}>Stop</Button>
                     )}
                   </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <div className="text-2xl font-mono font-bold text-slate-900">{attemptsPerSecond.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">addr / sec</div>
                     </div>
                     <div>
                        <div className="text-2xl font-mono font-bold text-slate-900">{(totalAttempts / 1000000).toFixed(2)}M</div>
                        <div className="text-xs text-slate-500">total attempts</div>
                     </div>
                  </div>
                  {isMining && (
                    <div className="mt-3 flex items-center text-xs text-amber-600 animate-pulse">
                      <Cpu className="w-3 h-3 mr-1" /> Mining in background thread...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col h-[400px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-700">Found ({results.length})</h3>
                  {results.length > 0 && (
                    <button onClick={downloadResults} className="text-xs flex items-center text-indigo-600 hover:underline">
                      <Download className="w-3 h-3 mr-1" /> Export CSV
                    </button>
                  )}
                </div>
                
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg overflow-y-auto p-2 space-y-2">
                   {results.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                        <Info className="w-8 h-8 mb-2 opacity-20" />
                        No matches found yet.
                     </div>
                   )}
                   {results.map((res, idx) => (
                     <div key={idx} className="bg-white p-3 rounded border border-slate-100 shadow-sm text-xs">
                       <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-slate-500">Address</span>
                         <button onClick={() => copyToClipboard(res.address)}><Copy className="w-3 h-3 text-slate-300 hover:text-slate-500"/></button>
                       </div>
                       <div className="font-mono text-slate-900 break-all mb-2">{res.address}</div>
                       
                       <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-slate-500">Private Key</span>
                         <button onClick={() => copyToClipboard(res.privateKey)}><Copy className="w-3 h-3 text-slate-300 hover:text-slate-500"/></button>
                       </div>
                       <div className="font-mono text-slate-600 break-all truncate">
                          {showSensitive ? res.privateKey : "•".repeat(64)}
                       </div>
                     </div>
                   ))}
                </div>
                <div className="mt-2 flex items-center">
                   <input type="checkbox" checked={showSensitive} onChange={e => setShowSensitive(e.target.checked)} className="mr-2"/>
                   <span className="text-xs text-slate-500">Reveal Private Keys</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VanityGen;
