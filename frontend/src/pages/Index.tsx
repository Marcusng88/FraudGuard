import React, { useState, useEffect } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { DashboardHero } from '@/components/DashboardHero';
import { FraudDetectionWidget } from '@/components/FraudDetectionWidget';
import { FraudAlert } from '@/components/FraudAlert';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { getMarketplaceNFTs } from '@/lib/api';
import { NFT } from '@/lib/api';
import { WalletConnection } from '@/components/WalletConnection';

const Index = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        const response = await getMarketplaceNFTs(1, 6); // Get first 6 NFTs
        setNfts(response.nfts);
      } catch (err) {
        setError('Failed to load NFTs');
        console.error('Error fetching NFTs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Floating warning icon */}
      <FloatingWarningIcon />
      
      {/* Navigation */}
      <CyberNavigation />
      
      {/* Hero Section */}
      <DashboardHero />
      
      {/* Main Dashboard Content */}
      <div className="container mx-auto px-6 space-y-12">
        {/* Fraud Detection Stats */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Detection Overview</h2>
            <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
          </div>
          <FraudDetectionWidget />
        </section>

        {/* Active Alerts - Removed mock data, can be replaced with real API call later */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Active Alerts</h2>
            <div className="h-px bg-gradient-to-r from-destructive/50 to-transparent flex-1" />
          </div>
          <div className="text-center py-8 text-muted-foreground">
            <p>No active alerts at the moment</p>
          </div>
        </section>

        {/* NFT Marketplace */}
        <section className="pb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Protected Marketplace</h2>
            <div className="h-px bg-gradient-to-r from-accent/50 to-transparent flex-1" />
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-80 bg-muted/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No NFTs available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nft) => (
                <NftCard
                  key={nft.id}
                  nft={nft}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Wallet Connection */}
        <section className="pb-12">
          <WalletConnection />
        </section>
      </div>
    </div>
  );
};

export default Index;
