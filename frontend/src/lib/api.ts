/**
 * API client for FraudGuard backend
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  listing_id?: string; // Blockchain listing object ID for buy transactions
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
  flagged_nfts?: number;
  threats_blocked?: number;
  detection_accuracy?: number;
  analyzed_nfts?: number;
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
  listing?: Listing; // Include listing information for listed NFTs
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

export interface ConfirmResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// Listing confirmation functions (following NFT minting pattern)
export async function confirmListing(listingId: string, blockchainTxId: string, blockchainListingId?: string, gasFee?: number): Promise<ConfirmResponse> {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/confirm-listing`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      listing_id: listingId,
      blockchain_tx_id: blockchainTxId,
      blockchain_listing_id: blockchainListingId,
      gas_fee: gasFee
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to confirm listing');
  }

  return response.json();
}

export async function confirmUnlisting(listingId: string, blockchainTxId: string, gasFee?: number): Promise<ConfirmResponse> {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/confirm-unlisting`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      listing_id: listingId,
      blockchain_tx_id: blockchainTxId,
      gas_fee: gasFee
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to confirm unlisting');
  }

  return response.json();
}

export async function confirmEditListing(listingId: string, newPrice: number, blockchainTxId: string, gasFee?: number): Promise<ConfirmResponse> {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/confirm-edit-listing`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      listing_id: listingId,
      new_price: newPrice,
      blockchain_tx_id: blockchainTxId,
      gas_fee: gasFee
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to confirm edit listing');
  }

  return response.json();
}

// Blockchain-first listing creation
export async function createListingWithBlockchain(data: {
  nft_id: string;
  price: number;
  blockchain_listing_id: string;
  blockchain_tx_id: string;
  gas_fee?: number;
}): Promise<ConfirmResponse> {
  const response = await fetch(`${API_BASE_URL}/api/listings/create-with-blockchain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create listing with blockchain data');
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

export async function getFraudDetectionStats(): Promise<{
  total_analyzed: number;
  total_flagged: number;
  detection_accuracy: number;
  protection_rate: number;
  recent_threats_30d: number;
  recent_threats_7d: number;
  ai_uptime: number;
  high_confidence_detections: number;
  threat_prevention_score: number;
  value_protected: number;
}> {
  const response = await fetch(`${API_BASE_URL}/api/marketplace/fraud-stats`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch fraud detection stats');
  }

  return response.json();
}

export async function getRecentFraudAlerts(limit: number = 3): Promise<{
  alerts: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    timestamp: string;
    nft_id: string;
    confidence_score: number;
    nft_title: string;
  }>;
  total: number;
}> {
  const response = await fetch(`${API_BASE_URL}/api/marketplace/recent-alerts?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch recent fraud alerts');
  }

  return response.json();
}

export async function getRecentNFTsWithAnalysis(limit: number = 3): Promise<{
  nfts: NFT[];
  total: number;
}> {
  const response = await fetch(`${API_BASE_URL}/api/marketplace/recent-nfts-with-analysis?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch recent NFTs with analysis');
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
  listing_metadata?: Record<string, unknown>; // Added to match backend response
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

export async function notifyNFTListed(notification: {
  nft_id: string;
  listing_id?: string;
  transaction_digest: string;
  price: number;
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/nft/notify-listed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to notify NFT listing');
  }

  return response.json();
}

export async function notifyNFTUnlisted(notification: {
  nft_id: string;
  listing_id?: string;
  transaction_digest: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/nft/notify-unlisted`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to notify NFT unlisting');
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

// Blockchain Transaction Interfaces
export interface BlockchainTransactionCreate {
  blockchain_tx_id: string;
  listing_id: string;
  nft_blockchain_id: string;
  seller_wallet_address: string;
  buyer_wallet_address: string;
  price: number;
  marketplace_fee: number;
  seller_amount: number;
  gas_fee?: number;
  transaction_type?: string;
}

export interface BlockchainTransactionResponse {
  blockchain_tx_id: string;
  status: string;
  price: number;
  marketplace_fee: number;
  seller_amount: number;
  gas_fee?: number;
  created_at: string;
  transaction_type: string;
}

export interface TransactionHistory {
  id: string;
  blockchain_tx_id: string;
  listing_id: string;
  nft_blockchain_id: string;
  seller_wallet_address: string;
  buyer_wallet_address: string;
  price: number;
  marketplace_fee: number;
  seller_amount: number;
  gas_fee?: number;
  transaction_type: string;
  status: string;
  created_at: string;
}

// Blockchain transaction API functions
export async function recordBlockchainTransaction(transaction: BlockchainTransactionCreate): Promise<BlockchainTransactionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/transactions/blockchain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transaction),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to record blockchain transaction');
  }

  return response.json();
}

export async function getTransactionStatus(txId: string): Promise<BlockchainTransactionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/transactions/blockchain/${txId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get transaction status');
  }

  return response.json();
}

// Check if an NFT is currently listed for sale in the database
export async function checkNFTListingStatus(nftId: string): Promise<{
  is_listed: boolean;
  listing?: Listing;
  price?: number;
  seller_address?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/listings/nft/${nftId}/active`);

    if (!response.ok) {
      // If 404, it means no active listing exists
      if (response.status === 404) {
        return {
          is_listed: false,
          listing: undefined,
          price: undefined,
          seller_address: undefined
        };
      }
      
      const error = await response.json();
      throw new Error(error.detail || 'Failed to check NFT listing status');
    }

    const listingData = await response.json();
    
    // Transform the response to match the expected format
    return {
      is_listed: true,
      listing: {
        id: listingData.id,
        nft_id: listingData.nft_id,
        seller_id: listingData.seller_wallet_address, // Map seller_wallet_address to seller_id
        price: listingData.price,
        status: listingData.status,
        listing_metadata: listingData.listing_metadata,
        created_at: listingData.created_at,
        updated_at: listingData.updated_at,
      },
      price: listingData.price,
      seller_address: listingData.seller_wallet_address
    };
  } catch (error) {
    // If it's a network error or parsing error, handle gracefully
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server');
    }
    throw error;
  }
}

export async function getUserTransactions(
  walletAddress: string,
  options: {
    transaction_type?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  transactions: TransactionHistory[];
  total: number;
  limit: number;
  offset: number;
}> {
  const params = new URLSearchParams();
  
  if (options.transaction_type) params.append('transaction_type', options.transaction_type);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  const response = await fetch(`${API_BASE_URL}/api/transactions/user/${walletAddress}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get user transactions');
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

// Profile Management Interfaces
export interface UserProfile {
  id: string;
  wallet_address: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
  reputation_score: number;
  created_at: string;
  updated_at?: string;
}

export interface UpdateUserProfileRequest {
  username?: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
}

// Profile Management API Functions
export async function getUserProfile(walletAddress: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/listings/user/${walletAddress}/profile`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get user profile');
  }

  return response.json();
}

export async function updateUserProfile(
  walletAddress: string,
  profileData: UpdateUserProfileRequest
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/listings/user/${walletAddress}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user profile');
  }

  return response.json();
}
