import { NFT, NFTFilters } from './nft';

export interface MarketplaceStats {
  totalNfts: number;
  totalVolume: string; // in SUI
  totalVolumeUsd: number;
  fraudPrevented: number;
  activeUsers: number;
  averagePrice: string;
}

export interface MarketplaceState {
  nfts: NFT[];
  featuredNfts: NFT[];
  isLoading: boolean;
  error: string | null;
  filters: NFTFilters;
  stats: MarketplaceStats;
  hasMore: boolean;
  page: number;
}

export interface PurchaseRequest {
  nftId: string;
  price: string;
  buyerAddress: string;
}

export interface ListNFTRequest {
  nftId: string;
  price: string;
  sellerAddress: string;
}

export interface MarketplaceActivity {
  id: string;
  type: 'sale' | 'listing' | 'fraud_detected' | 'mint';
  nftId: string;
  nftName: string;
  nftImage: string;
  userAddress: string;
  price?: string;
  timestamp: string;
  fraudInfo?: {
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
  };
}
