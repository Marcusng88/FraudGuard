'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { FraudIndicator } from '../fraud/FraudIndicator';
import { RelativeTime } from '../ui/ClientOnly';
import { NFT } from '../../types/nft';
import { formatSui, truncateAddress } from '../../lib/utils';

interface NftCardProps {
  nft: NFT;
  onClick?: () => void;
  className?: string;
}

export function NftCard({ nft, onClick, className }: NftCardProps) {
  const fraudScore = nft.fraudFlag?.riskScore || 0;

  return (
    <Card 
      variant="glass" 
      className={`group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 touch-target ${className}`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-t-lg">
        <Image
          src={nft.image}
          alt={nft.name}
          fill
          className="object-cover transition-transform group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Fraud Indicator Overlay */}
        <div className="absolute top-2 right-2">
          <FraudIndicator score={fraudScore} showText={false} size="small" />
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="default" className="bg-black/70 text-white">
            {formatSui(nft.price, 0)} SUI
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* NFT Name */}
        <h3 className="font-semibold text-[var(--text-primary)] mb-2 line-clamp-1">
          {nft.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
          {nft.description}
        </p>

        {/* Creator Info */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>By {truncateAddress(nft.creator, 3)}</span>
          <RelativeTime date={nft.createdAt} />
        </div>

        {/* Attributes Preview */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {nft.attributes.slice(0, 2).map((attr, index) => (
              <Badge key={index} variant="info" size="sm">
                {attr.value}
              </Badge>
            ))}
            {nft.attributes.length > 2 && (
              <Badge variant="info" size="sm">
                +{nft.attributes.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="flex items-center justify-between w-full">
          {/* Fraud Score */}
          <FraudIndicator score={fraudScore} size="small" />
          
          {/* Buy Button */}
          <Button 
            size="sm" 
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              // Handle buy action
              console.log('Buy NFT:', nft.id);
            }}
          >
            Buy Now
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
