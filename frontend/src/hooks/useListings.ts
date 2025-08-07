/**
 * React Query hooks for listing management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserListings, 
  createListing, 
  updateListing, 
  deleteListing,
  unlistNFT,
  getUserNFTs,
  getMarketplaceListings,
  getListingDetails,
  getListingHistory,
  getMarketplaceAnalytics,
  searchListings,
  type Listing,
  type ListingCreateRequest,
  type ListingUpdateRequest
} from '@/lib/api';

// Get user's listings
export const useUserListings = (walletAddress: string) => {
  return useQuery({
    queryKey: ['listings', 'user', walletAddress],
    queryFn: () => getUserListings(walletAddress),
    enabled: !!walletAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

// Get user's NFTs (for listing creation)
export const useUserNFTs = (walletAddress: string) => {
  return useQuery({
    queryKey: ['nfts', 'user', walletAddress],
    queryFn: () => getUserNFTs(walletAddress),
    enabled: !!walletAddress,
    staleTime: 0, // Always consider data stale to allow immediate refetching
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Create listing mutation
export const useCreateListing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ListingCreateRequest) => createListing(data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch user listings - we need to invalidate all user queries
      queryClient.invalidateQueries({ queryKey: ['listings', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
    onError: (error) => {
      console.error('Failed to create listing:', error);
    },
  });
};

// Update listing mutation
export const useUpdateListing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ListingUpdateRequest) => updateListing(data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch user listings
      queryClient.invalidateQueries({ queryKey: ['listings', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
    onError: (error) => {
      console.error('Failed to update listing:', error);
    },
  });
};

// Delete listing mutation
export const useDeleteListing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listingId, walletAddress }: { listingId: string; walletAddress: string }) => deleteListing(listingId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch user listings with specific wallet address
      queryClient.invalidateQueries({ queryKey: ['listings', 'user', variables.walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'user', variables.walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
    onError: (error) => {
      console.error('Failed to delete listing:', error);
    },
  });
};

// Unlist NFT mutation (updates NFT's is_listed status)
export const useUnlistNFT = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ nftId, walletAddress }: { nftId: string; walletAddress: string }) => unlistNFT(nftId),
    onSuccess: (data, variables) => {
      // Aggressively invalidate and refetch user NFTs and listings
      queryClient.invalidateQueries({ queryKey: ['nfts', 'user', variables.walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['listings', 'user', variables.walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['nfts', 'user', variables.walletAddress] });
      queryClient.refetchQueries({ queryKey: ['listings', 'user', variables.walletAddress] });
    },
    onError: (error) => {
      console.error('Failed to unlist NFT:', error);
    },
  });
};

// Get marketplace listings
export const useMarketplaceListings = (filters: {
  category?: string;
  min_price?: number;
  max_price?: number;
  seller_username?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
} = {}) => {
  return useQuery({
    queryKey: ['listings', 'marketplace', filters],
    queryFn: () => getMarketplaceListings(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

// Get listing details
export const useListingDetails = (listingId: string | undefined) => {
  return useQuery({
    queryKey: ['listings', 'details', listingId],
    queryFn: () => getListingDetails(listingId!),
    enabled: !!listingId,
    staleTime: 60000, // 1 minute
  });
};

// Get listing history
export const useListingHistory = (listingId: string | undefined) => {
  return useQuery({
    queryKey: ['listings', 'history', listingId],
    queryFn: () => getListingHistory(listingId!),
    enabled: !!listingId,
    staleTime: 300000, // 5 minutes
  });
};

// Get marketplace analytics
export const useMarketplaceAnalytics = (timePeriod: string = '24h') => {
  return useQuery({
    queryKey: ['listings', 'analytics', timePeriod],
    queryFn: () => getMarketplaceAnalytics(timePeriod),
    staleTime: 300000, // 5 minutes
  });
};

// Search listings
export const useSearchListings = (searchQuery: string, filters: {
  category?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
} = {}) => {
  return useQuery({
    queryKey: ['listings', 'search', searchQuery, filters],
    queryFn: () => searchListings(searchQuery, filters),
    enabled: !!searchQuery && searchQuery.length > 0,
    staleTime: 30000, // 30 seconds
  });
}; 