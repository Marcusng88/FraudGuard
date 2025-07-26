export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string; // in SUI
  priceUsd?: number;
  owner: string;
  creator: string;
  category: NFTCategory;
  attributes?: NFTAttribute[];
  createdAt: string;
  updatedAt: string;
  fraudFlag?: FraudFlag;
  isListed: boolean;
  transactionHistory?: Transaction[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'string' | 'number' | 'boost_percentage' | 'boost_number' | 'date';
}

export interface Transaction {
  id: string;
  type: 'mint' | 'sale' | 'transfer' | 'list';
  from: string;
  to: string;
  price?: string;
  timestamp: string;
  txHash: string;
}

export interface FraudFlag {
  id: string;
  nftId: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  detectionType: FraudDetectionType[];
  description: string;
  aiExplanation: string;
  flaggedAt: string;
  similarNfts?: string[]; // NFT IDs of similar images
}

export type NFTCategory = 
  | 'art'
  | 'gaming'
  | 'music'
  | 'photography'
  | 'sports'
  | 'utility'
  | 'pfp'
  | 'collectibles'
  | 'other';

export type FraudDetectionType = 
  | 'plagiarism'
  | 'suspicious_minting'
  | 'price_manipulation'
  | 'wash_trading'
  | 'duplicate_content';

export interface NFTFilters {
  category?: NFTCategory;
  priceMin?: number;
  priceMax?: number;
  riskLevel?: 'safe' | 'all' | 'risky';
  sortBy?: 'price_asc' | 'price_desc' | 'created_desc' | 'created_asc' | 'popular';
  search?: string;
}

export interface CreateNFTData {
  name: string;
  description: string;
  image: File;
  price: string;
  category: NFTCategory;
  attributes: NFTAttribute[];
}
