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
  embedding_vector?: number[]; // Vector embedding for similarity search
  evidence_url?: string; // JSON string containing array of evidence URLs
  status: string;
  created_at: string;
}

// Analysis Details Interface
export interface AnalysisDetails {
  llm_decision?: {
    reason?: string;
    is_fraud?: boolean;
    flag_type?: number;
    recommendation?: string;
    confidence_score?: number;
    primary_concerns?: string[];
  };
  image_analysis?: {
    risk_level?: string;
    description?: string;
    color_palette?: string[];
    artistic_style?: string;
    recommendation?: string;
    fraud_indicators?: Record<string, unknown>;
    uniqueness_score?: number;
    quality_assessment?: string;
    key_visual_elements?: string[];
    overall_fraud_score?: number;
    composition_analysis?: string;
    artistic_merit?: string;
    technical_quality?: string;
    market_value_assessment?: string;
    confidence_in_analysis?: number;
    additional_notes?: string;
  };
  metadata_analysis?: {
    analysis?: string;
    metadata_risk?: number;
    quality_score?: number;
    suspicious_indicators?: string[];
  };
  analysis_timestamp?: string;
  similarity_results?: {
    is_duplicate?: boolean;
    similar_nfts?: Array<{
      nft_id: string;
      metadata: {
        name: string;
        creator: string;
        image_url: string;
      };
      similarity: number;
    }>;
    max_similarity?: number;
    similarity_count?: number;
    evidence_urls?: string[];
  };
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
  fraud_analysis: {
    is_fraud: boolean;
    confidence_score: number;
    flag_type?: number;
    reason?: string;
  };
  status: string;
  next_step: string;
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
  const response = await fetch(`${API_BASE_URL}/api/marketplace/nfts?page=${page}&limit=${limit}`);

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

export async function getNFTAnalysisDetails(nftId: string): Promise<{
  nft_id: string;
  analysis_details: AnalysisDetails;
  is_fraud: boolean;
  confidence_score: number;
  flag_type?: number;
  reason?: string;
  status: string;
  analyzed_at?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/nft/${nftId}/analysis`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch NFT analysis details');
  }

  return response.json();
}

export async function getSimilarNFTs(nftId: string, limit: number = 5): Promise<{
  similar_nfts: Array<{
    nft_id: string;
    title: string;
    image_url: string;
    wallet_address: string;
    similarity: number;
  }>;
  total: number;
  target_nft_id: string;
  target_nft_title: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/nft/${nftId}/similar?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch similar NFTs');
  }

  return response.json();
}
