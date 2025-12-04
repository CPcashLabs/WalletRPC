import React from 'react';
import { Code, Terminal, Cpu, Layers } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export const DeveloperGuide: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-xl mb-4">
          <Code className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{t('guide.title')}</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {t('guide.subtitle')}
        </p>
      </div>

      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Cpu className="w-24 h-24" />
          </div>
          <div className="text-indigo-600 font-bold text-xl mb-2">01</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{t('guide.step1.title')}</h3>
          <p className="text-slate-500 text-sm">
            {t('guide.step1.desc')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Layers className="w-24 h-24" />
          </div>
          <div className="text-indigo-600 font-bold text-xl mb-2">02</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{t('guide.step2.title')}</h3>
          <p className="text-slate-500 text-sm">
            {t('guide.step2.desc')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Terminal className="w-24 h-24" />
          </div>
          <div className="text-indigo-600 font-bold text-xl mb-2">03</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{t('guide.step3.title')}</h3>
          <p className="text-slate-500 text-sm">
            {t('guide.step3.desc')}
          </p>
        </div>
      </div>

      {/* Code Template Section */}
      <div className="bg-slate-900 rounded-xl p-8 text-slate-300 shadow-xl">
        <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Code className="w-5 h-5 mr-2 text-indigo-400" />
            {t('guide.template.title')}
          </h3>
          <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded">MyPlugin.tsx</span>
        </div>
        <pre className="font-mono text-sm overflow-x-auto">
{`import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../components/Button'; // Shared Component

const MyPlugin: React.FC = () => {
  const [input, setInput] = useState('');

  const handleAction = async () => {
    // Your AI Logic or API Call here
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">My Plugin Title</h2>
        </div>
        
        {/* Your UI Content */}
        <div className="space-y-4">
          <input 
             value={input} 
             onChange={e => setInput(e.target.value)}
             className="w-full border p-2 rounded" 
          />
          <Button onClick={handleAction}>Run Action</Button>
        </div>
      </div>
    </div>
  );
};

// CRITICAL: Must export as default
export default MyPlugin;`}
        </pre>
      </div>

      {/* Prompting Guide */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">{t('guide.prompt.title')}</h3>
          <p className="text-slate-500 text-sm">{t('guide.prompt.desc')}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 mb-2 text-sm uppercase tracking-wide">Developer Prompt Template</h4>
            <p className="text-slate-700 text-sm italic mb-4">
              "Act as a Senior React Developer. I need to build a plugin for 'ZeroState Hub'. 
              <br/><br/>
              Requirements:
              <br/>1. Create a single file React Functional Component.
              <br/>2. Use Tailwind CSS for styling (slate-50 for bg, slate-900 for text).
              <br/>3. Use 'lucide-react' for icons.
              <br/>4. Export the component as `default`.
              <br/>5. Do NOT import heavy external libraries unless necessary.
              <br/>6. Assume a `Button` component exists in `../components/Button`.
              <br/><br/>
              The plugin functionality is: [DESCRIBE YOUR APP HERE]"
            </p>
          </div>
          
          <div className="flex items-start space-x-4 pt-4">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 mb-1">{t('guide.why.title')}</h4>
              <p className="text-sm text-slate-600">
                {t('guide.why.desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};