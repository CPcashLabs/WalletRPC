
import React from 'react';
import { ShieldCheck, ArrowRight, Hexagon, Lock } from 'lucide-react';
import { Button } from '../../../components/Button';
import { useTranslation } from '../../../contexts/LanguageContext';

interface WalletOnboardingProps {
  input: string;
  setInput: (v: string) => void;
  onImport: () => void;
  error: string | null;
}

export const WalletOnboarding: React.FC<WalletOnboardingProps> = ({ input, setInput, onImport, error }) => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f172a] text-white relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-tech-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl mb-6 shadow-2xl shadow-indigo-900/50 transform rotate-45 border border-white/10">
            <ShieldCheck className="w-10 h-10 text-white transform -rotate-45" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">{t('wallet.title')}</h1>
          <p className="text-slate-400 font-medium">{t('wallet.intro')}</p>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
           <div className="flex items-center space-x-2 mb-6">
             <Lock className="w-4 h-4 text-indigo-400" />
             <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">{t('wallet.connect_title')}</span>
           </div>

           <div className="space-y-6">
             <div>
               <textarea
                 className="w-full p-4 bg-slate-900/80 border border-slate-700 rounded-xl font-mono text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-600"
                 placeholder="Mnemonic Phrase or Private Key (0x...)"
                 rows={3}
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 autoFocus
               />
             </div>
             
             <Button 
                onClick={onImport} 
                className="w-full py-4 text-base font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" 
                disabled={!input}
                icon={<ArrowRight className="w-5 h-5" />}
             >
               Unlock Vault
             </Button>
           </div>

           {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start animate-shake">
              <Hexagon className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
           )}
        </div>

        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
             <span>Client-Side Encryption</span>
             <span className="mx-2">•</span>
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
             <span>Zero Telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};
