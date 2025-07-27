'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { NftGrid } from '../../components/nft/NftGrid';
import { LoadingSpinner } from '../../components/ui/spinner';
import { mockNfts } from '../../lib/mockData';
import { truncateAddress } from '../../lib/utils';

// Mock user data
const mockUser = {
  address: '0x1234567890abcdef1234567890abcdef12345678901234567890abcdef123456',
  joinedDate: '2024-01-15',
  totalNfts: 12,
  totalSales: 8,
  totalEarnings: '45.7',
  reputation: 'Verified Creator',
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'owned' | 'created' | 'activity'>('owned');
  const [loading, setLoading] = useState(false);

  // Mock data - filter NFTs for this user
  const ownedNfts = mockNfts.filter(nft => nft.owner === mockUser.address);
  const createdNfts = mockNfts.filter(nft => nft.creator === mockUser.address);

  const handleNftClick = (nft: any) => {
    window.location.href = `/marketplace/${nft.id}`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'owned':
        return (
          <div>
            {ownedNfts.length > 0 ? (
              <NftGrid
                nfts={ownedNfts}
                onNftClick={handleNftClick}
                loading={loading}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🖼️</div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No NFTs Owned
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  You don't own any NFTs yet. Start exploring the marketplace!
                </p>
                <Link href="/marketplace">
                  <Button>Explore Marketplace</Button>
                </Link>
              </div>
            )}
          </div>
        );

      case 'created':
        return (
          <div>
            {createdNfts.length > 0 ? (
              <NftGrid
                nfts={createdNfts}
                onNftClick={handleNftClick}
                loading={loading}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No NFTs Created
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  You haven't created any NFTs yet. Start your creative journey!
                </p>
                <Link href="/profile/create">
                  <Button>Create NFT</Button>
                </Link>
              </div>
            )}
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-4">
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Purchased "Cosmic Explorer #001"</p>
                    <p className="text-sm text-[var(--text-secondary)]">2.5 SUI • 2 hours ago</p>
                  </div>
                  <Badge variant="info">Purchase</Badge>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Listed "Digital Dreamscape" for sale</p>
                    <p className="text-sm text-[var(--text-secondary)]">1.8 SUI • 1 day ago</p>
                  </div>
                  <Badge variant="warning">Listing</Badge>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Created "Ethereal Landscape"</p>
                    <p className="text-sm text-[var(--text-secondary)]">3.2 SUI • 3 days ago</p>
                  </div>
                  <Badge variant="safe">Creation</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)]">
                That's all your recent activity!
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      <div className="container section-padding">
        {/* Header */}
        <div className="content-spacing">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
                My{" "}
                <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-purple)]">
                  Profile
                </span>
              </h1>
            <div className="flex items-center gap-4 text-[var(--text-secondary)]">
              <span className="font-mono text-sm">
                {truncateAddress(mockUser.address)}
              </span>
              <Badge variant="safe">{mockUser.reputation}</Badge>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Link href="/profile/create">
              <Button>Create NFT</Button>
            </Link>
            <Button variant="secondary">
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {mockUser.totalNfts}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">NFTs Owned</div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {createdNfts.length}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">NFTs Created</div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {mockUser.totalSales}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Total Sales</div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {mockUser.totalEarnings} SUI
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Total Earnings</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex border-b border-[var(--border)]">
          {[
            { id: 'owned', label: 'Owned', count: ownedNfts.length },
            { id: 'created', label: 'Created', count: createdNfts.length },
            { id: 'activity', label: 'Activity', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-6 py-3 font-medium transition-colors relative
                ${activeTab === tab.id
                  ? 'text-[var(--primary-blue)] border-b-2 border-[var(--primary-blue)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-1 text-xs bg-[var(--bg-card)] rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {loading ? (
          <LoadingSpinner text="Loading..." />
        ) : (
          renderTabContent()
        )}
      </div>
      </div>
    </div>
  );
}
