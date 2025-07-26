import { createNetworkConfig, SuiClientProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { SUI_CONFIG } from './constants';

// Network configuration for Sui
const { networkConfig, useNetworkVariable } = createNetworkConfig({
  devnet: {
    url: getFullnodeUrl('devnet'),
  },
  testnet: {
    url: getFullnodeUrl('testnet'),
  },
  mainnet: {
    url: getFullnodeUrl('mainnet'),
  },
});

export { networkConfig, useNetworkVariable };

// Package object IDs (will be set after deployment)
export const PACKAGE_ID = SUI_CONFIG.network === 'mainnet' 
  ? process.env.NEXT_PUBLIC_MAINNET_PACKAGE_ID || ''
  : process.env.NEXT_PUBLIC_TESTNET_PACKAGE_ID || '';

// Contract function names
export const CONTRACT_FUNCTIONS = {
  // Marketplace functions
  LIST_NFT: 'list_nft',
  BUY_NFT: 'buy_nft',
  CANCEL_LISTING: 'cancel_listing',
  
  // NFT functions
  MINT_NFT: 'mint_nft',
  TRANSFER_NFT: 'transfer_nft',
  
  // Fraud flag functions
  CREATE_FRAUD_FLAG: 'create_fraud_flag',
  UPDATE_FRAUD_FLAG: 'update_fraud_flag',
} as const;

// Object types
export const OBJECT_TYPES = {
  NFT: `${PACKAGE_ID}::nft::NFT`,
  MARKETPLACE: `${PACKAGE_ID}::marketplace::Marketplace`,
  LISTING: `${PACKAGE_ID}::marketplace::Listing`,
  FRAUD_FLAG: `${PACKAGE_ID}::fraud::FraudFlag`,
} as const;

// Gas budget for different operations
export const GAS_BUDGET = {
  MINT_NFT: 10_000_000, // 0.01 SUI
  LIST_NFT: 5_000_000,  // 0.005 SUI
  BUY_NFT: 10_000_000,  // 0.01 SUI
  TRANSFER: 3_000_000,  // 0.003 SUI
  FRAUD_FLAG: 5_000_000, // 0.005 SUI
} as const;

// Helper function to get explorer URL for transaction
export function getExplorerUrl(txHash: string, network: string = SUI_CONFIG.network): string {
  return `${SUI_CONFIG.explorerUrl}/txblock/${txHash}?network=${network}`;
}

// Helper function to get explorer URL for object
export function getObjectExplorerUrl(objectId: string, network: string = SUI_CONFIG.network): string {
  return `${SUI_CONFIG.explorerUrl}/object/${objectId}?network=${network}`;
}

// Helper function to get explorer URL for address
export function getAddressExplorerUrl(address: string, network: string = SUI_CONFIG.network): string {
  return `${SUI_CONFIG.explorerUrl}/address/${address}?network=${network}`;
}
