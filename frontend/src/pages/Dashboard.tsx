import React from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { DashboardHero } from '@/components/DashboardHero';
import { FraudDetectionWidget } from '@/components/FraudDetectionWidget';
import { FraudAlert } from '@/components/FraudAlert';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { useMarketplaceNFTs, useMarketplaceStats } from '@/hooks/useMarketplace';
import { Loader2, Sparkles, BarChart3, AlertTriangle } from 'lucide-react';

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
      
      {/* Main Content Container with Seamless Gradient Background */}
      <div className="relative z-10">
        {/* Seamless gradient background that covers all sections */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 via-blue-500/15 to-blue-400/25" />
        <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 via-blue-600/12 to-sky-500/20" />
        
        {/* Dashboard Hero Section */}
        <section className="w-full relative z-10">
          <DashboardHero />
        </section>
        
        {/* Stats Sections Container */}
        <div className="w-full relative z-10">
          {/* Fraud Detection Widget Section */}
          <section className="w-full px-6 py-8 relative">
            <div className="relative z-10 container mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative p-3 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 rounded-xl border border-green-400/40 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-xl blur-sm"></div>
                  <BarChart3 className="relative w-6 h-6 text-emerald-400 drop-shadow-lg" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-2xl">
                  📊 Fraud Detection Stats
                </h2>
              </div>
              <FraudDetectionWidget stats={stats} isLoading={statsLoading} />
            </div>
          </section>
          
          {/* Active Alerts Section */}
          <section className="w-full px-6 py-8 relative">
            <div className="relative z-10 container mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative p-3 bg-gradient-to-br from-red-500/20 via-pink-500/20 to-rose-500/20 rounded-xl border border-red-400/40 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-pink-400/10 rounded-xl blur-sm"></div>
                  <AlertTriangle className="relative w-6 h-6 text-pink-400 drop-shadow-lg" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl">
                  ⚠️ Active Alerts
                </h2>
              </div>
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
          <section className="w-full px-6 py-8 relative">
            <div className="relative z-10 container mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative p-3 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-xl border border-blue-400/40 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-xl blur-sm"></div>
                  <Sparkles className="relative w-6 h-6 text-cyan-400 drop-shadow-lg" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
                  🛡️ Protected Marketplace
                </h2>
              </div>
              
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
    </div>
  );
};

export default Dashboard; 