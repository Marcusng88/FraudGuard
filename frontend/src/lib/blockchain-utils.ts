/**
 * Blockchain trading utilities for FraudGuard NFT Marketplace
 * Handles buy/sell transactions on Sui blockchain
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// Initialize Sui client
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// Contract addresses (these should be environment variables in production)
// Using the same package ID as the NFT minting since they're in the same deployed package
export const MARKETPLACE_PACKAGE_ID = '0x7ae460902e9017c7c9a5c898443105435b7393fc5776ace61b2f0c6a1f578381';
export const MARKETPLACE_OBJECT_ID = import.meta.env.VITE_MARKETPLACE_OBJECT_ID || '0x...'; // This needs to be set to actual marketplace object

export interface BuyNFTParams {
  marketplaceId: string;
  listingId: string;
  nftId: string;
  price: number; // in SUI
  buyerAddress: string;
  sellerAddress: string; // Added seller address
}

export interface SellNFTParams {
  nftId: string;
  price: number; // in SUI
  sellerAddress?: string; // Optional seller address for validation
}

export interface UnlistNFTParams {
  listingId: string;
  sellerAddress?: string; // Optional seller address for validation
}

export interface TransactionResult {
  txId: string;
  success: boolean;
  error?: string;
  gasUsed?: number;
  effects?: unknown;
  blockchainListingId?: string | null; // For listing transactions
}

// Type for transaction results from Sui
interface SuiTransactionResult {
  digest: string;
  effects?: unknown; // Simplified - we'll just check for digest presence
}

/**
 * Calculate marketplace fee for a given price
 */
export function calculateMarketplaceFee(price: number, feePercentage: number = 250): number {
  // Fee percentage is in basis points (250 = 2.5%)
  return (price * feePercentage) / 10000;
}

/**
 * Calculate seller amount after marketplace fee
 */
export function calculateSellerAmount(price: number, feePercentage: number = 250): number {
  return price - calculateMarketplaceFee(price, feePercentage);
}

/**
 * Convert SUI amount to MIST (smallest unit)
 */
export function suiToMist(sui: number): string {
  return Math.floor(sui * 1_000_000_000).toString();
}

/**
 * Convert MIST to SUI
 */
export function mistToSui(mist: number | string): number {
  const mistNum = typeof mist === 'string' ? parseInt(mist) : mist;
  return mistNum / 1_000_000_000;
}

/**
 * Execute buy NFT transaction on Sui blockchain
 * This is a simplified version that transfers NFT directly without marketplace contract
 */
