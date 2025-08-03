/**
 * React Query hooks for marketplace data fetching
 */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import apiClient, { MarketplaceFilters, NFT, NFTDetail, MarketplaceStats } from '@/lib/api';

// Query keys
export const marketplaceKeys = {
  all: ['marketplace'] as const,
  nfts: () => [...marketplaceKeys.all, 'nfts'] as const,
  nft: (id: string) => [...marketplaceKeys.all, 'nft', id] as const,
  stats: () => [...marketplaceKeys.all, 'stats'] as const,
  featured: () => [...marketplaceKeys.all, 'featured'] as const,
  filtered: (filters: MarketplaceFilters) => [...marketplaceKeys.nfts(), filters] as const,
};

// Marketplace NFTs with filters
export const useMarketplaceNFTs = (filters: MarketplaceFilters = {}) => {
  return useQuery({
    queryKey: marketplaceKeys.filtered(filters),
    queryFn: () => apiClient.getMarketplaceNFTs(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

// Individual NFT details
export const useNFTDetails = (nftId: string | undefined) => {
  return useQuery({
    queryKey: marketplaceKeys.nft(nftId || ''),
    queryFn: () => apiClient.getNFTDetails(nftId!),
    enabled: !!nftId,
    staleTime: 60000, // 1 minute
  });
};

// Marketplace statistics
export const useMarketplaceStats = () => {
  return useQuery({
    queryKey: marketplaceKeys.stats(),
    queryFn: () => apiClient.getMarketplaceStats(),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
};

// Featured NFTs
export const useFeaturedNFTs = (limit: number = 6) => {
  return useQuery({
    queryKey: [...marketplaceKeys.featured(), limit],
    queryFn: () => apiClient.getFeaturedNFTs(limit),
    staleTime: 300000, // 5 minutes
  });
};

// Health check
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.getHealth(),
    staleTime: 30000,
    refetchInterval: 60000,
  });
};
