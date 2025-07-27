'use client';

import React from 'react';
import { NFT } from '../../types/nft';
import { NftCard } from './NftCard';
import { SkeletonGrid } from '../ui/skeleton';

interface NftGridProps {
  nfts: NFT[];
  loading?: boolean;
  onNftClick?: (nft: NFT) => void;
  className?: string;
}

export function NftGrid({ nfts, loading, onNftClick, className }: NftGridProps) {
  if (loading) {
    return <SkeletonGrid />;
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          No NFTs Found
        </h3>
        <p className="text-[var(--text-secondary)]">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {nfts.map((nft) => (
        <NftCard
          key={nft.id}
          nft={nft}
          onClick={() => onNftClick?.(nft)}
        />
      ))}
    </div>
  );
}
