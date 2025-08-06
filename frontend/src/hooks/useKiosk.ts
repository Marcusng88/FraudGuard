/**
 * React Query hooks for kiosk management
 * Phase 1.1: Kiosk Management Functions
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createKiosk, 
  getUserKiosk, 
  checkKioskOwnership,
  type KioskResponse,
  type KioskOwnershipResponse
} from '@/lib/api';

// Get user's kiosk information
export const useUserKiosk = (walletAddress: string | undefined) => {
  return useQuery({
    queryKey: ['kiosk', 'user', walletAddress],
    queryFn: () => getUserKiosk(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // Refetch every 10 minutes
  });
};

// Check kiosk ownership
export const useKioskOwnership = (walletAddress: string | undefined, kioskId: string | undefined) => {
  return useQuery({
    queryKey: ['kiosk', 'ownership', walletAddress, kioskId],
    queryFn: () => checkKioskOwnership(walletAddress!, kioskId!),
    enabled: !!walletAddress && !!kioskId,
    staleTime: 60000, // 1 minute
  });
};

// Create kiosk mutation
export const useCreateKiosk = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (walletAddress: string) => createKiosk(walletAddress),
    onSuccess: (data, walletAddress) => {
      // Invalidate and refetch user kiosk data
      queryClient.invalidateQueries({ queryKey: ['kiosk', 'user', walletAddress] });
      
      // Update the cache with the new kiosk data
      queryClient.setQueryData(['kiosk', 'user', walletAddress], data);
    },
    onError: (error) => {
      console.error('Failed to create kiosk:', error);
    },
  });
};

// Hook to ensure user has a kiosk (automatic creation if needed)
export const useEnsureKiosk = (walletAddress: string | undefined) => {
  const { data: kiosk, isLoading, error } = useUserKiosk(walletAddress);
  const createKioskMutation = useCreateKiosk();
  
  const ensureKiosk = async () => {
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    
    // If user doesn't have a kiosk, create one
    if (!kiosk) {
      return createKioskMutation.mutateAsync(walletAddress);
    }
    
    return kiosk;
  };
  
  return {
    kiosk,
    isLoading: isLoading || createKioskMutation.isPending,
    error: error || createKioskMutation.error,
    ensureKiosk,
    isCreating: createKioskMutation.isPending,
  };
}; 