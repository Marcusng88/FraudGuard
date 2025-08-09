import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Core configuration constants
export const RPC_URL = import.meta.env.VITE_SUI_RPC_URL || 'https://fullnode.devnet.sui.io:443';
export const ADMIN_PRIVATE_KEY = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
export const MARKETPLACE_PACKAGE_ID = import.meta.env.VITE_MARKETPLACE_PACKAGE_ID;
export const MARKETPLACE_ID = import.meta.env.VITE_MARKETPLACE_ID;

/**
 * Initialize SUI client
 */
export function getSuiClient(): SuiClient {
  return new SuiClient({ url: RPC_URL });
}

/**
 * Get admin keypair for transactions
 */
export function getAdminKeypair(): Ed25519Keypair {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error('Admin private key not configured');
  }
  return Ed25519Keypair.fromSecretKey(ADMIN_PRIVATE_KEY);
}

/**
 * Create a transaction block for NFT operations
 */
export function createTransactionBlock(): Transaction {
  return new Transaction();
}

/**
 * Format price from SUI to display format
 */
export function formatSuiPrice(price: string | number): string {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;
  return (priceNum / 1000000000).toFixed(9); // Convert from MIST to SUI
}

/**
 * Format price from display format to SUI (MIST)
 */
export function parseSuiPrice(price: string): number {
  return Math.floor(parseFloat(price) * 1000000000); // Convert SUI to MIST
}

/**
 * Check if environment variables are configured
 */
export function checkEnvironmentConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!MARKETPLACE_PACKAGE_ID) {
    errors.push('VITE_MARKETPLACE_PACKAGE_ID is not configured');
  }
  
  if (!MARKETPLACE_ID) {
    errors.push('VITE_MARKETPLACE_ID is not configured');
  }
  
  if (!ADMIN_PRIVATE_KEY) {
    errors.push('VITE_ADMIN_PRIVATE_KEY is not configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get object details from SUI network
 */
export async function getObjectDetails(objectId: string, client?: SuiClient) {
  const suiClient = client || getSuiClient();
  try {
    return await suiClient.getObject({
      id: objectId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      }
    });
  } catch (error) {
    console.error('Error fetching object details:', error);
    return null;
  }
}

/**
 * Execute a transaction block with retry logic
 */
export async function executeTransaction(
  transactionBlock: Transaction,
  keypair: Ed25519Keypair,
  client?: SuiClient
) {
  const suiClient = client || getSuiClient();
  
  try {
    const result = await suiClient.signAndExecuteTransaction({
      transaction: transactionBlock,
      signer: keypair,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      }
    });
    
    return result;
  } catch (error) {
    console.error('Transaction execution failed:', error);
    throw error;
  }
}

/**
 * Validate SUI address format
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Sleep utility function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(digest: string, client?: SuiClient) {
  const suiClient = client || getSuiClient();
  try {
    const result = await suiClient.getTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    return null;
  }
}

// DEPRECATED FUNCTIONS (kept for compatibility, will be removed)
// These functions use 'any' types and should be replaced with marketplace-utils.ts functions

/**
 * @deprecated Use marketplace-utils.ts functions instead
 */
export function extractListingId(transactionResult: unknown): string | null {
  console.warn('extractListingId is deprecated. Use new marketplace-utils.ts functions instead.');
  try {
    if (transactionResult && typeof transactionResult === 'object') {
      const result = transactionResult as Record<string, unknown>;
      if (result.digest && typeof result.digest === 'string') {
        return result.digest;
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting listing ID:', error);
    return null;
  }
}

/**
 * @deprecated Use marketplace-utils.ts functions instead
 */
export async function extractListingIdFromTransaction(txDigest: string, suiClient: unknown): Promise<string | null> {
  console.warn('extractListingIdFromTransaction is deprecated. Use new marketplace-utils.ts functions instead.');
  return null;
}

/**
 * @deprecated Use marketplace-utils.ts functions instead
 */
export function extractUnlistingEventData(effects: unknown): unknown | null {
  console.warn('extractUnlistingEventData is deprecated. Use new marketplace-utils.ts functions instead.');
  return null;
}

// Type definitions for compatibility (deprecated)
export interface BuyNFTParams {
  listingId: string;
  buyerAddress: string;
  priceInSui: number;
  // Additional fields for compatibility
  marketplaceId?: unknown;
  nftId?: string;
  price?: number;
  sellerAddress?: string;
}

export interface SellNFTParams {
  nftId: string;
  priceInSui?: number;
  price?: number; // Allow both for compatibility
  sellerAddress?: string; // Allow for compatibility
  buyerAddress?: string; // Allow for compatibility
}

export interface UnlistNFTParams {
  listingId: string;
  sellerAddress?: string; // Allow for compatibility
}

export interface TransactionResult {
  success: boolean;
  txId: string;
  error?: string;
  blockchainListingId?: string; // Allow for compatibility
  gasUsed?: number; // Allow for compatibility
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export async function executeBuyNFTTransaction(params: BuyNFTParams, signAndExecute?: unknown): Promise<TransactionResult> {
  console.warn('executeBuyNFTTransaction is deprecated. Use new marketplace-utils.ts functions instead.');
  return { success: false, txId: '', error: 'Function deprecated' };
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export async function executeListNFTTransaction(params: SellNFTParams, signAndExecute?: unknown): Promise<TransactionResult> {
  console.warn('executeListNFTTransaction is deprecated. Use new marketplace-utils.ts functions instead.');
  return { success: false, txId: '', error: 'Function deprecated' };
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export async function executeUnlistNFTTransaction(params: UnlistNFTParams, signAndExecute?: unknown): Promise<TransactionResult> {
  console.warn('executeUnlistNFTTransaction is deprecated. Use new marketplace-utils.ts functions instead.');
  return { success: false, txId: '', error: 'Function deprecated' };
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export async function executeEditListingTransaction(params: { listingId: string; newPrice: number }, signAndExecute?: unknown): Promise<TransactionResult> {
  console.warn('executeEditListingTransaction is deprecated. Use new marketplace-utils.ts functions instead.');
  return { success: false, txId: '', error: 'Function deprecated' };
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export function validateSufficientBalance(balance: number, required: number): boolean {
  console.warn('validateSufficientBalance is deprecated. Use new marketplace-utils.ts functions instead.');
  return balance >= required;
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export function calculateMarketplaceFee(price: number): number {
  console.warn('calculateMarketplaceFee is deprecated. Use new marketplace-utils.ts functions instead.');
  return price * 0.025; // 2.5% fee
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export function calculateSellerAmount(price: number): number {
  console.warn('calculateSellerAmount is deprecated. Use new marketplace-utils.ts functions instead.');
  return price * 0.975; // 97.5% to seller
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export function extractPurchaseEventData(effects: unknown): unknown | null {
  console.warn('extractPurchaseEventData is deprecated. Use new marketplace-utils.ts functions instead.');
  return null;
}

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 * @alias getTransactionStatus
 */
export const getTransactionDetails = getTransactionStatus;

/**
 * @deprecated Use MARKETPLACE_ID instead
 * @alias MARKETPLACE_ID
 */
export const MARKETPLACE_OBJECT_ID = MARKETPLACE_ID;

/**
 * @deprecated Use new marketplace-utils.ts functions instead
 */
export async function getUserBalance(address: string): Promise<number> {
  console.warn('getUserBalance is deprecated. Use new marketplace-utils.ts functions instead.');
  return 0;
}
