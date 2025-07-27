'use client';

import { useState, useEffect } from 'react';
import { NFT } from '../types/nft';
import { mockNfts } from '../lib/mockData';

interface UseSuiNftsReturn {
  nfts: NFT[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}



export function useSuiNfts(): UseSuiNftsReturn {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNfts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For now, use mock data
      setNfts(mockNfts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch NFTs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNfts();
  }, []);

  return {
    nfts,
    loading,
    error,
    refetch: fetchNfts,
  };
}