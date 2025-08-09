import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

// Pinata configuration
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload file to Pinata IPFS
 */
export async function uploadToPinata(file: File): Promise<PinataUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        project: 'FraudGuard',
        type: 'nft-image'
      }
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw new Error('Failed to upload image to IPFS');
  }
}

/**
 * Upload JSON metadata to Pinata
 */
export async function uploadMetadataToPinata(metadata: object): Promise<PinataUploadResponse> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Pinata metadata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error uploading metadata to Pinata:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

/**
 * Create IPFS URL from hash
 */
export function createIPFSUrl(hash: string): string {
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}

// Package ID loaded from environment variables
// Latest package (with escrow marketplace): 0x3f6018891c66a9844e3fe134912318341bd96dd037c1ccbfae95387fe4c5c231
// Working package (regular marketplace): 0x3d18ff48e1da5cc53bc3a9f9104b0242f44812408d212aa1f41fdde6bbbfa97a
export const PACKAGE_ID = import.meta.env.VITE_MARKETPLACE_PACKAGE_ID || '0x3f6018891c66a9844e3fe134912318341bd96dd037c1ccbfae95387fe4c5c231';
export const MARKETPLACE_OBJECT_ID = import.meta.env.VITE_MARKETPLACE_OBJECT_ID || "0x32ba6dea827dcb5539674b1c092111a70a064ac8c9144926d67d85367777dd06";

/**
 * Mint NFT transaction
 */
export function createMintNFTTransaction(
  name: string,
  description: string,
  imageUrl: string,
  recipient: string
): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::fraudguard_nft::mint_nft`,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(name))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(imageUrl))),
      tx.pure.address(recipient),
    ],
  });
  
  return tx;
}

/**
 * Get NFT events from transaction
 */
export async function getNFTEvents(client: SuiClient, digest: string) {
  try {
    const txResult = await client.getTransactionBlock({
      digest,
      options: {
        showEvents: true,
        showEffects: true,
      },
    });

    return txResult.events || [];
  } catch (error) {
    console.error('Error fetching NFT events:', error);
    return [];
  }
}

/**
 * Get current NFT object ID for a given owner
 * This is crucial after unlisting as the object ID may change
 */
export async function getCurrentNFTObjectId(
  client: SuiClient, 
  ownerAddress: string, 
  nftType: string = 'FraudGuardNFT'
): Promise<string[]> {
  try {
    // Get all NFT objects owned by the address
    const objects = await client.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${PACKAGE_ID}::fraudguard_nft::FraudGuardNFT`
      },
      options: {
        showContent: true,
        showType: true,
      }
    });

    return objects.data.map(obj => obj.data?.objectId).filter(Boolean) as string[];
  } catch (error) {
    console.error('Error fetching current NFT object IDs:', error);
    return [];
  }
}

/**
 * Check if an NFT is currently in marketplace escrow by checking marketplace dynamic fields
 * This helps determine if we should use blockchain unlisting or database-only unlisting
 */
export async function checkNFTInMarketplaceEscrow(
  client: SuiClient,
  nftObjectId: string,
  marketplaceObjectId: string = MARKETPLACE_OBJECT_ID
): Promise<{ inEscrow: boolean; error?: string }> {
  try {
    // Get the marketplace object to check its dynamic fields
    const marketplaceObject = await client.getObject({
      id: marketplaceObjectId,
      options: {
        showContent: true,
        showType: true,
      }
    });

    if (!marketplaceObject.data) {
      return { inEscrow: false, error: 'Marketplace object not found' };
    }

    // Check if the NFT object ID exists as a dynamic field in the marketplace
    // This indicates the NFT is in escrow
    try {
      const dynamicField = await client.getDynamicFieldObject({
        parentId: marketplaceObjectId,
        name: {
          type: '0x2::object::ID',
          value: nftObjectId
        }
      });
      
      // If we can fetch the dynamic field, the NFT is in escrow
      return { inEscrow: !!dynamicField.data };
    } catch (fieldError) {
      // If we can't find the dynamic field, the NFT is not in escrow
      return { inEscrow: false };
    }
  } catch (error) {
    console.error('Error checking NFT escrow status:', error);
    return { inEscrow: false, error: 'Failed to check escrow status' };
  }
}

/**
 * Refresh NFT object ID in database after blockchain operations
 */
export async function refreshNFTObjectId(
  client: SuiClient,
  nftDatabaseId: string,
  ownerAddress: string
): Promise<{ success: boolean; newObjectId?: string; error?: string }> {
  try {
    // Get all current NFT object IDs for the owner
    const currentObjectIds = await getCurrentNFTObjectId(client, ownerAddress);
    
    if (currentObjectIds.length === 0) {
      return { success: false, error: 'No NFT objects found for owner' };
    }

    // For now, we'll take the first available NFT object ID
    // In a production system, you might want to match by NFT metadata
    const newObjectId = currentObjectIds[0];

    // Update the database with the new object ID
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/nft/${nftDatabaseId}/update-object-id`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_sui_object_id: newObjectId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.detail || 'Failed to update object ID' };
    }

    return { success: true, newObjectId };
  } catch (error) {
    console.error('Error refreshing NFT object ID:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Notify backend about new NFT for fraud detection
 */
export async function notifyBackendNewNFT(nftData: {
  nftId: string;
  suiObjectId: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: string;
  transactionDigest: string;
}) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/nft/notify-minted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nft_id: nftData.nftId,
        sui_object_id: nftData.suiObjectId,
        name: nftData.name,
        description: nftData.description,
        image_url: nftData.imageUrl,
        creator: nftData.creator,
        transaction_digest: nftData.transactionDigest
      }),
    });

    if (!response.ok) {
      console.warn('Failed to notify backend for fraud detection');
    }

    return await response.json();
  } catch (error) {
    console.error('Error notifying backend:', error);
    // Don't throw error as this is not critical for minting
  }
}
