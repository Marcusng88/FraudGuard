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
  initial_price?: number;
  price?: number; // Current listing price
  image_url: string;
  wallet_address: string; // Legacy field for compatibility
  creator_wallet_address?: string; // New backend field
  owner_wallet_address?: string; // New backend field
  sui_object_id?: string;
  is_fraud: boolean;
  confidence_score: number;
  flag_type?: number;
  reason?: string;
  embedding_vector?: number[]; // Vector embedding for similarity search
  evidence_url?: string; // JSON string containing array of evidence URLs
  status: string;
  created_at: string;
  is_listed?: boolean;
  listing_price?: number;
  last_listed_at?: string;
  listing_status?: string;
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

// Marketplace Statistics Interface
export interface MarketplaceStats {
  total_nfts: number;
  total_volume: number;
  average_price: number;
  fraud_detection_rate: number;
}

export interface NFTCreationRequest {
  title: string;
  description?: string;
  category?: string;
  initial_price?: number;
  image_url: string;
  creator_wallet_address: string;
  owner_wallet_address: string;
  metadata_url?: string;
  attributes?: Record<string, unknown>;
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

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const response = await fetch(`${API_BASE_URL}/api/marketplace/stats`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch marketplace stats');
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



// Phase 4: Listing Management Interfaces
export interface Listing {
  id: string;
  nft_id: string;
  seller_id: string;
  price: number;
  status: string;
  listing_id?: string;
  blockchain_tx_id?: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
  nft_title?: string;
  nft_image_url?: string;
  seller_username?: string;
}

export interface ListingCreateRequest {
  nft_id: string;
  price: number;
  expires_at?: string;
  listing_metadata?: Record<string, unknown>;
}

export interface ListingUpdateRequest {
  listing_id: string;
  price?: number;
  expires_at?: string;
  listing_metadata?: Record<string, unknown>;
}

export interface ListingHistory {
  id: string;
  listing_id: string;
  nft_id: string;
  action: string;
  old_price?: number;
  new_price?: number;
  seller_id: string;
  blockchain_tx_id?: string;
  timestamp: string;
}

export interface MarketplaceListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface MarketplaceAnalytics {
  time_period: string;
  total_listings: number;
  new_listings: number;
  total_volume: number;
  average_price: number;
  top_categories: Array<{ category: string; count: number }>;
  active_sellers: number;
  price_distribution: {
    under_10: number;
    '10_50': number;
    '50_100': number;
    over_100: number;
  };
}

// Phase 4: Listing Management API Functions
export async function getUserListings(walletAddress: string): Promise<Listing[]> {
  const response = await fetch(`${API_BASE_URL}/api/listings/user/${walletAddress}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user listings');
  }
  
  return response.json();
}

export async function getUserNFTs(walletAddress: string): Promise<{ nfts: NFT[], total: number }> {
  const response = await fetch(`${API_BASE_URL}/api/nft/user/${walletAddress}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user NFTs');
  }
  
  return response.json();
}

export async function createListing(data: ListingCreateRequest): Promise<Listing> {
  const response = await fetch(`${API_BASE_URL}/api/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create listing');
  }
  
  return response.json();
}

export async function updateListing(data: ListingUpdateRequest): Promise<Listing> {
  const response = await fetch(`${API_BASE_URL}/api/listings/${data.listing_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update listing');
  }
  
  return response.json();
}

export async function deleteListing(listingId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete listing');
  }
  
  return response.json();
}

export async function unlistNFT(nftId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/nft/${nftId}/unlist`, {
    method: 'PUT',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to unlist NFT');
  }
  
  return response.json();
}

export async function getMarketplaceListings(filters: {
  category?: string;
  min_price?: number;
  max_price?: number;
  seller_username?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<MarketplaceListingsResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/api/listings/marketplace?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch marketplace listings');
  }
  
  return response.json();
}

export async function getListingDetails(listingId: string): Promise<Listing> {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch listing details');
  }
  
  return response.json();
}

export async function getListingHistory(listingId: string): Promise<ListingHistory[]> {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/history`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch listing history');
  }
  
  return response.json();
}

export async function getMarketplaceAnalytics(timePeriod: string = '24h'): Promise<MarketplaceAnalytics> {
  const response = await fetch(`${API_BASE_URL}/api/listings/marketplace/analytics?time_period=${timePeriod}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch marketplace analytics');
  }
  
  return response.json();
}

export async function searchListings(searchQuery: string, filters: {
  category?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<Listing[]> {
  const params = new URLSearchParams({ q: searchQuery });
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/api/listings/search?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to search listings');
  }
  
  return response.json();
}
