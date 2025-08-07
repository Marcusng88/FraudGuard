/**
 * Profile API functions for FraudGuard
 * Handles all profile-related HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UserProfile {
  id: string;
  wallet_address: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  is_public: boolean;
  reputation_score: number;
  profile_completion: number;
  created_at: string;
  updated_at?: string;
  total_nfts: number;
  total_sales: number;
  total_volume: number;
  profile_views: number;
}

export interface ProfileUpdateRequest {
  username?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  is_public?: boolean;
}

export interface ProfileStats {
  total_nfts: number;
  active_listings: number;
  total_sales: number;
  profile_views: number;
  reputation_score: number;
  join_date: string;
  profile_completion: number;
}

export interface ProfileActivity {
  id: string;
  activity_type: string;
  nft_id?: string;
  listing_id?: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Profile API Functions
export async function getUserProfile(walletAddress: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/listings/user/${walletAddress}/profile`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user profile');
  }
  
  return response.json();
}

export async function updateUserProfile(walletAddress: string, profileData: ProfileUpdateRequest): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/listings/user/${walletAddress}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user profile');
  }
  
  return response.json();
}

export async function uploadProfilePicture(walletAddress: string, file: File): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await fetch(`${API_BASE_URL}/api/listings/user/${walletAddress}/avatar`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload profile picture');
  }
  
  return response.json();
}

export async function getUserStats(walletAddress: string): Promise<ProfileStats> {
  const response = await fetch(`${API_BASE_URL}/api/listings/user/${walletAddress}/profile`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user stats');
  }
  
  const profile = await response.json();
  
  return {
    total_nfts: profile.total_nfts || 0,
    active_listings: 0, // TODO: Implement active listings count
    total_sales: profile.total_sales || 0,
    profile_views: profile.profile_views || 0,
    reputation_score: profile.reputation_score || 0,
    join_date: profile.created_at,
    profile_completion: profile.profile_completion || 0,
  };
}

export async function getUserActivity(walletAddress: string, limit: number = 10): Promise<ProfileActivity[]> {
  // TODO: Implement user activity endpoint
  // For now, return empty array
  return [];
}

export async function getUserNFTs(walletAddress: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/nft/user/${walletAddress}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user NFTs');
  }
  
  return response.json();
}

// Utility functions
export function calculateProfileCompletion(profile: UserProfile): number {
  const fields = [
    profile.username,
    profile.bio,
    profile.location,
    profile.avatar_url
  ];
  
  const completedFields = fields.filter(field => field && field.trim() !== '').length;
  return (completedFields / fields.length) * 100;
}

export function formatProfileCompletion(completion: number): string {
  if (completion >= 100) return 'Complete';
  if (completion >= 75) return 'Almost Complete';
  if (completion >= 50) return 'Half Complete';
  if (completion >= 25) return 'Getting Started';
  return 'Just Started';
}

export function getProfileCompletionColor(completion: number): string {
  if (completion >= 100) return 'text-green-500';
  if (completion >= 75) return 'text-blue-500';
  if (completion >= 50) return 'text-yellow-500';
  if (completion >= 25) return 'text-orange-500';
  return 'text-red-500';
} 