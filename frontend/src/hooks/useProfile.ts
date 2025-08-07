import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import { 
  getUserProfile, 
  updateUserProfile, 
  uploadProfilePicture,
  type UserProfile,
  type ProfileUpdateRequest 
} from '@/lib/profile';

export function useProfile() {
  const { wallet } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!wallet?.address) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profileData = await getUserProfile(wallet.address);
      setProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  // Update profile
  const updateProfile = useCallback(async (profileData: ProfileUpdateRequest) => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const updatedProfile = await updateUserProfile(wallet.address, profileData);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  // Upload profile picture
  const uploadPicture = useCallback(async (file: File) => {
    if (!wallet?.address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await uploadProfilePicture(wallet.address, file);
      
      // Update profile with new avatar URL
      if (profile) {
        const updatedProfile = await updateUserProfile(wallet.address, {
          avatar_url: result.avatar_url
        });
        setProfile(updatedProfile);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile picture';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address, profile]);

  // Refresh profile data
  const refreshProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Initialize profile when wallet changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadPicture,
    refreshProfile,
  };
} 