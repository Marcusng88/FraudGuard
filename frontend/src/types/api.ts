import { NFT, NFTFilters } from './nft';
import { FraudAnalysis, FraudReport } from './fraud';
import { MarketplaceStats, MarketplaceActivity } from './marketplace';

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// NFT API endpoints
export interface GetNftsRequest {
  filters?: NFTFilters;
  page?: number;
  limit?: number;
}

export interface GetNftsResponse extends PaginatedResponse<NFT> {}

export interface GetNftResponse extends ApiResponse<NFT> {}

export interface CreateNftRequest {
  name: string;
  description: string;
  imageData: string; // base64 or IPFS hash
  price: string;
  category: string;
  attributes: any[];
}

export interface CreateNftResponse extends ApiResponse<{ nftId: string; txHash: string }> {}

// Fraud API endpoints
export interface GetFraudAnalysisRequest {
  nftId: string;
}

export interface GetFraudAnalysisResponse extends ApiResponse<FraudAnalysis> {}

export interface SubmitFraudReportRequest {
  nftId: string;
  reason: string;
  description: string;
  evidence?: string;
}

export interface SubmitFraudReportResponse extends ApiResponse<{ reportId: string }> {}

// Marketplace API endpoints
export interface GetMarketplaceStatsResponse extends ApiResponse<MarketplaceStats> {}

export interface GetMarketplaceActivityRequest {
  page?: number;
  limit?: number;
  type?: string;
}

export interface GetMarketplaceActivityResponse extends PaginatedResponse<MarketplaceActivity> {}

// Transaction API endpoints
export interface PurchaseNftRequest {
  nftId: string;
  buyerAddress: string;
  txData: any;
}

export interface PurchaseNftResponse extends ApiResponse<{ txHash: string }> {}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Backend health check
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    ai_agent: boolean;
    blockchain: boolean;
  };
}
