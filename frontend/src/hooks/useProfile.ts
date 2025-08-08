import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProfile, updateUserProfile, UpdateUserProfileRequest, UserProfile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Hook for fetching user profile
export function useUserProfile(walletAddress: string) {
  return useQuery({
    queryKey: ['user-profile', walletAddress],
    queryFn: () => getUserProfile(walletAddress),
    enabled: !!walletAddress,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if user not found (404)
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message;
        if (errorMessage.includes('User not found')) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });
}

// Hook for updating user profile
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ walletAddress, profileData }: { 
      walletAddress: string; 
      profileData: UpdateUserProfileRequest 
    }) => updateUserProfile(walletAddress, profileData),
    onSuccess: (data) => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: ['user-profile', data.wallet_address] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: "destructive"
      });
    },
  });
}

// Hook for checking if user profile exists and creating a default one if needed
export function useEnsureUserProfile(walletAddress: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => getUserProfile(walletAddress),
    onSuccess: (data) => {
      // Update cache with the profile data
      queryClient.setQueryData(['user-profile', walletAddress], data);
    },
  });
}
