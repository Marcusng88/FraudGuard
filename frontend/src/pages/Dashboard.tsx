import React from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { DashboardHero } from '@/components/DashboardHero';
import { FraudDetectionWidget } from '@/components/FraudDetectionWidget';
import { FraudAlert } from '@/components/FraudAlert';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { useMarketplaceNFTs, useMarketplaceStats } from '@/hooks/useMarketplace';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  // Fetch recent NFTs for the dashboard (limit to 6 for display)
  const { data: marketplaceData, isLoading: nftsLoading } = useMarketplaceNFTs({ limit: 6 });
  const { data: stats, isLoading: statsLoading } = useMarketplaceStats();

  const nfts = marketplaceData?.nfts || [];
  
  return (
    <div className="min-h-screen bg-background relative">
      {/* Floating warning icon */}
      <FloatingWarningIcon />
      
      {/* Navigation */}
      <CyberNavigation />
      
      {/* Main Content Container */}
      <div className="relative z-10 pt-20">
        {/* Dashboard Hero Section */}
        <section className="w-full">
          <DashboardHero />
        </section>
        
        {/* Fraud Detection Widget Section */}
        <section className="w-full px-6 py-8">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 neon-text">
              Fraud Detection Stats
            </h2>
            <FraudDetectionWidget stats={stats} isLoading={statsLoading} />
          </div>
        </section>
        
        {/* Active Alerts Section */}
        <section className="w-full px-6 py-8">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 neon-text">
              Active Alerts
            </h2>
            <div className="space-y-4">
              <FraudAlert 
                severity="critical"
                title="Plagiarism Detected"
                description="NFT #3847 contains copyrighted content from verified artist 'CyberVision'"
                timestamp="2 minutes ago"
                nftId="3847"
              />
              <FraudAlert 
                severity="high"
                title="Suspicious Activity"
                description="Multiple accounts created from same IP attempting rapid NFT creation"
                timestamp="15 minutes ago"
              />
              <FraudAlert 
                severity="medium"
                title="Price Manipulation Alert"
                description="Unusual bidding pattern detected on NFT #2156"
                timestamp="1 hour ago"
                nftId="2156"
              />
            </div>
          </div>
        </section>
        
        {/* Protected Marketplace Section */}
        <section className="w-full px-6 py-8">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 neon-text">
              Protected Marketplace
            </h2>
            
            {nftsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading NFTs...</span>
              </div>
            ) : nfts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nfts.map((nft) => (
                  <NftCard key={nft.id} nft={nft} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No NFTs available in the marketplace yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first NFT to get started!
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard; 