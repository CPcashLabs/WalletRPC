
import { ChainConfig, SafeContracts } from './types';

// --- Safe Configuration ---

export const DEFAULT_SAFE_CONFIG: SafeContracts = {
  proxyFactory: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
  singleton: "0x3E5c63644E683549055b9Be8653de26E0B4CD36E",
  fallbackHandler: "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4"
};

export const CHAIN_SAFE_CONFIGS: Record<number, SafeContracts> = {
  // BTT Donau Testnet
  1029: {
    proxyFactory: "0xa7b8d2fF03627b353694e870eA07cE21C29DccF0",
    singleton: "0x91fC153Addb1dAB12FDFBa7016CFdD24345D354b",
    fallbackHandler: "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4"
  }
};

export const getSafeConfig = (chainId: number): SafeContracts => {
  return CHAIN_SAFE_CONFIGS[chainId] || DEFAULT_SAFE_CONFIG;
};

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const SENTINEL_OWNERS = "0x0000000000000000000000000000000000000001";

// --- ABIs ---

export const SAFE_ABI = [
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 nonce) view returns (bytes32)",
  "function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
  "function addOwnerWithThreshold(address owner, uint256 _threshold)",
  "function removeOwner(address prevOwner, address owner, uint256 _threshold)",
  "function changeThreshold(uint256 _threshold)"
];

export const PROXY_FACTORY_ABI = [
  "function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "event ProxyCreation(address indexed proxy, address indexed singleton)"
];

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// --- Default Chains ---

export const DEFAULT_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    defaultRpcUrl: 'https://eth.llamarpc.com',
    currencySymbol: 'ETH',
    explorerUrl: 'https://etherscan.io',
    chainType: 'EVM',
    tokens: [
      { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    ]
  },
  {
    id: 56,
    name: 'BNB Smart Chain',
    defaultRpcUrl: 'https://binance.llamarpc.com',
    currencySymbol: 'BNB',
    explorerUrl: 'https://bscscan.com',
    chainType: 'EVM',
    tokens: [
      { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
    ]
  },
  {
    id: 1029,
    name: 'BTT Donau Testnet',
    defaultRpcUrl: 'https://pre-rpc.bt.io/',
    currencySymbol: 'BTT',
    explorerUrl: 'https://testnet.bttcscan.com',
    chainType: 'EVM',
    tokens: [
      { symbol: 'USDT_b', name: 'USDT (BSC)', address: '0x834982c9B0690ED7CA35e10b18887C26c25CdC82', decimals: 6 },
      { symbol: 'USDT_t', name: 'USDT (TRON)', address: '0x6d96aeae27af0cafc53f4f0ad1e27342f384d56d', decimals: 6 },
      { symbol: 'USDT_e', name: 'USDT (ETH)', address: '0xDf095861F37466986F70942468f7601F7098D712', decimals: 6 }
    ],
    isTestnet: true
  },
  {
    id: 728126428,
    name: 'Tron Mainnet',
    defaultRpcUrl: 'https://api.trongrid.io',
    currencySymbol: 'TRX',
    explorerUrl: 'https://tronscan.org',
    chainType: 'TRON',
    tokens: [
      { symbol: 'USDT', name: 'Tether USD', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 }
    ]
  },
  {
    id: 2494104990,
    name: 'Tron Nile Testnet',
    defaultRpcUrl: 'https://nile.trongrid.io',
    currencySymbol: 'TRX',
    explorerUrl: 'https://nile.tronscan.org',
    chainType: 'TRON',
    isTestnet: true,
    tokens: [
        { symbol: 'USDT', name: 'Tether USD (BTT)', address: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj', decimals: 6 }
    ]
  }
];
