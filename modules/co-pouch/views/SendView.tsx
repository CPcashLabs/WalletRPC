
import React from 'react';
import { ArrowLeft, Wallet } from 'lucide-react';
import { Button } from '../../../components/Button';

interface SendViewProps {
  onBack: () => void;
  sendAmount: string;
  setSendAmount: (val: string) => void;
  sendTo: string;
  setSendTo: (val: string) => void;
  handleSendAction: () => void;
}

export const SendView: React.FC<SendViewProps> = ({
  onBack,
  sendAmount,
  setSendAmount,
  sendTo,
  setSendTo,
  handleSendAction
}) => {
  return (
    <div className="max-w-md mx-auto bg-white min-h-[700px] flex flex-col rounded-[32px] overflow-hidden shadow-2xl">
       <div className="p-6 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg">Transfer</h2>
          <div className="w-8"></div>
       </div>

       <div className="flex-1 px-8 pt-8 flex flex-col items-center">
          <div className="w-full text-center mb-10">
             <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-4">Amount</p>
             <div className="relative inline-block">
                <span className="absolute -left-6 top-2 text-2xl text-slate-300">$</span>
                <input 
                   className="text-6xl font-black text-slate-900 bg-transparent text-center w-full outline-none placeholder:text-slate-200"
                   placeholder="0"
                   value={sendAmount}
                   onChange={e => setSendAmount(e.target.value)}
                   autoFocus
                />
             </div>
          </div>

          <div className="w-full space-y-6">
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Recipient</label>
                <div className="flex items-center bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all">
                   <Wallet className="w-5 h-5 text-slate-400 mr-3" />
                   <input 
                      className="flex-1 bg-transparent outline-none text-sm font-mono font-medium text-slate-700"
                      placeholder="0x Address or ENS"
                      value={sendTo}
                      onChange={e => setSendTo(e.target.value)}
                   />
                   <button className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-slate-200 ml-2 hover:bg-slate-100">PASTE</button>
                </div>
             </div>
          </div>
          
          <div className="mt-auto w-full pb-8">
            <Button 
               onClick={handleSendAction} 
               className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-300 btn-tech-press"
               disabled={!sendAmount || !sendTo}
            >
               Review & Send
            </Button>
          </div>
       </div>
    </div>
  );
};
