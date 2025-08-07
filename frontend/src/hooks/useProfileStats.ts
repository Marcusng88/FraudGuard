import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import { getUserStats, type ProfileStats } from '@/lib/profile';

export function useProfileStats() {
  const { wallet } = useWallet();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile stats
  const fetchStats = useCallback(async () => {
    if (!wallet?.address) {
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const statsData = await getUserStats(wallet.address);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile stats');
      console.error('Error fetching profile stats:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  // Refresh stats
  const refreshStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  // Initialize stats when wallet changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
} 