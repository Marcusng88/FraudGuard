import React, { useState, useMemo } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Grid3X3, List, Shield, AlertTriangle, Eye, Loader2, Plus, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { useMarketplaceNFTs, useMarketplaceStats } from '@/hooks/useMarketplace';
import { useMarketplaceListings, useMarketplaceAnalytics } from '@/hooks/useListings';
import { useWallet } from '@/hooks/useWallet';
import { ListingManager } from '@/components/ListingManager';

const Marketplace = () => {
  const { wallet, connect } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('browse');

  // Build filters for API call
  const filters = useMemo(() => ({
    page: currentPage,
    limit: 20,
  }), [currentPage]);

  // Fetch marketplace data
  const { data: marketplaceData, isLoading, error, refetch } = useMarketplaceNFTs(filters);
  const { data: stats } = useMarketplaceStats();
  
  // Fetch marketplace listings
  const { data: listingsData, isLoading: listingsLoading } = useMarketplaceListings({
    limit: 20,
    offset: (currentPage - 1) * 20
  });
  
  // Fetch marketplace analytics
  const { data: analytics } = useMarketplaceAnalytics('24h');

  // Handle search change with debouncing
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Filter options with real counts from stats
  const filterOptions = useMemo(() => [
    { 
      label: 'All', 
      value: 'all', 
      count: stats?.total_nfts || 0 
    },
    { 
      label: 'Safe', 
      value: 'safe', 
      count: stats?.verified_nfts || 0 
    },
    { 
      label: 'Warning', 
      value: 'warning', 
      count: (stats?.active_listings || 0) - (stats?.verified_nfts || 0) - (stats?.flagged_nfts || 0)
    },
    { 
      label: 'Flagged', 
      value: 'danger', 
      count: stats?.flagged_nfts || 0 
    }
  ], [stats]);

  // Filter NFTs based on current criteria
  const filteredNFTs = useMemo(() => {
    let nfts = marketplaceData?.nfts || [];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      nfts = nfts.filter(nft => 
        nft.title.toLowerCase().includes(search) ||
        (nft.description && nft.description.toLowerCase().includes(search)) ||
        nft.category.toLowerCase().includes(search)
      );
    }
    
    // Apply safety filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'safe') {
        nfts = nfts.filter(nft => !nft.is_fraud && nft.confidence_score >= 0.8);
      } else if (selectedFilter === 'warning') {
        nfts = nfts.filter(nft => !nft.is_fraud && nft.confidence_score < 0.8);
      } else if (selectedFilter === 'danger') {
        nfts = nfts.filter(nft => nft.is_fraud);
      }
    }
    
    return nfts;
  }, [marketplaceData?.nfts, searchTerm, selectedFilter]);

  const totalPages = marketplaceData?.total_pages || 1;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Floating warning icon */}
      <FloatingWarningIcon />
      
      {/* Navigation */}
      <CyberNavigation />
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Main headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Explore
                <br />
                <span className="text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  Marketplace
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Discover verified NFTs with AI-powered fraud protection. Trade with confidence.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
              {[
                {
                  icon: Shield,
                  title: 'Verified NFTs',
                  value: stats?.verified_nfts || 0,
                  color: 'text-primary'
                },
                {
                  icon: Eye,
                  title: 'Under Review',
                  value: (stats?.active_listings || 0) - (stats?.verified_nfts || 0) - (stats?.flagged_nfts || 0),
                  color: 'text-secondary'
                },
                {
                  icon: AlertTriangle,
                  title: 'Flagged Items',
                  value: stats?.flagged_nfts || 0,
                  color: 'text-destructive'
                },
                {
                  icon: TrendingUp,
                  title: 'Active Listings',
                  value: analytics?.total_listings || 0,
                  color: 'text-success'
                }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="glass-panel p-6 group hover-glow">
                    <div className="flex items-center justify-center mb-4">
                      <Icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{stat.value}</h3>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Content */}
      <div className="container mx-auto px-6 pb-16">
        {/* Tabs for Browse and My Listings */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Marketplace</TabsTrigger>
            <TabsTrigger 
              value="my-listings"
              className={!wallet?.address ? "opacity-60" : ""}
            >
              My Listings
              {!wallet?.address && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Connect Wallet
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="mt-6">
            {/* Search and Filters */}
            <section className="mb-12">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search NFTs, creators..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 glass-input bg-card/20 border-border/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Filters and View Toggle */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                {filterOptions.map((option) => {
                  const isActive = selectedFilter === option.value;
                  
                  const getButtonStyle = () => {
                    if (isActive) {
                      return 'bg-gradient-to-r from-primary to-secondary text-primary-foreground border border-primary/30 shadow-glow';
                    }
                    
                    switch (option.value) {
                      case 'safe':
                        return 'bg-card/20 border border-success/30 text-success hover:bg-success/5 hover:border-success/50';
                      case 'warning':
                        return 'bg-card/20 border border-warning/30 text-warning hover:bg-warning/5 hover:border-warning/50';
                      case 'danger':
                        return 'bg-card/20 border border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50';
                      default:
                        return 'bg-card/20 border border-border/30 text-foreground hover:bg-card/30';
                    }
                  };
                 
                  return (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange(option.value)}
                      className={`gap-2 transition-all duration-300 ${getButtonStyle()}`}
                    >
                      {option.label}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          isActive 
                            ? 'bg-primary/20 border-primary/50 text-primary-foreground' 
                            : option.value === 'safe'
                            ? 'bg-success/10 border-success/30 text-success'
                            : option.value === 'warning'
                            ? 'bg-warning/10 border-warning/30 text-warning'
                            : option.value === 'danger'
                            ? 'bg-destructive/10 border-destructive/30 text-destructive'
                            : 'bg-muted/20 border-border/30'
                        }`}
                      >
                        {option.count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`transition-all duration-300 ${
                    viewMode === 'grid' 
                      ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground border border-primary/30 shadow-glow' 
                      : 'bg-card/20 border border-border/30 text-foreground hover:bg-card/30'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`transition-all duration-300 ${
                    viewMode === 'list' 
                      ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground border border-primary/30 shadow-glow' 
                      : 'bg-card/20 border border-border/30 text-foreground hover:bg-card/30'
                  }`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading NFTs...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive mb-4">Failed to load marketplace NFTs</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* NFT Grid */}
        {!isLoading && !error && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-foreground">Available NFTs</h2>
              <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
              <Badge variant="outline" className="text-sm">
                {marketplaceData?.total || 0} items
              </Badge>
            </div>
            
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {filteredNFTs.map((nft) => (
                <NftCard
                  key={nft.id}
                  nft={nft}
                />
              ))}
            </div>

            {filteredNFTs.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No NFTs found matching your criteria.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="bg-card/20 border-border/30"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-card/20 border-border/30"
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="bg-card/20 border-border/30"
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        )}
          </TabsContent>
          
          <TabsContent value="my-listings" className="mt-6">
            {wallet?.address ? (
              <ListingManager />
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Connect Your Wallet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your wallet to view and manage your NFT listings. You'll be able to create new listings, edit existing ones, and track your sales.
                </p>
                <Button 
                  onClick={connect}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-8 py-3 text-lg"
                  size="lg"
                >
                  Connect Wallet
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Marketplace;
