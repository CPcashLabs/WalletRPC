import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { ChainConfig, TokenConfig } from '../types';

// --- Chain Modal ---

interface ChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: ChainConfig;
  onSave: (config: ChainConfig) => void;
}

export const ChainModal: React.FC<ChainModalProps> = ({ isOpen, onClose, initialConfig, onSave }) => {
  const [config, setConfig] = useState<Partial<ChainConfig>>({});

  useEffect(() => {
    if (isOpen) setConfig(initialConfig);
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Network Settings</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs">Chain ID</label>
            <input className="w-full border rounded p-2" type="number" value={config.id || ''} onChange={e => setConfig({ ...config, id: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs">Name</label>
            <input className="w-full border rounded p-2" value={config.name || ''} onChange={e => setConfig({ ...config, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs">RPC URL</label>
            <input className="w-full border rounded p-2" value={config.defaultRpcUrl || ''} onChange={e => setConfig({ ...config, defaultRpcUrl: e.target.value })} />
          </div>
          <div>
            <label className="text-xs">Symbol</label>
            <input className="w-full border rounded p-2" value={config.currencySymbol || ''} onChange={e => setConfig({ ...config, currencySymbol: e.target.value })} />
          </div>
          <div>
            <label className="text-xs">Explorer URL</label>
            <input className="w-full border rounded p-2" value={config.explorerUrl || ''} onChange={e => setConfig({ ...config, explorerUrl: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => onSave(config as ChainConfig)} className="w-full">Save Network</Button>
        </div>
      </div>
    </div>
  );
};

// --- Token Modals ---

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (address: string) => void;
  isImporting: boolean;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({ isOpen, onClose, onImport, isImporting }) => {
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Add Custom Token</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Contract Address</label>
            <input 
              className="w-full border rounded p-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="0x..." 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
            />
          </div>
          <Button onClick={() => onImport(address)} isLoading={isImporting} className="w-full">
            Import Token
          </Button>
        </div>
      </div>
    </div>
  );
};

interface EditTokenModalProps {
  token: TokenConfig | null;
  onClose: () => void;
  onSave: (token: TokenConfig) => void;
  onDelete: (address: string) => void;
}

export const EditTokenModal: React.FC<EditTokenModalProps> = ({ token, onClose, onSave, onDelete }) => {
  const [editing, setEditing] = useState<TokenConfig | null>(null);

  useEffect(() => {
    if (token) setEditing(token);
  }, [token]);

  if (!token || !editing) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h3 className="font-bold mb-4">Edit Token</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500">Symbol</label>
            <input 
              className="w-full border rounded p-2" 
              value={editing.symbol} 
              onChange={e => setEditing({ ...editing, symbol: e.target.value })} 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Decimals</label>
            <input 
              className="w-full border rounded p-2" 
              type="number" 
              value={editing.decimals} 
              onChange={e => setEditing({ ...editing, decimals: Number(e.target.value) })} 
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onSave(editing)} className="flex-1">Save</Button>
            <Button onClick={() => onDelete(editing.address)} variant="danger" icon={<Trash2 className="w-4 h-4" />}>
              Delete
            </Button>
          </div>
          <button onClick={onClose} className="w-full text-center text-xs text-slate-500 mt-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};