import React from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { DashboardHero } from '@/components/DashboardHero';
import { FraudDetectionWidget } from '@/components/FraudDetectionWidget';
import { FraudAlert } from '@/components/FraudAlert';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';

const mockNfts = [
  {
    id: '1',
    title: 'Cyber Punk #001',
    image: 'https://images.unsplash.com/photo-1634193295627-1cdddf751ebf?w=400&h=400&fit=crop',
    price: '2.5 ETH',
    creator: 'CyberArtist',
    threatLevel: 'safe' as const
  },
  {
    id: '2',
    title: 'Digital Dreams',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
    price: '1.8 ETH',
    creator: 'PixelMaster',
    threatLevel: 'warning' as const
  },
  {
    id: '3',
    title: 'Neon Genesis',
    image: 'https://images.unsplash.com/photo-1634224088880-42dac6eb0fab?w=400&h=400&fit=crop',
    price: '3.2 ETH',
    creator: 'NeonCreator',
    flagged: true,
    threatLevel: 'danger' as const
  }
];

const mockAlerts = [
  {
    severity: 'critical' as const,
    title: 'Plagiarism Detected',
    description: 'NFT #3847 contains copyrighted content from verified artist "CyberVision"',
    timestamp: '2 minutes ago',
    nftId: '3847'
  },
  {
    severity: 'high' as const,
    title: 'Suspicious Activity',
    description: 'Multiple accounts created from same IP attempting rapid NFT creation',
    timestamp: '15 minutes ago'
  },
  {
    severity: 'medium' as const,
    title: 'Price Manipulation Alert',
    description: 'Unusual bidding pattern detected on NFT #2156',
    timestamp: '1 hour ago',
    nftId: '2156'
  }
];

const Index = () => {
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

        {/* Active Alerts */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Active Alerts</h2>
            <div className="h-px bg-gradient-to-r from-destructive/50 to-transparent flex-1" />
          </div>
          <div className="grid gap-4">
            {mockAlerts.map((alert, index) => (
              <FraudAlert
                key={index}
                {...alert}
              />
            ))}
          </div>
        </section>

        {/* NFT Marketplace */}
        <section className="pb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Protected Marketplace</h2>
            <div className="h-px bg-gradient-to-r from-accent/50 to-transparent flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockNfts.map((nft) => (
              <NftCard
                key={nft.id}
                {...nft}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
