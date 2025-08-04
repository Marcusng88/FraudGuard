/**
 * API client for FraudGuard backend
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
  wallet_address: string;
  username?: string;
  avatar_url?: string;
  reputation_score: number;
}

export interface NFT {
  id: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  image_url: string;
  wallet_address: string;
  sui_object_id?: string;
  is_fraud: boolean;
  confidence_score: number;
  flag_type?: number;
  reason?: string;
  status: string;
  created_at: string;
}

export interface NFTCreationRequest {
  title: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  wallet_address: string;
}

export interface CreateNFTResponse {
  success: boolean;
  message: string;
  nft_id: string;
  analysis_status: string;
}

export interface ConfirmMintResponse {
  success: boolean;
  message: string;
  nft_id: string;
  sui_object_id: string;
}

export interface MarketplaceResponse {
  nfts: NFT[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface NFTDetailResponse {
  nft: NFT;
  owner: User;
}

// API Functions
export async function createNFT(nftData: NFTCreationRequest): Promise<CreateNFTResponse> {
  const response = await fetch(`${API_BASE_URL}/api/nft/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(nftData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create NFT');
  }

  return response.json();
}

export async function confirmNFTMint(nftId: string, suiObjectId: string): Promise<ConfirmMintResponse> {
  const response = await fetch(`${API_BASE_URL}/api/nft/${nftId}/confirm-mint?sui_object_id=${suiObjectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to confirm NFT mint');
  }

  return response.json();
}

export async function getMarketplaceNFTs(page: number = 1, limit: number = 20): Promise<MarketplaceResponse> {
  const response = await fetch(`${API_BASE_URL}/api/nft/marketplace?page=${page}&limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch marketplace NFTs');
  }

  return response.json();
}

export async function getNFTDetails(nftId: string): Promise<NFTDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/nft/${nftId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch NFT details');
  }

  return response.json();
}
