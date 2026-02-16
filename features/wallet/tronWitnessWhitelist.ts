export interface TronWitnessWhitelistItem {
  address: string;
  name: string;
  website?: string;
  description?: string;
  isActive: boolean;
}

// Static, local-only list to remain RPC-only and backend-free.
export const TRON_WITNESS_WHITELIST: TronWitnessWhitelistItem[] = [
  {
    address: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn',
    name: 'TRON DAO',
    website: 'https://trondao.org',
    description: 'Default witness option',
    isActive: true
  },
  {
    address: 'TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp',
    name: 'Binance Staking',
    description: 'Commonly used witness option',
    isActive: true
  },
  {
    address: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
    name: 'Poloniex',
    description: 'Alternative witness option',
    isActive: true
  }
];
