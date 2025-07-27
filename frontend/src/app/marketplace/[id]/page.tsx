'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { FraudIndicator, FraudScore } from '../../../components/fraud/FraudIndicator';
import { FraudWarningBanner } from '../../../components/fraud/FraudWarningBanner';
import { FraudEducationBadge } from '../../../components/fraud/FraudEducationTooltip';
import { RelativeTime } from '../../../components/ui/ClientOnly';
import { getNftById } from '../../../lib/mockData';
import { formatSui, truncateAddress, getFraudRiskLevel, getFraudRiskIcon } from '../../../lib/utils';

export default function NFTDetailsPage() {
  const params = useParams();
  const nftId = params.id as string;
  const nft = getNftById(nftId);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  if (!nft) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            NFT Not Found
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            The NFT you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fraudScore = nft.fraudFlag?.riskScore || 0;
  const riskLevel = getFraudRiskLevel(fraudScore);
  const riskIcon = getFraudRiskIcon(fraudScore);

  const handlePurchase = () => {
    // TODO: Implement purchase logic
    console.log('Purchase NFT:', nft.id);
    alert('Purchase functionality will be implemented with smart contract integration!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: nft.name,
        text: nft.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      <div className="container section-padding">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-3 text-lg text-[var(--text-secondary)] mb-12">
          <Link href="/marketplace" className="hover:text-[var(--primary-blue)] transition-colors duration-200 font-medium">
            🛒 Marketplace
          </Link>
          <span className="text-[var(--border)]">→</span>
          <span className="text-[var(--text-primary)] font-semibold">{nft.name}</span>
        </nav>

      {/* Fraud Warning Banner */}
      {nft.fraudFlag && nft.fraudFlag.riskScore >= 30 && (
        <FraudWarningBanner
          fraudScore={nft.fraudFlag.riskScore}
          detectionTypes={nft.fraudFlag.detectionType}
          aiExplanation={nft.fraudFlag.aiExplanation}
          className="mb-8"
          onLearnMore={() => {
            // Scroll to fraud analysis section
            document.getElementById('fraud-analysis')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Side - Image */}
        <div className="space-y-6">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--bg-card)]">
            <Image
              src={nft.image}
              alt={nft.name}
              fill
              className={`object-cover transition-transform duration-300 cursor-zoom-in ${
                isImageZoomed ? 'scale-150' : 'scale-100'
              }`}
              onClick={() => setIsImageZoomed(!isImageZoomed)}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            
            {/* Fraud Indicator Overlay */}
            <div className="absolute top-4 right-4">
              <FraudIndicator score={fraudScore} size="large" />
            </div>
          </div>

          {/* Image Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsImageZoomed(!isImageZoomed)}
            >
              {isImageZoomed ? '🔍 Zoom Out' : '🔍 Zoom In'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              📤 Share
            </Button>
          </div>
        </div>

        {/* Right Side - Details */}
        <div className="space-y-8">
          {/* Basic Info */}
          <div>
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
              {nft.name}
            </h1>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
              {nft.description}
            </p>
          </div>

          {/* Price and Purchase */}
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-1">Current Price</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {formatSui(nft.price, 0)} SUI
                  </p>
                  {nft.priceUsd && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      ≈ ${nft.priceUsd.toFixed(2)} USD
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--text-secondary)] mb-1">Risk Level</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{riskIcon}</span>
                    <Badge variant={riskLevel === 'Safe' ? 'safe' : riskLevel === 'Warning' ? 'warning' : 'danger'}>
                      {riskLevel}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={handlePurchase}
                disabled={riskLevel === 'High Risk'}
              >
                {riskLevel === 'High Risk' ? '⚠️ High Risk - Purchase Disabled' : '💳 Buy Now'}
              </Button>
              
              {riskLevel === 'High Risk' && (
                <p className="text-xs text-[var(--danger-red)] mt-2 text-center">
                  This NFT has been flagged as high risk. Purchase is disabled for your protection.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Creator Info */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-lg">Creator Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Creator</span>
                  <span className="font-mono text-sm">{truncateAddress(nft.creator)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Owner</span>
                  <span className="font-mono text-sm">{truncateAddress(nft.owner)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Created</span>
                  <RelativeTime date={nft.createdAt} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Category</span>
                  <Badge variant="info">{nft.category}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section - Fraud Analysis */}
      {nft.fraudFlag && (
        <div id="fraud-analysis" className="mt-12">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            🛡️ Fraud Risk Analysis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FraudScore 
              score={fraudScore}
              details={{
                plagiarismRisk: Math.min(fraudScore + 10, 100),
                priceManipulation: Math.max(fraudScore - 15, 0),
                accountSuspicion: Math.max(fraudScore - 5, 0),
              }}
            />
            
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">AI Analysis Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                  {nft.fraudFlag.aiExplanation}
                </p>
                
                {nft.fraudFlag.detectionType.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                      Detection Flags:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nft.fraudFlag.detectionType.map((type, index) => (
                        <FraudEducationBadge key={index} detectionType={type} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Attributes */}
      {nft.attributes && nft.attributes.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            📋 Attributes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nft.attributes.map((attr, index) => (
              <Card key={index} variant="glass">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">
                    {attr.trait_type}
                  </p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {attr.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
