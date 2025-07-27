'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface FilterOptions {
  priceRange: [number, number];
  fraudRisk: 'all' | 'safe' | 'low' | 'medium';
  categories: string[];
  verified: boolean;
}

interface FilterSidebarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
  className?: string;
}

const categories = [
  'Art', 'Gaming', 'Music', 'Photography', 'Sports', 'Collectibles', 'Virtual Worlds', 'Utility'
];

const fraudRiskOptions = [
  { value: 'all', label: 'All NFTs', color: 'default' },
  { value: 'safe', label: 'Safe Only', color: 'success' },
  { value: 'low', label: 'Low Risk', color: 'info' },
  { value: 'medium', label: 'Include Medium Risk', color: 'warning' },
];

export function FilterSidebar({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  className 
}: FilterSidebarProps) {
  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilter('categories', newCategories);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Filters</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearFilters}
          className="text-[var(--text-secondary)]"
        >
          Clear All
        </Button>
      </div>

      {/* Price Range */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-sm">Price Range (SUI)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange[0]}
              onChange={(e) => updateFilter('priceRange', [Number(e.target.value), filters.priceRange[1]])}
              className="w-full px-2 py-1 text-sm bg-white/5 border border-[var(--border)] rounded"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange[1]}
              onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], Number(e.target.value)])}
              className="w-full px-2 py-1 text-sm bg-white/5 border border-[var(--border)] rounded"
            />
          </div>
        </CardContent>
      </Card>

      {/* Fraud Risk */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-sm">Fraud Risk Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fraudRiskOptions.map((option) => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="fraudRisk"
                value={option.value}
                checked={filters.fraudRisk === option.value}
                onChange={(e) => updateFilter('fraudRisk', e.target.value)}
                className="text-[var(--primary-blue)]"
              />
              <Badge variant={option.color as any} size="sm">
                {option.label}
              </Badge>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-sm">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category) => (
              <label key={category} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="rounded"
                />
                <span className="text-sm text-[var(--text-primary)]">{category}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verified Only */}
      <Card variant="glass">
        <CardContent className="pt-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.verified}
              onChange={(e) => updateFilter('verified', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-[var(--text-primary)]">Verified creators only</span>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
