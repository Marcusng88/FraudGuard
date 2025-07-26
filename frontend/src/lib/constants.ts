// App Constants
export const APP_CONFIG = {
  name: 'FraudGuard',
  description: 'Trade NFTs with Confidence - AI-powered fraud detection',
  version: '1.0.0',
  urls: {
    website: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    api: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    docs: 'https://docs.fraudguard.com',
    github: 'https://github.com/fraudguard/fraudguard',
  },
};

// Sui Network Configuration
export const SUI_CONFIG = {
  network: (process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'testnet',
  rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
  packageId: process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || '',
  explorerUrl: 'https://explorer.sui.io',
};

// Fraud Detection Thresholds
export const FRAUD_THRESHOLDS = {
  safe: { min: 0, max: 30 },
  warning: { min: 31, max: 70 },
  danger: { min: 71, max: 100 },
};

// NFT Categories
export const NFT_CATEGORIES = [
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'photography', label: 'Photography', icon: '📸' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'utility', label: 'Utility', icon: '🔧' },
  { value: 'pfp', label: 'PFP', icon: '👤' },
  { value: 'collectibles', label: 'Collectibles', icon: '🏆' },
  { value: 'other', label: 'Other', icon: '📦' },
] as const;

// Supported Wallets
export const SUPPORTED_WALLETS = [
  {
    name: 'Sui Wallet',
    icon: '/icons/sui-wallet.svg',
    downloadUrl: 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
  },
  {
    name: 'Ethos Wallet',
    icon: '/icons/ethos-wallet.svg',
    downloadUrl: 'https://chrome.google.com/webstore/detail/ethos-sui-wallet/mcbigmjiafegjnnogedioegffbooigli',
  },
  {
    name: 'Suiet Wallet',
    icon: '/icons/suiet-wallet.svg',
    downloadUrl: 'https://chrome.google.com/webstore/detail/suiet/khpkpbbcccdmmclmpigdgddabeilkdpd',
  },
] as const;

// API Endpoints
export const API_ENDPOINTS = {
  // NFTs
  nfts: '/api/nfts',
  nftById: (id: string) => `/api/nfts/${id}`,
  createNft: '/api/nfts/create',
  
  // Marketplace
  marketplace: '/api/marketplace',
  marketplaceStats: '/api/marketplace/stats',
  marketplaceActivity: '/api/marketplace/activity',
  
  // Fraud Detection
  fraudAnalysis: (nftId: string) => `/api/fraud/analysis/${nftId}`,
  fraudReport: '/api/fraud/report',
  
  // Transactions
  purchase: '/api/transactions/purchase',
  mint: '/api/transactions/mint',
  
  // Health
  health: '/api/health',
} as const;

// UI Constants
export const UI_CONFIG = {
  // Pagination
  defaultPageSize: 20,
  maxPageSize: 100,
  
  // Images
  placeholderImage: '/images/nft-placeholder.svg',
  errorImage: '/images/nft-error.svg',
  
  // Timeouts
  toastDuration: 5000,
  connectionTimeout: 10000,
  
  // Breakpoints (matching Tailwind)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
  
  // Animation durations (ms)
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  theme: 'fraudguard-theme',
  walletPreference: 'fraudguard-wallet',
  userPreferences: 'fraudguard-preferences',
  recentSearches: 'fraudguard-recent-searches',
  dismissedWarnings: 'fraudguard-dismissed-warnings',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Network errors
  networkError: 'Network error. Please check your connection.',
  rpcError: 'Unable to connect to Sui network.',
  
  // Wallet errors
  walletNotInstalled: 'Wallet not installed. Please install a supported wallet.',
  walletConnectionFailed: 'Failed to connect wallet. Please try again.',
  walletRejected: 'Transaction was rejected by wallet.',
  insufficientBalance: 'Insufficient balance for this transaction.',
  
  // API errors
  apiError: 'Server error. Please try again later.',
  unauthorized: 'Unauthorized access.',
  notFound: 'Resource not found.',
  
  // Validation errors
  invalidAddress: 'Invalid wallet address.',
  invalidPrice: 'Invalid price format.',
  invalidImage: 'Invalid image file.',
  
  // General errors
  unknownError: 'An unknown error occurred.',
} as const;
