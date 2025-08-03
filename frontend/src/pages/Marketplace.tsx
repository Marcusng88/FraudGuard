import React, { useState } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Grid3X3, List, Shield, AlertTriangle, Eye } from 'lucide-react';

// Mock data for marketplace
const mockNfts = [
{
    id: '1',
    title: 'Cyber Punk',
    image: 'https://i.pinimg.com/736x/f5/71/b6/f571b6d34fca38fdf580f788a223a9be.jpg?w=400&h=400&fit=crop',
    price: '2.5 SUI',
    creator: 'CyberArtist',
    threatLevel: 'safe' as const
  },
  {
    id: '2',
    title: 'Digital Dreams',
    image: 'https://i.pinimg.com/736x/90/56/d3/9056d37cff0fcead7492b2a4fb4b01cf.jpg?w=400&h=400&fit=crop',
    price: '1.8 SUI',
    creator: 'PixelMaster',
    threatLevel: 'warning' as const
  },
  {
    id: '3',
    title: 'Neon Genesis',
    image: 'https://i.pinimg.com/1200x/25/5e/6a/255e6a9ce78282a79d736713a65c289b.jpg?w=400&h=400&fit=crop',
    price: '3.2 SUI',
    creator: 'NeonCreator',
    flagged: true,
    threatLevel: 'danger' as const
  },
  {
    id: '4',
    title: 'Quantum Reality',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop',
    price: '4.1 ETH',
    creator: 'QuantumArtist',
    threatLevel: 'safe' as const
  },
  {
    id: '5',
    title: 'Holographic Dreams',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop',
    price: '2.9 SUI',
    creator: 'HoloCreator',
    threatLevel: 'warning' as const
  },
  {
    id: '6',
    title: 'Neural Network',
    image: 'https://i.pinimg.com/1200x/42/0c/09/420c09c9da916fcff732747e57d34301.jpg?w=400&h=400&fit=crop',
    price: '5.0 SUI',
    creator: 'NeuralArtist',
    threatLevel: 'safe' as const
  }
];

const filterOptions = [
  { label: 'All', value: 'all', count: mockNfts.length },
  { label: 'Safe', value: 'safe', count: mockNfts.filter(nft => nft.threatLevel === 'safe').length },
  { label: 'Warning', value: 'warning', count: mockNfts.filter(nft => nft.threatLevel === 'warning').length },
  { label: 'Flagged', value: 'danger', count: mockNfts.filter(nft => nft.threatLevel === 'danger').length }
];

const Marketplace = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredNfts = mockNfts.filter(nft => {
    const matchesSearch = nft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nft.creator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || nft.threatLevel === selectedFilter;
    return matchesSearch && matchesFilter;
  });

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                             {[
                 {
                   icon: Shield,
                   title: 'Verified NFTs',
                   value: mockNfts.filter(nft => nft.threatLevel === 'safe').length,
                   color: 'text-primary'
                 },
                 {
                   icon: Eye,
                   title: 'Under Review',
                   value: mockNfts.filter(nft => nft.threatLevel === 'warning').length,
                   color: 'text-secondary'
                 },
                 {
                   icon: AlertTriangle,
                   title: 'Flagged Items',
                   value: mockNfts.filter(nft => nft.threatLevel === 'danger').length,
                   color: 'text-destructive'
                 }
               ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={stat.title}
                    className="glass-panel p-6 hover-glow group"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg group-hover:shadow-cyber transition-all duration-300">
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Marketplace Content */}
      <div className="container mx-auto px-6 space-y-8">
        {/* Search and Filter Bar */}
        <section className="glass-panel p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary w-4 h-4" />
              <Input
                placeholder="Search NFTs or creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30"
              />
            </div>

                         {/* Filters */}
             <div className="flex gap-2">
               {filterOptions.map((option) => {
                 const isActive = selectedFilter === option.value;
                 
                                   // Professional button styling
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
                     onClick={() => setSelectedFilter(option.value)}
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
        </section>

        {/* NFT Grid */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Available NFTs</h2>
            <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
            <Badge variant="outline" className="text-sm">
              {filteredNfts.length} items
            </Badge>
          </div>
          
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {filteredNfts.map((nft) => (
              <NftCard
                key={nft.id}
                {...nft}
              />
            ))}
          </div>

          {filteredNfts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No NFTs found matching your criteria.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Marketplace;