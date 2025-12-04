
import React from 'react';
import { ArrowLeft, Download, Play, Shield, Zap, Globe, Lock, Trash2, Check, Layout, Key, Database, Layers } from 'lucide-react';
import { PluginManifest } from '../types';
import { Button } from '../components/Button';
import { DynamicIcon } from '../services/iconService';
import { useTranslation } from '../contexts/LanguageContext';

interface PluginInfoProps {
  plugin: PluginManifest;
  isInstalled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onLaunch: () => void;
  onBack: () => void;
}

// Static content map for enriched plugin details
// In a real app, this would be fetched from the plugin's manifest.json URL or an IPFS hash
const PLUGIN_DETAILS: Record<string, { features: {title: string, desc: string, icon: React.ElementType}[], screenshots: string[], longDesc: string }> = {
  'evm-wallet': {
    longDesc: "Nexus Vault is the ultimate non-custodial asset manager for the decentralized web. Designed for both individuals and organizations, it bridges the gap between personal EOA wallets and institutional-grade Gnosis Safe multisigs. Experience a unified interface for all your on-chain operations without relying on centralized gateways.",
    features: [
      { title: "Unified Dashboard", desc: "Manage personal keys (EOA) and Safe Multisigs in a single, fluid interface.", icon: Layout },
      { title: "Multi-Chain Native", desc: "First-class support for Ethereum, BSC, Polygon, and Tron networks.", icon: Globe },
      { title: "Gnosis Safe Integration", desc: "Deploy, track, and manage Multisig treasuries directly. No external SDKs required.", icon: Shield },
      { title: "Zero-Knowledge Keys", desc: "Private keys never leave your browser memory. Encrypted session storage ensures total privacy.", icon: Lock },
      { title: "Token Management", desc: "Auto-discovery for major tokens and custom import for any ERC20/TRC20 asset.", icon: Database }
    ],
    screenshots: [] 
  },
  'vanity-gen': {
    longDesc: "Identity Forge is a high-performance, offline address generator. It allows you to mine 'vanity' addresses (addresses starting or ending with specific characters) for EVM, Bitcoin, and Tron networks using your local CPU power. Secure, private, and efficient.",
    features: [
      { title: "Multi-Network Mining", desc: "Generate custom addresses for Ethereum (0x...), Bitcoin (1...), and Tron (T...).", icon: Layers },
      { title: "Offline Security", desc: "All cryptographic operations happen locally via WebAssembly. No keys are ever transmitted.", icon: Shield },
      { title: "High Performance", desc: "Optimized mining loop utilizing web workers for non-blocking UI.", icon: Zap },
      { title: "HD Wallet Support", desc: "Generate full BIP39 mnemonic phrases and derive paths automatically.", icon: Key }
    ],
    screenshots: []
  }
};

const FeatureCard: React.FC<{ title: string; desc: string; icon: React.ElementType; index: number }> = ({ title, desc, icon: Icon, index }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 animate-tech-in" style={{ animationDelay: `${index * 0.1}s` }}>
    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600">
      <Icon className="w-5 h-5" />
    </div>
    <h3 className="font-bold text-slate-900 mb-2 text-sm">{title}</h3>
    <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
  </div>
);

const PluginInfo: React.FC<PluginInfoProps> = ({ plugin, isInstalled, onInstall, onUninstall, onLaunch, onBack }) => {
  const { t } = useTranslation();
  const details = PLUGIN_DETAILS[plugin.id] || { 
    longDesc: plugin.description, 
    features: [], 
    screenshots: [] 
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header / Nav */}
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('btn.back_market')}
      </button>

      {/* Hero Banner */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-pink-50 rounded-bl-full opacity-50 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center shadow-inner flex-shrink-0">
             <DynamicIcon name={plugin.iconName} className="w-12 h-12 md:w-16 md:h-16 text-slate-700" />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
               <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{plugin.name}</h1>
               <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200 uppercase tracking-wide">
                 v{plugin.version}
               </span>
            </div>
            <p className="text-slate-500 font-medium mb-6 max-w-2xl">{details.longDesc}</p>
            
            <div className="flex flex-wrap gap-3">
              {isInstalled ? (
                <>
                  <Button onClick={onLaunch} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 text-sm" icon={<Play className="w-4 h-4"/>}>
                    {t('btn.launch')}
                  </Button>
                  <Button onClick={onUninstall} variant="outline" className="px-6 py-3 text-red-600 border-red-100 hover:bg-red-50 text-sm" icon={<Trash2 className="w-4 h-4"/>}>
                    {t('btn.uninstall')}
                  </Button>
                </>
              ) : (
                <Button onClick={onInstall} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 shadow-xl text-sm" icon={<Download className="w-4 h-4"/>}>
                  {t('btn.install')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      {details.features.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-amber-500" />
            {t('plugin.features')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {details.features.map((feat, idx) => (
              <FeatureCard key={idx} index={idx} {...feat} />
            ))}
          </div>
        </div>
      )}

      {/* Additional Info / Meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">{t('plugin.specs')}</h3>
            <div className="space-y-3 text-sm">
               <div className="flex justify-between">
                  <span className="text-slate-500">Version</span>
                  <span className="font-mono font-medium text-slate-700">{plugin.version}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-500">Category</span>
                  <span className="font-medium text-slate-700">{plugin.category}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-500">Author</span>
                  <span className="font-medium text-indigo-600">{plugin.author}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-500">License</span>
                  <span className="font-medium text-slate-700">MIT / Open Source</span>
               </div>
            </div>
         </div>
         
         <div className="md:col-span-2 bg-indigo-900 rounded-2xl p-6 border border-indigo-800 text-indigo-100 flex flex-col justify-center relative overflow-hidden">
            <Shield className="w-32 h-32 text-indigo-800 absolute -right-6 -bottom-6 opacity-50" />
            <div className="relative z-10">
               <h3 className="font-bold text-white mb-2 flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  ZeroState Privacy Promise
               </h3>
               <p className="text-sm opacity-90 leading-relaxed mb-4">
                  This plugin runs entirely within your browser's sandbox. No data is sent to ZeroState servers. Private keys are never persisted to disk without your explicit encryption.
               </p>
               <div className="flex gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-800 text-xs font-medium">
                     <Check className="w-3 h-3 mr-1" /> Client Side
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-800 text-xs font-medium">
                     <Check className="w-3 h-3 mr-1" /> Open Source
                  </span>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default PluginInfo;
