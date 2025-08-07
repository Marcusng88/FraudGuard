/**
 * React Query hooks for marketplace data fetching
 */
import { useQuery } from '@tanstack/react-query';
import { 
  getMarketplaceNFTs, 
  getNFTDetails, 
  getNFTAnalysisDetails,
  getSimilarNFTs,
  getMarketplaceStats,
  type NFT,
  type NFTDetailResponse,
  type MarketplaceResponse,
  type MarketplaceStats
} from '@/lib/api';

// Marketplace NFTs with pagination
export const useMarketplaceNFTs = (filters: { page?: number; limit?: number } = {}) => {
  return useQuery({
    queryKey: ['marketplace', 'nfts', filters],
    queryFn: () => getMarketplaceNFTs(filters.page || 1, filters.limit || 20),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

// Individual NFT details
export const useNFTDetails = (nftId: string | undefined) => {
  return useQuery({
    queryKey: ['marketplace', 'nft', nftId],
    queryFn: () => getNFTDetails(nftId!),
    enabled: !!nftId,
    staleTime: 60000, // 1 minute
  });
};

export function useNFTAnalysisDetails(nftId: string | undefined) {
  return useQuery({
    queryKey: ['nft-analysis', nftId],
    queryFn: () => getNFTAnalysisDetails(nftId!),
    enabled: !!nftId,
  });
}

export function useSimilarNFTs(nftId: string | undefined, limit: number = 5) {
  return useQuery({
    queryKey: ['similar-nfts', nftId, limit],
    queryFn: () => getSimilarNFTs(nftId!, limit),
    enabled: !!nftId,
  });
}

// Marketplace statistics
export const useMarketplaceStats = () => {
  return useQuery({
    queryKey: ['marketplace', 'stats'],
    queryFn: () => getMarketplaceStats(),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};
