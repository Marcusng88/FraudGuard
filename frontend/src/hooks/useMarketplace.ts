/**
 * React Query hooks for marketplace data fetching
 */
import { useQuery } from '@tanstack/react-query';
import { getMarketplaceNFTs, getNFTDetails } from '@/lib/api';

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

// Marketplace statistics (mock for now)
export const useMarketplaceStats = () => {
  return useQuery({
    queryKey: ['marketplace', 'stats'],
    queryFn: () => Promise.resolve({
      total_nfts: 0,
      active_listings: 0,
      verified_nfts: 0,
      flagged_nfts: 0,
      total_volume_sui: 0,
    }),
    staleTime: 60000, // 1 minute
  });
};
