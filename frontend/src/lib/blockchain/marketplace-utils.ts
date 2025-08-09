/**
 * Blockchain Marketplace Utilities for FraudGuard
 * Provides functions for interacting with the Sui marketplace smart contract
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { SuiObjectRef } from '@mysten/sui/client';

// Configuration
export const MARKETPLACE_PACKAGE_ID = import.meta.env.VITE_MARKETPLACE_PACKAGE_ID || "0x3f6018891c66a9844e3fe134912318341bd96dd037c1ccbfae95387fe4c5c231"; // Use deployed package ID
export const MARKETPLACE_MODULE = "marketplace";
export const MARKETPLACE_OBJECT_ID = import.meta.env.VITE_MARKETPLACE_OBJECT_ID || "0x32ba6dea827dcb5539674b1c092111a70a064ac8c9144926d67d85367777dd06"; // Use deployed marketplace object ID

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface ListingInfo {
  id: string;
  nft_id: string;
  seller_wallet_address: string;
  price: number;
  status: string;
  created_at: string;
  blockchain_metadata: Record<string, unknown>;
  is_blockchain_listing: boolean;
}

export interface ListingParams {
  nftObjectId: string;
  price: number; // in SUI
  sellerAddress: string;
}

export interface PurchaseParams {
  nftObjectId: string;
  price: number;
  buyerAddress: string;
}

export interface UnlistParams {
  nftObjectId: string;
  sellerAddress: string;
}

export interface UpdatePriceParams {
  nftObjectId: string;
  newPrice: number;
  sellerAddress: string;
}

export interface BlockchainResponse {
  success: boolean;
  transactionDigest?: string;
  error?: string;
}

/**
 * Create a transaction to list an NFT on the marketplace
 * Uses the deployed marketplace object automatically
 */
export function createListNFTTransaction(
  params: ListingParams
): Transaction {
  const tx = new Transaction();
  
  // Convert price from SUI to MIST (1 SUI = 1e9 MIST)
  const priceInMist = Math.floor(params.price * 1e9);
  
  tx.moveCall({
    target: `${MARKETPLACE_PACKAGE_ID}::${MARKETPLACE_MODULE}::list_nft`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID), // The shared marketplace object
      tx.object(params.nftObjectId), // The NFT object
      tx.pure.u64(priceInMist), // Price in MIST
    ],
  });
  
  return tx;
}

/**
 * Create a transaction to purchase an NFT from the marketplace
 */
export function createPurchaseNFTTransaction(
  params: PurchaseParams,
  paymentCoin: SuiObjectRef
): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${MARKETPLACE_PACKAGE_ID}::${MARKETPLACE_MODULE}::purchase_nft`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID), // The shared marketplace object
      tx.pure.id(params.nftObjectId), // The NFT OBJECT ID (not listing ID!)
      tx.object(paymentCoin.objectId), // The payment coin
    ],
  });
  
  return tx;
}

/**
 * Create a transaction to unlist an NFT from the marketplace
 */
export function createUnlistNFTTransaction(
  params: UnlistParams
): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${MARKETPLACE_PACKAGE_ID}::${MARKETPLACE_MODULE}::unlist_nft`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID), // The shared marketplace object
      tx.pure.id(params.nftObjectId), // The NFT OBJECT ID (not listing ID!)
    ],
  });
  
  return tx;
}

/**
 * Create a transaction to update the price of a listed NFT
 */
export function createUpdatePriceTransaction(
  params: UpdatePriceParams
): Transaction {
  const tx = new Transaction();
  
  // Convert price from SUI to MIST
  const priceInMist = Math.floor(params.newPrice * 1e9);
  
  tx.moveCall({
    target: `${MARKETPLACE_PACKAGE_ID}::${MARKETPLACE_MODULE}::update_listing_price`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID), // The shared marketplace object
      tx.pure.id(params.nftObjectId), // The NFT OBJECT ID (not listing ID!)
      tx.pure.u64(priceInMist), // New price in MIST
    ],
  });
  
  return tx;
}

/**
 * Notify backend of successful blockchain listing
 */
export async function notifyBackendListing(
  nftId: string,
  sellerWalletAddress: string,
  price: number,
  blockchainTxId: string,
  marketplaceObjectId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marketplace/blockchain/list-nft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nft_id: nftId,
        seller_wallet_address: sellerWalletAddress,
        price: price,
        blockchain_tx_id: blockchainTxId,
        marketplace_object_id: marketplaceObjectId,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.detail || 'Failed to notify backend' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying backend of listing:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Notify backend of successful blockchain purchase
 */
export async function notifyBackendPurchase(
  nftId: string,
  buyerWalletAddress: string,
  sellerWalletAddress: string,
  price: number,
  blockchainTxId: string,
  marketplaceFee: number,
  gasFee?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marketplace/blockchain/purchase-nft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nft_id: nftId,
        buyer_wallet_address: buyerWalletAddress,
        seller_wallet_address: sellerWalletAddress,
        price: price,
        blockchain_tx_id: blockchainTxId,
        marketplace_fee: marketplaceFee,
        gas_fee: gasFee,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.detail || 'Failed to notify backend' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying backend of purchase:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Notify backend of successful blockchain listing cancellation
 */
export async function notifyBackendCancellation(
  nftId: string,
  sellerWalletAddress: string,
  blockchainTxId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marketplace/blockchain/cancel-listing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nft_id: nftId,
        seller_wallet_address: sellerWalletAddress,
        blockchain_tx_id: blockchainTxId,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.detail || 'Failed to notify backend' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying backend of cancellation:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Notify backend of successful blockchain price update
 */
export async function notifyBackendPriceUpdate(
  nftId: string,
  sellerWalletAddress: string,
  newPrice: number,
  blockchainTxId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marketplace/blockchain/update-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nft_id: nftId,
        seller_wallet_address: sellerWalletAddress,
        new_price: newPrice,
        blockchain_tx_id: blockchainTxId,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.detail || 'Failed to notify backend' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying backend of price update:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get blockchain listing information from backend
 */
export async function getBlockchainListingInfo(nftId: string): Promise<{
  success: boolean;
  listing?: ListingInfo;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marketplace/blockchain/listing/${nftId}`);
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.detail || 'Failed to get listing info' };
    }
    
    return { success: true, listing: data.listing };
  } catch (error) {
    console.error('Error getting blockchain listing info:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Helper function to get user's SUI coins for payment
 */
export async function getUserSUICoins(
  suiClient: SuiClient,
  userAddress: string,
  minAmount: number
): Promise<SuiObjectRef[]> {
  const coins = await suiClient.getCoins({
    owner: userAddress,
    coinType: '0x2::sui::SUI',
  });
  
  // Filter coins that have enough balance
  const minAmountMist = Math.floor(minAmount * 1e9);
  return coins.data
    .filter(coin => parseInt(coin.balance) >= minAmountMist)
    .map(coin => ({
      objectId: coin.coinObjectId,
      version: coin.version,
      digest: coin.digest,
    }));
}

/**
 * Parse error messages from blockchain transactions
 */
export function parseBlockchainError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    
    if (typeof errorObj.toString === 'function') {
      return errorObj.toString();
    }
  }
  
  return 'Unknown blockchain error occurred';
}
