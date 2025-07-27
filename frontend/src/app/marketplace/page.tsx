'use client';

import React, { useState, useMemo } from 'react';
import { SearchBar } from '../../components/marketplace/SearchBar';
import { FilterSidebar } from '../../components/marketplace/FilterSidebar';
import { SortOptions, SortOption, sortNfts } from '../../components/marketplace/SortOptions';
import { NftGrid } from '../../components/nft/NftGrid';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/ui/spinner';
import { useSuiNfts } from '../../hooks/useSuiNfts';
import { NFT } from '../../types/nft';

interface FilterOptions {
    priceRange: [number, number];
    fraudRisk: 'all' | 'safe' | 'low' | 'medium';
    categories: string[];
    verified: boolean;
}

export default function MarketplacePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [filters, setFilters] = useState<FilterOptions>({
        priceRange: [0, 1000],
        fraudRisk: 'all',
        categories: [],
        verified: false,
    });

    const { nfts, loading, error } = useSuiNfts();

    // Filter and sort NFTs based on search, filters, and sort option
    const filteredNfts = useMemo(() => {
        if (!nfts) return [];

        const filtered = nfts.filter((nft: NFT) => {
            // Search filter
            if (searchQuery && !nft.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !nft.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Price filter
            const price = parseFloat(nft.price);
            if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
                return false;
            }

            // Fraud risk filter
            if (filters.fraudRisk !== 'all') {
                const fraudScore = nft.fraudFlag?.riskScore || 0;
                switch (filters.fraudRisk) {
                    case 'safe':
                        if (fraudScore > 20) return false;
                        break;
                    case 'low':
                        if (fraudScore > 50) return false;
                        break;
                    case 'medium':
                        if (fraudScore > 75) return false;
                        break;
                }
            }

            // Category filter
            if (filters.categories.length > 0 && !filters.categories.includes(nft.category)) {
                return false;
            }

            // Verified filter (for now, just skip this filter as we don't have creator verification in the types)
            // if (filters.verified && !nft.creator.verified) {
            //   return false;
            // }

            return true;
        });

        // Apply sorting
        return sortNfts(filtered, sortOption);
    }, [nfts, searchQuery, filters, sortOption]);

    const handleClearFilters = () => {
        setFilters({
            priceRange: [0, 1000],
            fraudRisk: 'all',
            categories: [],
            verified: false,
        });
        setSearchQuery('');
    };

    const handleNftClick = (nft: NFT) => {
        // Navigate to NFT details page
        window.location.href = `/marketplace/${nft.id}`;
    };

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                        Error Loading NFTs
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                        {error.message || 'Failed to load marketplace data'}
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-dark)]">
            <div className="container section-padding">
                {/* Header */}
                <div className="content-spacing text-center lg:text-left">
                    <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">
                        NFT{" "}
                        <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-purple)]">
                            Marketplace
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto lg:mx-0 font-light">
                        Discover, collect, and trade NFTs with AI-powered fraud protection and real-time risk analysis
                    </p>
                </div>

                {/* Search and Filter Controls */}
                <div className="mb-8 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <SearchBar
                                onSearch={setSearchQuery}
                                placeholder="Search NFTs, creators, or collections..."
                            />
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden"
                        >
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </Button>
                    </div>

                    {/* Results Summary and Sort Options */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                            <span>
                                {loading ? 'Loading...' : `${filteredNfts.length} NFTs found`}
                            </span>
                            {(searchQuery || filters.categories.length > 0 || filters.fraudRisk !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="text-[var(--text-secondary)] lg:hidden"
                                >
                                    Clear all filters
                                </Button>
                            )}
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <SortOptions
                                currentSort={sortOption}
                                onSortChange={setSortOption}
                                className="flex-wrap"
                            />
                            {(searchQuery || filters.categories.length > 0 || filters.fraudRisk !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="text-[var(--text-secondary)] hidden lg:block"
                                >
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters - Desktop */}
                    <div className="hidden lg:block w-80 shrink-0">
                        <FilterSidebar
                            filters={filters}
                            onFiltersChange={setFilters}
                            onClearFilters={handleClearFilters}
                        />
                    </div>

                    {/* Mobile Filters */}
                    {showFilters && (
                        <div className="lg:hidden">
                            <FilterSidebar
                                filters={filters}
                                onFiltersChange={setFilters}
                                onClearFilters={handleClearFilters}
                                className="mb-6"
                            />
                        </div>
                    )}

                    {/* NFT Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <LoadingSpinner text="Loading NFTs..." />
                        ) : (
                            <NftGrid
                                nfts={filteredNfts}
                                onNftClick={handleNftClick}
                                loading={loading}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
