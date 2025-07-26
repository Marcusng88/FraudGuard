export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null; // SUI balance
  balanceUsd: number | null;
  network: 'mainnet' | 'testnet' | 'devnet';
  walletName: string | null;
}

export interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (network: 'mainnet' | 'testnet' | 'devnet') => Promise<void>;
  refreshBalance: () => Promise<void>;
}

export interface TransactionState {
  isPending: boolean;
  error: string | null;
  success: boolean;
  txHash: string | null;
  gasEstimate: string | null;
}

export interface TransactionRequest {
  type: 'purchase' | 'mint' | 'list' | 'transfer' | 'flag';
  data: any;
  gasLimit?: string;
  gasPrice?: string;
}

export interface WalletConnection {
  name: string;
  icon: string;
  adapter: any;
  installed: boolean;
  downloadUrl?: string;
}

export interface UserProfile {
  address: string;
  displayName?: string;
  avatar?: string;
  ownedNfts: string[];
  createdNfts: string[];
  totalVolume: string;
  joinedAt: string;
  isVerified: boolean;
  fraudScore: number; // User trust score
}
