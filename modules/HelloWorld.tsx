import React, { useState } from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '../components/Button';

// A simple example plugin demonstrating the structure required for the ZeroState Hub.
const HelloWorld: React.FC = () => {
  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState('');

  const handleSayHello = () => {
    setGreeting(`Hello, ${name || 'World'}! Welcome to the Hub.`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-indigo-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Hello World Plugin</h2>
        <p className="text-slate-500 mb-8">
          This is a sample plugin to demonstrate how simple it is to build for ZeroState Hub.
          It is an independent React component loaded dynamically.
        </p>

        <div className="max-w-xs mx-auto space-y-4">
          <input 
            type="text" 
            placeholder="What's your name?" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          
          <Button 
            onClick={handleSayHello} 
            className="w-full"
            icon={<MessageCircle className="w-4 h-4" />}
          >
            Say Hello
          </Button>
        </div>

        {greeting && (
          <div className="mt-8 p-4 bg-indigo-50 text-indigo-700 rounded-lg font-medium animate-in slide-in-from-bottom-2">
            {greeting}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelloWorld;