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

// Package ID from successful deployment
export const PACKAGE_ID = '0xc641fa0c43224cf06fa7ca433d80641a93adb98f1679036de6dc6088714752ed';

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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/nft/notify-minted`, {
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
