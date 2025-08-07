import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Shield, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NFT } from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';

interface NftCardProps {
  nft: NFT;
}

const threatConfig = {
  safe: {
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    icon: Shield,
    label: 'VERIFIED'
  },
  warning: {
    color: 'text-warning',
    bg: 'bg-warning/20',
    border: 'border-warning/50',
    icon: Eye,
    label: 'SUSPICIOUS'
  },
  danger: {
    color: 'text-destructive',
    bg: 'bg-destructive/20',
    border: 'border-destructive/50',
    icon: AlertTriangle,
    label: 'FLAGGED'
  }
};

export function NftCard({ nft }: NftCardProps) {
  const navigate = useNavigate();
  const { wallet, connect } = useWallet();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Determine threat level based on fraud status and confidence
  const threatLevel = nft.is_fraud ? 'danger' : (nft.confidence_score >= 0.8 ? 'safe' : 'warning');
  const config = threatConfig[threatLevel];
  const Icon = config.icon;

  // Helper function to display data with fallback
  const displayData = (value: string | number | null | undefined, fallback: string = '-'): string => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return String(value);
  };

  // Helper function to format confidence score
  const formatConfidence = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '-';
    return `${(score * 100).toFixed(1)}%`;
  };

  // Helper function to validate and get image URL
  const getImageUrl = (): string => {
    if (!nft.image_url || nft.image_url.trim() === '') {
      console.warn('NFT has no image_url:', nft.id);
      return '';
    }
    
    // Check if it's a valid URL
    try {
      new URL(nft.image_url);
      return nft.image_url;
    } catch (error) {
      console.error('Invalid image URL for NFT:', nft.id, nft.image_url);
      return '';
    }
  };

  // Use a better fallback image
  const getFallbackImage = (): string => {
    const colors = ['4F46E5', '059669', 'DC2626', 'EA580C', 'D97706', '65A30D', '2563EB', '7C3AED'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="#${randomColor}"/>
        <text x="150" y="150" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">
          ${nft.title ? nft.title.substring(0, 10) : 'NFT'}
        </text>
      </svg>
    `)}`;
  };

  const handleCardClick = () => {
    navigate(`/nft/${nft.id}`);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/nft/${nft.id}`);
  };

  const handlePurchase = (nft: NFT) => {
    if (!wallet?.address) {
      // If wallet is not connected, prompt user to connect
      connect();
      return;
    }
    
    // Navigate to NFT detail page for purchase
    navigate(`/nft/${nft.id}`);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    console.log('Image loaded successfully for NFT:', nft.id, nft.image_url);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error('Image failed to load for NFT:', nft.id, nft.image_url);
  };

  const imageUrl = getImageUrl();

  return (
    <Card 
      className={`
        glass-panel relative overflow-hidden group hover-glow cursor-pointer
        ${nft.is_fraud ? 'fraud-alert' : ''}
        transition-all duration-300
      `}
      onClick={handleCardClick}
    >
      {/* Threat indicator */}
      <div className={`absolute top-3 right-3 z-20 p-2 rounded-lg ${config.bg} ${config.border} border`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Scan line effect for flagged items */}
      {nft.is_fraud && (
        <div className="absolute inset-0 overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/20 to-transparent w-full h-1 animate-scan" />
        </div>
      )}

      {/* Image container with 3D effect */}
      <div className="relative overflow-hidden rounded-t-lg">
        {imageLoading && (
          <div className="w-full h-48 bg-muted animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        )}
        
        {imageUrl && !imageError ? (
          <img 
            src={imageUrl} 
            alt={displayData(nft.title, 'NFT Image')}
            className={`w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105 ${
              imageLoading ? 'hidden' : ''
            }`}
            style={{
              filter: nft.is_fraud ? 'brightness(0.7) sepia(0.3) hue-rotate(320deg)' : 'none'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <img 
              src={getFallbackImage()} 
              alt={displayData(nft.title, 'NFT Fallback')}
              className="w-full h-48 object-cover"
              style={{
                filter: nft.is_fraud ? 'brightness(0.7) sepia(0.3) hue-rotate(320deg)' : 'none'
              }}
            />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Price overlay */}
        {nft.price && (
          <div className="absolute bottom-3 left-3 glass-panel p-2 rounded-lg">
            <p className="text-sm font-bold text-foreground neon-text">{nft.price} SUI</p>
          </div>
        )}

        {/* Confidence score overlay for flagged items */}
        {nft.is_fraud && (
          <div className="absolute top-3 left-3 glass-panel p-2 rounded-lg bg-destructive/20 border border-destructive/50">
            <p className="text-xs font-medium text-destructive">
              {formatConfidence(nft.confidence_score)}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground truncate">
            {displayData(nft.title, 'Untitled NFT')}
          </h3>
          <p className="text-sm text-muted-foreground">
            by {nft.wallet_address ? `${nft.wallet_address.slice(0, 8)}...` : '-'}
          </p>
        </div>

        {/* Status badge */}
        <Badge 
          variant="outline" 
          className={`${config.color} ${config.border} text-xs font-mono`}
        >
          {config.label}
        </Badge>

        {/* AI Analysis Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confidence:</span>
            <span className="font-medium text-foreground">
              {formatConfidence(nft.confidence_score)}
            </span>
          </div>
          
          {nft.reason && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              <span className="font-medium">Reason:</span> {nft.reason}
            </div>
          )}

          {/* Analysis info - details available on click */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <span className="font-medium">Analysis:</span> 
            {nft.is_fraud ? ' Detailed fraud analysis available' : ' AI verification completed'}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button 
            variant={threatLevel === 'danger' ? 'destructive' : 'default'} 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              if (threatLevel === 'danger') {
                // For flagged items, show review details
                navigate(`/nft/${nft.id}`);
              } else {
                // For safe items, initiate purchase
                handlePurchase(nft);
              }
            }}
            disabled={threatLevel === 'danger'}
          >
            {threatLevel === 'danger' ? 'Review' : 'Buy Now'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewClick}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cyber border effect */}
      <div className="absolute inset-0 cyber-border opacity-30 group-hover:opacity-60 transition-opacity" />
    </Card>
  );
}