import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/Button';

interface WalletOnboardingProps {
  input: string;
  setInput: (v: string) => void;
  onImport: () => void;
  error: string | null;
}

export const WalletOnboarding: React.FC<WalletOnboardingProps> = ({ input, setInput, onImport, error }) => (
  <div className="h-full flex flex-col items-center justify-center p-6 animate-tech-in">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div className="p-8 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldCheck className="w-10 h-10 text-indigo-600" />
        </div>
        
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Initialize Wallet</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Secure, non-custodial EVM & Safe management. <br/>Keys stay in your browser memory.
        </p>
        
        <div className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Private Key or Mnemonic</label>
            <textarea
              className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all resize-none bg-slate-50 focus:bg-white"
              placeholder="Enter your secret phrase or private key..."
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={onImport} 
            className="w-full py-3 shadow-lg shadow-indigo-100 btn-tech-press" 
            disabled={!input}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Unlock Secure Enclave
          </Button>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center animate-shake">
              {error}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-4">
            Encrypted session. Cleared on refresh.
          </p>
        </div>
      </div>
    </div>
  </div>
);