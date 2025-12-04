
import React from 'react';
import { PluginManifest } from './types';

// In a real scenario, this list would be fetched from a remote JSON API (e.g., raw.githubusercontent.com/hub/manifest.json)
// The 'component' import would be a dynamic import from a URL or a git submodule build artifact.

export const MARKETPLACE_MANIFEST: PluginManifest[] = [
  {
    id: 'co-pouch',
    name: 'CoPouch',
    version: '1.0.0',
    description: 'Shared treasury management for groups. Create colorful, multi-signature pouches on BTT Chain for friends and teams.',
    author: 'BitTorrent DAO',
    repoUrl: 'github.com/zerostate/co-pouch',
    iconName: 'piggy-bank',
    category: 'Utility'
  },
  {
    id: 'evm-wallet',
    name: 'Nexus Vault',
    version: '2.0.0',
    description: 'Unified EOA and Gnosis Safe MultiSig manager. Send assets, manage safes, and deploy new treasuries on any EVM chain.',
    author: 'BlockHub Core',
    repoUrl: 'github.com/blockhub/evm-wallet',
    iconName: 'wallet',
    category: 'Utility'
  },
  {
    id: 'vanity-gen',
    name: 'Identity Forge',
    version: '1.2.0',
    description: 'Offline BIP39 Mnemonic generator and high-performance Vanity Address miner (EVM/BTC/TRX).',
    author: 'Crypto Utils',
    repoUrl: 'github.com/crypto-utils/identity-forge',
    iconName: 'key',
    category: 'Utility'
  },
  {
    id: 'hello-world',
    name: 'Hello World Example',
    version: '1.0.0',
    description: 'A sample plugin demonstrating the minimal structure for a Hub application.',
    author: 'Hub Team',
    repoUrl: 'github.com/zerostate-hub/hello-world',
    iconName: 'zap',
    category: 'Utility'
  }
];

// This registry simulates the "System Loader" that knows how to find the code for a given ID.
// In a real web-based plugin system, this might use `import(url)` or SystemJS.
const COMPONENT_REGISTRY: Record<string, () => Promise<{ default: React.ComponentType<any> }>> = {
  'hello-world': () => import('./modules/HelloWorld'),
  'evm-wallet': () => import('./modules/EvmWallet'),
  'vanity-gen': () => import('./modules/VanityGen'),
  'co-pouch': () => import('./modules/CoPouch')
};

export const loadPluginComponent = (pluginId: string) => {
  const loader = COMPONENT_REGISTRY[pluginId];
  if (!loader) {
    throw new Error(`Plugin ${pluginId} not found in local registry.`);
  }
  return React.lazy(loader);
};
