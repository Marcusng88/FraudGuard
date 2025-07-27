'use client';

import React from 'react';
import { Button } from '../ui/button';

export type SortOption = 
  | 'newest'
  | 'oldest'
  | 'price-low'
  | 'price-high'
  | 'fraud-safe'
  | 'fraud-risky'
  | 'name-az'
  | 'name-za';

interface SortOptionsProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

const sortOptions: Array<{ value: SortOption; label: string; icon: string }> = [
  { value: 'newest', label: 'Newest First', icon: '🆕' },
  { value: 'oldest', label: 'Oldest First', icon: '📅' },
  { value: 'price-low', label: 'Price: Low to High', icon: '💰' },
  { value: 'price-high', label: 'Price: High to Low', icon: '💎' },
  { value: 'fraud-safe', label: 'Safest First', icon: '🛡️' },
  { value: 'fraud-risky', label: 'Riskiest First', icon: '⚠️' },
  { value: 'name-az', label: 'Name: A to Z', icon: '🔤' },
  { value: 'name-za', label: 'Name: Z to A', icon: '🔤' },
];

export function SortOptions({ currentSort, onSortChange, className }: SortOptionsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <span className="text-sm text-[var(--text-secondary)] flex items-center mr-2">
        Sort by:
      </span>
      {sortOptions.map((option) => (
        <Button
          key={option.value}
          variant={currentSort === option.value ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onSortChange(option.value)}
          className="text-xs"
        >
          <span className="mr-1">{option.icon}</span>
          {option.label}
        </Button>
      ))}
    </div>
  );
}

// Utility function to sort NFTs
export function sortNfts<T extends {
  name: string;
  price: string;
  createdAt: string;
  fraudFlag?: { riskScore: number } | null;
}>(nfts: T[], sortOption: SortOption): T[] {
  const sorted = [...nfts];

  switch (sortOption) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    case 'price-low':
      return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    case 'price-high':
      return sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    
    case 'fraud-safe':
      return sorted.sort((a, b) => {
        const aScore = a.fraudFlag?.riskScore || 0;
        const bScore = b.fraudFlag?.riskScore || 0;
        return aScore - bScore;
      });
    
    case 'fraud-risky':
      return sorted.sort((a, b) => {
        const aScore = a.fraudFlag?.riskScore || 0;
        const bScore = b.fraudFlag?.riskScore || 0;
        return bScore - aScore;
      });
    
    case 'name-az':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    
    case 'name-za':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    
    default:
      return sorted;
  }
}
