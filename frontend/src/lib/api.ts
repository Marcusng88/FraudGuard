/**
 * API client for FraudGuard backend
 * Handles all HTTP requests to the backend API
 */

export interface User {
  sui_address: string;
  display_name?: string;
  avatar_url?: string;
  is_verified: boolean;
  reputation_score: number;
}

export interface FraudFlag {
  flag_id: string;
  reason: string;
  flag_type: 'plagiarism' | 'suspicious_behavior' | 'copyright_violation' | 'fake_metadata' | 'price_manipulation';
  confidence: number;
  flagged_by_address: string;
  is_active: boolean;
  created_at: string;
}

export interface NFT {
  id: string;
  nft_id: string;
  name: string;
  description?: string;
  image_url: string;
  price_sui?: number;
  currency: string;
  threat_level: 'safe' | 'warning' | 'danger';
  confidence_score?: number;
  created_at: string;
  listed_at?: string;
  creator: User;
  owner: User;
  fraud_flags: FraudFlag[];
  has_active_flags: boolean;
}

export interface NFTDetail extends NFT {
  metadata_url?: string;
  listing_status: 'unlisted' | 'active' | 'sold' | 'cancelled';
  is_listed: boolean;
  trades: Array<{
    transaction_id: string;
    seller_address: string;
    buyer_address: string;
    price_sui: number;
    currency: string;
    trade_type: string;
    confirmed_at: string;
  }>;
}

export interface MarketplaceFilters {
  search?: string;
  threat_level?: 'safe' | 'warning' | 'danger';
  min_price?: number;
  max_price?: number;
  creator_verified?: boolean;
  page?: number;
  limit?: number;
}

export interface MarketplaceResponse {
  nfts: NFT[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface MarketplaceStats {
  total_nfts: number;
  active_listings: number;
  verified_nfts: number;
  flagged_nfts: number;
  total_volume_sui: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Marketplace endpoints
  async getMarketplaceNFTs(filters: MarketplaceFilters = {}): Promise<MarketplaceResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.threat_level) params.append('threat_level', filters.threat_level);
    if (filters.min_price !== undefined) params.append('min_price', filters.min_price.toString());
    if (filters.max_price !== undefined) params.append('max_price', filters.max_price.toString());
    if (filters.creator_verified !== undefined) params.append('creator_verified', filters.creator_verified.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/api/marketplace/nfts${queryString ? `?${queryString}` : ''}`;
    
    return this.request<MarketplaceResponse>(endpoint);
  }

  async getNFTDetails(nftId: string): Promise<NFTDetail> {
    return this.request<NFTDetail>(`/api/marketplace/nfts/${nftId}`);
  }

  async getMarketplaceStats(): Promise<MarketplaceStats> {
    return this.request<MarketplaceStats>('/api/marketplace/stats');
  }

  async getFeaturedNFTs(limit: number = 6): Promise<NFT[]> {
    return this.request<NFT[]>(`/api/marketplace/featured?limit=${limit}`);
  }

  // Health check
  async getHealth(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>('/');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
