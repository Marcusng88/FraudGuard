import React, { useState, useMemo } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Grid3X3, List, Shield, AlertTriangle, Eye, Loader2, Plus, DollarSign, Clock, TrendingUp, Target } from 'lucide-react';
import { useMarketplaceNFTs, useMarketplaceStats, useFraudDetectionStats } from '@/hooks/useMarketplace';
import { useMarketplaceListings, useMarketplaceAnalytics } from '@/hooks/useListings';
import { useWallet } from '@/hooks/useWallet';

const Marketplace = () => {
  const { wallet, connect } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Build filters for API call
  const filters = useMemo(() => ({
    page: currentPage,
    limit: 20,
  }), [currentPage]);

  // Fetch marketplace data
  const { data: marketplaceData, isLoading, error, refetch } = useMarketplaceNFTs(filters);
  const { data: stats, isLoading: statsLoading } = useMarketplaceStats();
  const { data: fraudStats, isLoading: fraudStatsLoading } = useFraudDetectionStats();
  
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

  // Filter options with real counts from NFT data
  const filterOptions = useMemo(() => {
    const nfts = marketplaceData?.nfts || [];
    
    const safeCount = nfts.filter(nft => !nft.is_fraud && nft.confidence_score >= 0.8).length;
    const warningCount = nfts.filter(nft => !nft.is_fraud && nft.confidence_score < 0.8).length;
    const flaggedCount = nfts.filter(nft => nft.is_fraud).length;
    const totalCount = nfts.length;
    
    return [
      { 
        label: 'All', 
        value: 'all', 
        count: totalCount
      },
      { 
        label: 'Safe', 
        value: 'safe', 
        count: safeCount
      },
      { 
        label: 'Warning', 
        value: 'warning', 
        count: warningCount
      },
      { 
        label: 'Flagged', 
        value: 'danger', 
        count: flaggedCount
      }
    ];
  }, [marketplaceData?.nfts]);

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
      
      {/* Main Content Container with Seamless Gradient Background */}
      <div className="relative z-10">
        {/* Seamless gradient background that covers all sections */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 via-blue-500/15 to-blue-400/25" />
        <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 via-blue-600/12 to-sky-500/20" />
        
        {/* Multiple floating orbs with different animations */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />
        <div className="absolute top-32 right-1/3 w-20 h-20 bg-warning/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/3 w-28 h-28 bg-success/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />

        {/* Enhanced grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 90%)'
          }}
        />

        {/* Matrix-style binary rain effect */}
        <div className="absolute inset-0 opacity-5">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-primary text-xs font-mono animate-matrix-rain"
              style={{
                left: `${(i * 5) % 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 3)}s`
              }}
            >
              {Math.random().toString(2).substr(2, 8)}
            </div>
          ))}
        </div>

        {/* Hero Section */}
        <section className="relative py-16 overflow-hidden">
          <div className="relative z-10 container mx-auto px-6 text-center">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Main headline */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  Explore
                  <br />
                  <span className="text-primary neon-text" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                    Marketplace
                  </span>
                </h1>
                
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Discover verified NFTs with AI-powered fraud protection. Trade with confidence in our secure marketplace.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
                {[
                  {
                    icon: Shield,
                    title: 'Total NFTs Secured',
                    value: (statsLoading || fraudStatsLoading) ? '...' : fraudStats ? fraudStats.total_analyzed.toLocaleString() : (stats ? stats.total_nfts.toLocaleString() : '0'),
                    color: 'text-primary',
                    gradient: 'from-primary/20 to-primary/5',
                    subtitle: 'Protected by AI'
                  },
                  {
                    icon: TrendingUp,
                    title: 'Value Protected',
                    value: (statsLoading || fraudStatsLoading) ? '...' : fraudStats ? `${fraudStats.value_protected.toFixed(2)} SUI` : `${stats?.total_volume || 0} SUI`,
                    color: 'text-success',
                    gradient: 'from-success/20 to-success/5',
                    subtitle: 'Secured Assets'
                  },
                  {
                    icon: Target,
                    title: 'Detection Accuracy',
                    value: (statsLoading || fraudStatsLoading) ? '...' : fraudStats ? `${fraudStats.detection_accuracy}%` : (stats ? `${Math.min(stats.detection_accuracy || 99.2, 100).toFixed(1)}%` : '100.0%'),
                    color: 'text-accent',
                    gradient: 'from-accent/20 to-accent/5',
                    subtitle: 'AI Precision'
                  },
                  {
                    icon: AlertTriangle,
                    title: 'Threats Blocked',
                    value: (statsLoading || fraudStatsLoading) ? '...' : fraudStats ? fraudStats.recent_threats_30d.toLocaleString() : (stats ? (stats.threats_blocked || 0).toLocaleString() : '0'),
                    color: 'text-destructive',
                    gradient: 'from-destructive/20 to-destructive/5',
                    subtitle: 'This Month'
                  }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="glass-panel p-6 group hover-glow relative overflow-hidden">
                      {/* Background gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-center mb-4">
                          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg group-hover:shadow-cyber transition-all duration-300">
                            <Icon className={`w-8 h-8 ${stat.color}`} />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2 neon-text">{stat.value}</h3>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        {stat.subtitle && (
                          <p className="text-xs text-muted-foreground/70 mt-1">{stat.subtitle}</p>
                        )}
                      </div>

                      {/* Scan line effect on hover */}
                      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-full h-1 animate-scan top-1/2" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Marketplace Content */}
        <div className="w-full relative z-10">
          <div className="container mx-auto px-6 pb-16">
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
                    className="pl-10 glass-input bg-card/30 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-md"
                  />
                </div>

                {/* Filters and View Toggle */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex gap-2">
                    {filterOptions.map((option) => {
                      const isActive = selectedFilter === option.value;
                      
                      const getButtonStyle = () => {
                        if (isActive) {
                          return 'bg-gradient-to-r from-primary to-secondary text-primary-foreground border border-primary/30 shadow-glow neon-text';
                        }
                        
                        switch (option.value) {
                          case 'safe':
                            return 'glass-panel text-success hover:bg-success/10 hover:border-success/50 hover:text-success hover:shadow-[0_0_20px_hsl(var(--success)/0.3)]';
                          case 'warning':
                            return 'glass-panel text-warning hover:bg-warning/10 hover:border-warning/50 hover:text-warning hover:shadow-[0_0_20px_hsl(var(--warning)/0.3)]';
                          case 'danger':
                            return 'glass-panel text-destructive hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive hover:shadow-[0_0_20px_hsl(var(--destructive)/0.3)]';
                          default:
                            return 'glass-panel text-foreground hover:bg-card/40 hover:text-foreground';
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
                          ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground border border-primary/30 shadow-glow neon-text' 
                          : 'glass-panel text-foreground hover:bg-card/40 hover:text-foreground'
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
                          ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground border border-primary/30 shadow-glow neon-text' 
                          : 'glass-panel text-foreground hover:bg-card/40 hover:text-foreground'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Loading State */}
            {(isLoading || statsLoading || fraudStatsLoading) && (
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
              <section className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-foreground neon-text">Available NFTs</h2>
                  <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
                  <Badge variant="outline" className="text-sm glass-panel">
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
                    <div className="glass-panel p-8 max-w-md mx-auto">
                      <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No NFTs found matching your criteria.</p>
                    </div>
                  </div>
                )}

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-12">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="glass-panel hover:bg-card/40"
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
                            variant={currentPage === pageNum ? "cyber" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum 
                              ? "neon-text shadow-glow" 
                              : "glass-panel hover:bg-card/40"
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
                      className="glass-panel hover:bg-card/40"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
