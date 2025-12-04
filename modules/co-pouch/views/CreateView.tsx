
import React from 'react';
import { ArrowLeft, PiggyBank, Check } from 'lucide-react';
import { Button } from '../../../components/Button';
import { THEMES, ThemeColor } from '../constants';

interface CreateViewProps {
  onBack: () => void;
  newPouchName: string;
  setNewPouchName: (name: string) => void;
  selectedTheme: ThemeColor;
  setSelectedTheme: (theme: ThemeColor) => void;
  handleCreate: () => void;
  isDeployingSafe: boolean;
}

export const CreateView: React.FC<CreateViewProps> = ({
  onBack,
  newPouchName,
  setNewPouchName,
  selectedTheme,
  setSelectedTheme,
  handleCreate,
  isDeployingSafe
}) => {
  const theme = THEMES[selectedTheme];

  return (
    <div className="max-w-md mx-auto bg-white min-h-[700px] flex flex-col relative overflow-hidden rounded-[32px] shadow-2xl border border-slate-100">
      <div className="absolute inset-0 bg-slate-50/50 z-0"></div>
      
      {/* Nav */}
      <div className="relative z-10 p-6 flex items-center">
         <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-800" />
         </button>
         <h2 className="text-lg font-bold ml-4">Design Your Pouch</h2>
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-8">
         {/* Preview Card */}
         <div className="py-8 flex justify-center perspective-1000">
            <div className={`relative w-full aspect-[1.6] rounded-3xl bg-gradient-to-br ${theme.gradient} shadow-2xl shadow-indigo-200/50 p-6 text-white transition-all duration-500 ease-out transform hover:rotate-y-12`}>
               <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 blur-3xl rounded-full -mr-10 -mt-10"></div>
               <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                     <PiggyBank className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">PREVIEW</div>
               </div>
               <div className="mt-8">
                  <p className="opacity-80 text-xs font-medium uppercase tracking-wider">Pouch Name</p>
                  <p className="text-2xl font-bold truncate">{newPouchName || "My Awesome Trip"}</p>
               </div>
            </div>
         </div>

         {/* Controls */}
         <div className="space-y-8 mt-4">
            <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Choose Theme</label>
               <div className="flex justify-between gap-2">
                  {(Object.keys(THEMES) as ThemeColor[]).map(t => (
                     <button
                       key={t}
                       onClick={() => setSelectedTheme(t)}
                       className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${THEMES[t].gradient} flex items-center justify-center transition-all duration-300 ${selectedTheme === t ? 'ring-4 ring-slate-900 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                     >
                        {selectedTheme === t && <Check className="w-6 h-6 text-white" />}
                     </button>
                  ))}
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pouch Name</label>
               <input 
                 value={newPouchName}
                 onChange={e => setNewPouchName(e.target.value)}
                 placeholder="e.g. Summer Vacation"
                 className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 transition-all"
               />
            </div>
         </div>

         <div className="mt-auto pb-8">
            <Button 
              onClick={handleCreate} 
              isLoading={isDeployingSafe}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-200 btn-tech-press"
            >
               Create CoPouch
            </Button>
            <p className="text-center text-[10px] text-slate-400 mt-4">
               Deployed on BTT Chain. Gas fees apply.
            </p>
         </div>
      </div>
    </div>
  );
};