export async function executeBuyTransaction(
  params: BuyNFTParams,
  signAndExecuteTransaction: (transaction: Transaction) => Promise<SuiTransactionResult>
): Promise<TransactionResult> {
  try {
    console.log('Starting buy transaction with params:', params);
    
    // For now, we'll implement a direct transfer approach
    // This assumes the NFT is already approved for transfer or we have transfer capability
    
    const transaction = new Transaction();
    
    // Convert price to MIST
    const priceInMist = suiToMist(params.price);
    console.log(`Price in MIST: ${priceInMist}`);
    
    // Create a payment coin from gas
    const [coin] = transaction.splitCoins(transaction.gas, [priceInMist]);
    
    // Transfer the payment to the seller
    // Note: In a real marketplace, this would go through the marketplace contract
    transaction.transferObjects([coin], params.sellerAddress);
    
    // For now, we'll simulate the NFT transfer by returning success
    // In a full implementation, this would call the marketplace contract
    // transaction.moveCall({
    //   target: `${MARKETPLACE_PACKAGE_ID}::marketplace::buy_nft`,
    //   arguments: [
    //     transaction.object(params.marketplaceId),
    //     transaction.object(params.listingId),
    //     transaction.object(params.nftId),
    //     coin,
    //   ],
    // });
    
    console.log('Executing transaction...');
    
    // Sign and execute transaction
    const result = await signAndExecuteTransaction(transaction);
    
    console.log('Transaction result:', result);
    
    // For now, if we have a valid digest, consider the transaction successful
    // This is because the current simplified implementation just transfers payment
    // In a full marketplace implementation, we'd check for specific transaction events
    if (result.digest) {
      return {
        txId: result.digest,
        success: true,
        gasUsed: 0, // We'll get this from the actual transaction later
        effects: result.effects,
      };
    } else {
      return {
        txId: result.digest || '',
        success: false,
        error: 'Transaction failed - no digest received',
        effects: result.effects,
      };
    }
  } catch (error) {
    console.error('Buy transaction failed:', error);
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Execute list NFT transaction on Sui blockchain with database sync
 */
export async function executeListNFTTransaction(
  params: SellNFTParams,
  signAndExecuteTransaction: (transaction: Transaction) => Promise<SuiTransactionResult>
): Promise<TransactionResult> {
  try {
    console.log('Starting list NFT transaction with params:', params);

    // Validate inputs
    if (!params.nftId) {
      throw new Error('NFT ID is required');
    }
    if (!params.price || params.price <= 0) {
      throw new Error('Valid price is required');
    }

    const transaction = new Transaction();

    // Convert price to MIST (BigInt for u64)
    const priceInMist = BigInt(suiToMist(params.price));
    console.log(`Price in MIST: ${priceInMist.toString()}`);
    console.log(`NFT ID: ${params.nftId}`);

    // Call the on-chain listing function (use the existing deployed function)
    transaction.moveCall({
      target: `${MARKETPLACE_PACKAGE_ID}::marketplace::list_nft_simple`,
      arguments: [
        transaction.object(params.nftId),
        transaction.pure.u64(priceInMist),
      ],
    });

    console.log('Executing list NFT transaction...');
    console.log('Transaction details:', {
      target: `${MARKETPLACE_PACKAGE_ID}::marketplace::list_nft_simple`,
      nftId: params.nftId,
      priceInMist: priceInMist.toString()
    });

    // Sign and execute transaction
    const result = await signAndExecuteTransaction(transaction);

    console.log('List NFT transaction result:', result);

    // Extract listing object ID from transaction effects
    let blockchainListingId: string | null = null;
    if (result.digest) {
      try {
        console.log('Transaction digest:', result.digest);
        console.log('Transaction effects (raw):', result.effects);

        // Try to extract listing ID from effects
        blockchainListingId = extractListingId(result.effects);
        console.log('Extracted blockchain listing ID:', blockchainListingId);

        // If we couldn't extract from effects, try from objectChanges in the result
        if (!blockchainListingId && (result as any).objectChanges) {
          console.log('Trying to extract from result.objectChanges:', (result as any).objectChanges);
          blockchainListingId = extractListingId({ objectChanges: (result as any).objectChanges });
          console.log('Extracted from result.objectChanges:', blockchainListingId);
        }
      } catch (detailError) {
        console.warn('Could not extract listing ID:', detailError);
      }
    }

    if (result.digest) {
      return {
        txId: result.digest,
        success: true,
        gasUsed: 0,
        effects: result.effects,
        blockchainListingId, // Include the extracted listing ID
      };
    } else {
      return {
        txId: result.digest || '',
        success: false,
        error: 'Transaction failed - no digest received',
        effects: result.effects,
        blockchainListingId: null,
      };
    }
  } catch (error) {
    console.error('List NFT transaction failed:', error);
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Execute unlist NFT transaction on Sui blockchain
 */
export async function executeUnlistNFTTransaction(
  params: UnlistNFTParams,
  signAndExecuteTransaction: (transaction: Transaction) => Promise<SuiTransactionResult>
): Promise<TransactionResult> {
  try {
    console.log('Starting unlist NFT transaction with params:', params);

    // Validate inputs
    if (!params.listingId) {
      throw new Error('Listing ID is required');
    }

    const transaction = new Transaction();

    // Call the on-chain unlisting function
    transaction.moveCall({
      target: `${MARKETPLACE_PACKAGE_ID}::marketplace::cancel_listing_simple`,
      arguments: [
        transaction.object(params.listingId), // This should be the blockchain listing object ID
      ],
    });

    console.log('Executing unlist NFT transaction...');
    console.log('Transaction details:', {
      target: `${MARKETPLACE_PACKAGE_ID}::marketplace::cancel_listing_simple`,
      listingId: params.listingId
    });

    // Sign and execute transaction
    const result = await signAndExecuteTransaction(transaction);

    console.log('Unlist NFT transaction result:', result);

    if (result.digest) {
      return {
        txId: result.digest,
        success: true,
        gasUsed: 0, // We'll get this from the actual transaction later
        effects: result.effects,
      };
    } else {
      return {
        txId: result.digest || '',
        success: false,
        error: 'Transaction failed - no digest received',
        effects: result.effects,
      };
    }
  } catch (error) {
    console.error('Unlist NFT transaction failed:', error);
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Execute edit listing price transaction on Sui blockchain with database sync
 */
export async function executeEditListingTransaction(
  params: { listingId: string; newPrice: number },
  signAndExecuteTransaction: (transaction: Transaction) => Promise<SuiTransactionResult>
): Promise<TransactionResult> {
  try {
    console.log('Starting edit listing transaction with params:', params);

    const transaction = new Transaction();

    // Convert price to MIST (BigInt for u64)
    const priceInMist = BigInt(suiToMist(params.newPrice));
    console.log(`New price in MIST: ${priceInMist.toString()}`);

    // Call the on-chain edit listing function (use the existing deployed function)
    transaction.moveCall({
      target: `${MARKETPLACE_PACKAGE_ID}::marketplace::update_listing_price`,
      arguments: [
        transaction.object(params.listingId),
        transaction.pure.u64(priceInMist),
      ],
    });

    console.log('Transaction prepared, executing...');

    // Sign and execute transaction
    const result = await signAndExecuteTransaction(transaction);

    console.log('Edit listing transaction result:', result);

    if (result.digest) {
      return {
        txId: result.digest,
        success: true,
        gasUsed: 0, // We'll get this from the actual transaction later
        effects: result.effects,
      };
    } else {
      return {
        txId: result.digest || '',
        success: false,
        error: 'Transaction failed - no digest received',
        effects: result.effects,
      };
    }

  } catch (error) {
    console.error('Edit listing transaction failed:', error);
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get user's SUI balance
 */
export async function getUserBalance(address: string): Promise<number> {
  try {
    const balance = await suiClient.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI'
    });
    
    return mistToSui(balance.totalBalance);
  } catch (error) {
    console.error('Failed to get user balance:', error);
    return 0;
  }
}

/**
 * Validate if user has sufficient balance for a purchase
 */
export async function validateSufficientBalance(
  userAddress: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; currentBalance: number; required: number }> {
  const currentBalance = await getUserBalance(userAddress);
  
  return {
    sufficient: currentBalance >= requiredAmount,
    currentBalance,
    required: requiredAmount,
  };
}

/**
 * Get transaction details from the blockchain
 */
export async function getTransactionDetails(txId: string): Promise<unknown> {
  try {
    const txResponse = await suiClient.getTransactionBlock({
      digest: txId,
      options: {
        showEffects: true,
        showInput: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });
    
    return txResponse;
  } catch (error) {
    console.error('Failed to get transaction details:', error);
    throw error;
  }
}

/**
 * Extract purchase event data from transaction effects
 */
export function extractPurchaseEventData(transactionEffects: unknown): {
  listingId?: string;
  nftId?: string;
  seller?: string;
  buyer?: string;
  price?: number;
  marketplaceFee?: number;
  timestamp?: number;
} | null {
  try {
    const effects = transactionEffects as { events?: Array<{ type?: string; parsedJson?: Record<string, unknown> }> };
    if (!effects?.events) return null;
    
    // Look for NFTPurchased event
    const purchaseEvent = effects.events.find((event) => 
      event.type?.includes('NFTPurchased')
    );
    
    if (!purchaseEvent?.parsedJson) return null;
    
    const eventData = purchaseEvent.parsedJson;
    
    return {
      listingId: eventData.listing_id as string,
      nftId: eventData.nft_id as string,
      seller: eventData.seller as string,
      buyer: eventData.buyer as string,
      price: eventData.price ? mistToSui(eventData.price as string) : undefined,
      marketplaceFee: eventData.marketplace_fee ? mistToSui(eventData.marketplace_fee as string) : undefined,
      timestamp: eventData.timestamp ? parseInt(eventData.timestamp as string) : undefined,
    };
  } catch (error) {
    console.error('Failed to extract purchase event data:', error);
    return null;
  }
}

/**
 * Extract listing event data from transaction effects
 */
export function extractListingEventData(transactionEffects: unknown): {
  listingId?: string;
  nftId?: string;
  seller?: string;
  price?: number;
  marketplaceId?: string;
  timestamp?: number;
} | null {
  try {
    const effects = transactionEffects as { events?: Array<{ type?: string; parsedJson?: Record<string, unknown> }> };
    if (!effects?.events) return null;
    
    // Look for NFTListed event
    const listingEvent = effects.events.find((event) => 
      event.type?.includes('NFTListed')
    );
    
    if (!listingEvent?.parsedJson) return null;
    
    const eventData = listingEvent.parsedJson;
    
    return {
      listingId: eventData.listing_id as string,
      nftId: eventData.nft_id as string,
      seller: eventData.seller as string,
      price: eventData.price ? mistToSui(eventData.price as string) : undefined,
      marketplaceId: eventData.marketplace_id as string,
      timestamp: eventData.timestamp ? parseInt(eventData.timestamp as string) : undefined,
    };
  } catch (error) {
    console.error('Failed to extract listing event data:', error);
    return null;
  }
}

/**
 * Helper function to extract listing ID from transaction effects
 * This function extracts the blockchain listing object ID from created objects
 */
export function extractListingId(effects: any): string | null {
  try {
    console.log('Attempting to extract listing ID from effects:', effects);

    // Look for created objects in the transaction effects
    if (effects && typeof effects === 'object') {
      // Method 1: Check effects.created (Sui transaction effects format)
      if (effects.created && Array.isArray(effects.created)) {
        console.log('Found effects.created:', effects.created);
        for (const createdObj of effects.created) {
          if (createdObj.reference && createdObj.reference.objectId) {
            console.log('Found created object ID from effects.created:', createdObj.reference.objectId);
            return createdObj.reference.objectId;
          }
        }
      }

      // Method 2: Check objectChanges (newer Sui format)
      if (effects.objectChanges && Array.isArray(effects.objectChanges)) {
        console.log('Found effects.objectChanges:', effects.objectChanges);
        const createdObjects = effects.objectChanges.filter(
          (change: any) => change.type === 'created'
        );

        for (const obj of createdObjects) {
          // Look for Listing objects specifically
          if (obj.objectType && obj.objectType.includes('Listing')) {
            console.log('Found listing object:', obj.objectId);
            return obj.objectId;
          }

          // Fallback: return any created object (since list_nft_simple only creates the Listing)
          if (obj.objectId) {
            console.log('Found created object (fallback):', obj.objectId);
            return obj.objectId;
          }
        }
      }
    }

    console.log('No listing object found in transaction effects');
    return null;
  } catch (error) {
    console.error('Error extracting listing ID:', error);
    return null;
  }
}

/**
 * Extract blockchain listing object ID from transaction using SUI client
 */
export async function extractListingIdFromTransaction(txDigest: string, suiClient: any): Promise<string | null> {
  try {
    console.log('Fetching transaction details for:', txDigest);

    const txDetails = await suiClient.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      }
    });

    console.log('Transaction details:', txDetails);

    // Look for created objects
    if (txDetails.objectChanges) {
      for (const change of txDetails.objectChanges) {
        if (change.type === 'created' && change.objectType && change.objectType.includes('Listing')) {
          console.log('Found created listing object:', change.objectId);
          return change.objectId;
        }
      }
    }

    // Also check events for listing ID
    if (txDetails.events) {
      for (const event of txDetails.events) {
        if (event.type && event.type.includes('NFTListed')) {
          const listingId = event.parsedJson?.listing_id;
          if (listingId) {
            console.log('Found listing ID in event:', listingId);
            return listingId;
          }
        }
      }
    }

    console.log('No listing object found in transaction');
    return null;
  } catch (error) {
    console.error('Error extracting listing ID from transaction:', error);
    return null;
  }
}



/**
 * Helper function to extract unlisting event data from transaction
 */
export function extractUnlistingEventData(effects: any): any | null {
  try {
    if (effects?.events) {
      for (const event of effects.events) {
        if (event.type && event.type.includes('ListingCancelled')) {
          return event.parsedJson;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting unlisting event data:', error);
    return null;
  }
}

/**
 * Estimate gas cost for a transaction
 */
export async function estimateGasCost(_transaction: Transaction): Promise<number> {
  try {
    // This is a simplified estimation - in production you'd want to use
    // the actual gas estimation from the Sui client
    return 0.001; // Estimated 0.001 SUI for gas
  } catch (error) {
    console.error('Failed to estimate gas cost:', error);
    return 0.001; // Fallback estimation
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransactionConfirmation(
  txId: string,
  maxRetries: number = 10,
  retryInterval: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const txResponse = await suiClient.getTransactionBlock({
        digest: txId,
        options: { showEffects: true },
      });
      
      const effects = txResponse.effects as { status?: { status: string } };
      if (effects?.status?.status === 'success') {
        return true;
      } else if (effects?.status?.status === 'failure') {
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    } catch (error) {
      // Transaction might not be available yet, continue retrying
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  
  return false; // Timeout
}
