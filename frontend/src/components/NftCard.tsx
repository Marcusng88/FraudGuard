import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Shield, Eye, Loader2, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { NFT } from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';
import { recordBlockchainTransaction, checkNFTListingStatus } from '@/lib/api';
import { extractPurchaseEventData, getTransactionDetails, MARKETPLACE_OBJECT_ID } from '@/lib/blockchain-utils';
import { createAnalysisPreview } from '@/lib/text-utils';

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
  const { wallet, connect, executeBuyTransaction, validateSufficientBalance, calculateMarketplaceFee } = useWallet();
  const { toast } = useToast();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  
  // Generate floating particles on hover
  const generateParticles = () => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  };

  const clearParticles = () => {
    setTimeout(() => setParticles([]), 3000);
  };
  
  // Determine threat level based on fraud status and confidence
  // Fixed logic: confidence_score represents AI's confidence in the analysis, not fraud probability
  // When is_fraud = false and confidence >= 0.8, it means high confidence that it's NOT fraud (SAFE)
  // When is_fraud = false and confidence < 0.8, it means low confidence in analysis (SUSPICIOUS)
  // When is_fraud = true, it's flagged regardless of confidence (DANGER)
  // When confidence_score is null/undefined, it means no analysis has been performed yet (WARNING)
  
  // Debug logging
  console.log(`NFT ${nft.title} - is_fraud: ${nft.is_fraud}, confidence_score: ${nft.confidence_score}`);
  
  const threatLevel = nft.is_fraud 
    ? 'danger' 
    : (nft.confidence_score !== null && nft.confidence_score !== undefined && nft.confidence_score >= 0.8) 
      ? 'safe' 
      : 'warning';
      
  console.log(`NFT ${nft.title} - threatLevel: ${threatLevel}`);
  
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

  const handlePurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!wallet?.address) {
      // If wallet is not connected, prompt user to connect
      connect();
      return;
    }

    if (nft.is_fraud) {
      toast({
        title: "Purchase Blocked",
        description: "This NFT has been flagged as potentially fraudulent",
        variant: "destructive"
      });
      return;
    }

    // Check if buyer is trying to buy their own NFT
    const currentOwner = nft.owner_wallet_address || nft.wallet_address;
    if (currentOwner === wallet.address) {
      toast({
        title: "Purchase Error",
        description: "You cannot purchase your own NFT",
        variant: "destructive"
      });
      return;
    }

    setIsBuying(true);

    try {
      // Step 1: Check if NFT is currently listed in the database
      console.log('Checking NFT listing status in database...');
      const listingStatus = await checkNFTListingStatus(nft.id);
      
      if (!listingStatus.is_listed) {
        toast({
          title: "Purchase Error",
          description: "This NFT is not currently listed for sale",
          variant: "destructive"
        });
        return;
      }

      const listingPrice = listingStatus.price || nft.price;
      const sellerAddress = listingStatus.seller_address || currentOwner;

      if (!listingPrice || listingPrice <= 0) {
        toast({
          title: "Purchase Error",
          description: "NFT price is not available",
          variant: "destructive"
        });
        return;
      }

      if (!sellerAddress) {
        toast({
          title: "Purchase Error",
          description: "Unable to determine NFT seller",
          variant: "destructive"
        });
        return;
      }

      // Step 2: Validate sufficient balance (including marketplace fee)
      const totalCost = listingPrice + calculateMarketplaceFee(listingPrice);
      console.log(`Total cost: ${totalCost} SUI (Price: ${listingPrice} + Fee: ${calculateMarketplaceFee(listingPrice)})`);
      
      const balanceCheck = await validateSufficientBalance(totalCost);
      console.log('Balance check result:', balanceCheck);
      
      if (!balanceCheck.sufficient) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${totalCost.toFixed(4)} SUI but only have ${balanceCheck.currentBalance.toFixed(4)} SUI`,
          variant: "destructive"
        });
        return;
      }

      console.log(`Initiating purchase from seller: ${sellerAddress} for price: ${listingPrice} SUI`);

      // Step 3: Execute blockchain transaction using the database-driven approach
      const buyParams = {
        marketplaceId: MARKETPLACE_OBJECT_ID,
        listingId: listingStatus.listing?.id || nft.id, // Use database listing ID
        nftObjectId: nft.sui_object_id || nft.id, // Fixed: use nftObjectId instead of nftId
        price: listingPrice,
        buyerAddress: wallet.address,
        sellerAddress: sellerAddress,
      };

      toast({
        title: "Processing Purchase",
        description: "Please confirm the transaction in your wallet",
      });

      console.log('Executing buy transaction with params:', buyParams);
      const txResult = await executeBuyTransaction(buyParams);
      console.log('Transaction result:', txResult);

      if (!txResult.success) {
        throw new Error(txResult.error || 'Transaction failed');
      }

      // Step 4: Record transaction in backend and update listing status
      console.log('Recording transaction in backend...');
      await recordBlockchainTransaction({
        blockchain_tx_id: txResult.txId,
        listing_id: listingStatus.listing?.id || nft.id,
        nft_blockchain_id: nft.sui_object_id || nft.id,
        seller_wallet_address: sellerAddress,
        buyer_wallet_address: wallet.address,
        price: listingPrice,
        marketplace_fee: calculateMarketplaceFee(listingPrice),
        seller_amount: listingPrice - calculateMarketplaceFee(listingPrice),
        gas_fee: txResult.gasUsed ? txResult.gasUsed / 1_000_000_000 : undefined, // Convert to SUI
        transaction_type: 'purchase',
      });

      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased "${nft.title}" for ${listingPrice} SUI`,
        variant: "default"
      });

      // Refresh the page or navigate to user's collection
      setTimeout(() => {
        navigate('/profile');
      }, 2000);

    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsBuying(false);
    }
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
        glass-panel relative overflow-hidden group cursor-pointer transform transition-all duration-700 ease-out
        hover:scale-105 hover:-translate-y-4 hover:rotate-1 
        ${nft.is_fraud ? 'fraud-alert hover:border-destructive/60' : 'hover:border-primary/60'}
        ${isHovered ? 'shadow-2xl' : 'shadow-lg'}
        hover:shadow-cyan-500/25 hover:shadow-2xl
        border-2 border-border/20
      `}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
      }}
      onClick={handleCardClick}
      onMouseEnter={() => {
        setIsHovered(true);
        generateParticles();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        clearParticles();
      }}
    >
      {/* Animated background glow */}
      <div 
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
          nft.is_fraud 
            ? 'bg-gradient-to-br from-destructive/20 via-destructive/10 to-transparent' 
            : 'bg-gradient-to-br from-primary/20 via-accent/10 to-transparent'
        }`} 
      />

      {/* Floating particles */}
      {isHovered && particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute w-1 h-1 rounded-full animate-float pointer-events-none z-30 ${
            nft.is_fraud ? 'bg-destructive' : 'bg-primary'
          }`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: '3s',
            opacity: 0.8,
          }}
        />
      ))}

      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent w-full h-full transform -skew-x-12 translate-x-[-300%] group-hover:translate-x-[300%] transition-transform duration-1500 ${
            nft.is_fraud 
              ? 'via-destructive/30' 
              : 'via-primary/30 group-hover:via-accent/20'
          }`}
        />
      </div>

      {/* Cyber grid overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 z-10"
        style={{
          backgroundImage: `linear-gradient(${nft.is_fraud ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'} 1px, transparent 1px), linear-gradient(90deg, ${nft.is_fraud ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Threat indicator with enhanced effects */}
      <div className={`absolute top-3 right-3 z-30 p-2 rounded-lg ${config.bg} ${config.border} border transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
        <Icon className={`w-4 h-4 ${config.color} ${isHovered ? 'animate-pulse' : ''}`} />
        {/* Pulsing glow around threat indicator */}
        {isHovered && (
          <div className={`absolute inset-0 rounded-lg ${config.bg} animate-ping opacity-50`} />
        )}
      </div>

      {/* Enhanced scan line effects for all cards */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent w-full h-0.5 animate-scan ${
            nft.is_fraud ? 'via-destructive/40' : 'via-primary/40'
          }`} 
          style={{ top: '25%', animationDuration: '2s' }}
        />
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent w-full h-0.5 animate-scan ${
            nft.is_fraud ? 'via-destructive/30' : 'via-accent/30'
          }`} 
          style={{ top: '75%', animationDuration: '3s', animationDelay: '0.5s' }}
        />
      </div>

      {/* Glowing border effect */}
      <div 
        className={`absolute inset-0 rounded-lg border-2 opacity-0 group-hover:opacity-100 transition-all duration-500 ${
          nft.is_fraud ? 'border-destructive/50 shadow-destructive/25' : 'border-primary/50 shadow-primary/25'
        } group-hover:shadow-lg`}
      />

      {/* Image container with enhanced 3D effect */}
      <div className="relative overflow-hidden rounded-t-lg transform group-hover:scale-102 transition-transform duration-500">
        {imageLoading && (
          <div className="w-full h-48 bg-muted animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground text-sm animate-bounce">Loading...</div>
          </div>
        )}
        
        {imageUrl && !imageError ? (
          <img 
            src={imageUrl} 
            alt={displayData(nft.title, 'NFT Image')}
            className={`w-full h-48 object-cover transition-all duration-500 ${
              imageLoading ? 'hidden' : ''
            } ${
              isHovered ? 'scale-110 brightness-110' : 'scale-100'
            }`}
            style={{
              filter: nft.is_fraud 
                ? `brightness(0.7) sepia(0.3) hue-rotate(320deg) ${isHovered ? 'saturate(1.2)' : ''}` 
                : isHovered ? 'brightness(1.1) saturate(1.1)' : 'none'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <img 
              src={getFallbackImage()} 
              alt={displayData(nft.title, 'NFT Fallback')}
              className={`w-full h-48 object-cover transition-all duration-500 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              style={{
                filter: nft.is_fraud 
                  ? `brightness(0.7) sepia(0.3) hue-rotate(320deg) ${isHovered ? 'saturate(1.2)' : ''}` 
                  : isHovered ? 'brightness(1.1)' : 'none'
              }}
            />
          </div>
        )}
        
        {/* Enhanced overlay gradient */}
        <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
          isHovered 
            ? 'from-black/70 via-black/20 to-transparent' 
            : 'from-black/50 via-transparent to-transparent'
        }`} />
        
        {/* Floating holographic effects */}
        {isHovered && (
          <>
            <div className="absolute top-2 left-2 w-2 h-2 bg-accent rounded-full animate-ping opacity-60" />
            <div className="absolute top-4 right-6 w-1 h-1 bg-primary rounded-full animate-bounce opacity-80" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-6 left-4 w-1.5 h-1.5 bg-success rounded-full animate-pulse opacity-70" style={{ animationDelay: '1s' }} />
          </>
        )}
        
        {/* Price overlay with glow effect */}
        {nft.price && (
          <div className={`absolute bottom-3 left-3 glass-panel p-2 rounded-lg transition-all duration-300 ${
            isHovered ? 'scale-110 shadow-lg backdrop-blur-md' : ''
          }`}>
            <p className={`text-sm font-bold neon-text transition-all duration-300 ${
              isHovered 
                ? (nft.is_fraud ? 'text-destructive' : 'text-primary') 
                : 'text-foreground'
            }`}
            style={{
              textShadow: isHovered 
                ? `0 0 10px currentColor, 0 0 20px currentColor` 
                : 'none'
            }}>
              {nft.price} SUI
            </p>
          </div>
        )}

        {/* Enhanced confidence score overlay */}
        {nft.is_fraud && (
          <div className={`absolute top-3 left-3 glass-panel p-2 rounded-lg bg-destructive/20 border border-destructive/50 transition-all duration-300 ${
            isHovered ? 'scale-110 animate-pulse' : ''
          }`}>
            <p className="text-xs font-medium text-destructive">
              {formatConfidence(nft.confidence_score)}
            </p>
          </div>
        )}
      </div>

      {/* Content with enhanced animations */}
      <div className={`p-4 space-y-3 relative z-10 transition-all duration-300 ${
        isHovered ? 'transform translate-y-[-2px]' : ''
      }`}>
        <div className="space-y-2">
          <h3 className={`font-semibold truncate transition-all duration-300 ${
            isHovered 
              ? (nft.is_fraud ? 'text-destructive' : 'text-primary') + ' text-lg'
              : 'text-foreground'
          }`}
          style={{
            textShadow: isHovered ? '0 0 8px currentColor' : 'none'
          }}>
            {displayData(nft.title, 'Untitled NFT')}
          </h3>
          <p className={`text-sm transition-colors duration-300 ${
            isHovered ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            by {nft.wallet_address ? `${nft.wallet_address.slice(0, 8)}...` : '-'}
          </p>
        </div>

        {/* Status badge with enhanced effects */}
        <Badge 
          variant="outline" 
          className={`${config.color} ${config.border} text-xs font-mono transition-all duration-300 ${
            isHovered ? 'scale-110 shadow-md' : ''
          }`}
          style={{
            boxShadow: isHovered ? `0 0 10px ${config.color.replace('text-', '')}` : 'none'
          }}
        >
          {config.label}
        </Badge>

        {/* AI Analysis Info with hover effects */}
        <div className="space-y-2">
          <div className={`flex items-center justify-between text-xs transition-all duration-300 ${
            isHovered ? 'scale-105' : ''
          }`}>
            <span className="text-muted-foreground">Confidence:</span>
            <span className={`font-medium transition-colors duration-300 ${
              isHovered ? (nft.is_fraud ? 'text-destructive' : 'text-primary') : 'text-foreground'
            }`}>
              {formatConfidence(nft.confidence_score)}
            </span>
          </div>
          
          {nft.reason && (
            <div className={`text-xs text-muted-foreground bg-muted/30 p-2 rounded transition-all duration-300 ${
              isHovered ? 'bg-muted/50 transform scale-102' : ''
            }`}>
              <span className="font-medium">Reason:</span> {createAnalysisPreview(nft.reason, 100)}
            </div>
          )}

          {/* Analysis info with enhanced styling */}
          <div className={`text-xs text-muted-foreground bg-muted/30 p-2 rounded transition-all duration-300 ${
            isHovered ? 'bg-muted/50 transform scale-102' : ''
          }`}>
            <span className="font-medium">Analysis:</span> 
            {nft.is_fraud ? ' Detailed fraud analysis available' : ' AI verification completed'}
          </div>
        </div>

        {/* Action buttons with enhanced hover effects */}
        <div className={`flex gap-2 transition-all duration-300 ${
          isHovered ? 'transform scale-105' : ''
        }`}>
          <Button 
            variant={threatLevel === 'danger' ? 'destructive' : 'default'} 
            size="sm" 
            className={`flex-1 transition-all duration-300 ${
              isHovered 
                ? 'shadow-lg transform scale-105 ' + (threatLevel === 'danger' ? 'shadow-destructive/25' : 'shadow-primary/25')
                : ''
            }`}
            onClick={threatLevel === 'danger' ? handleViewClick : handlePurchase}
            disabled={threatLevel === 'danger' || isBuying}
          >
            {isBuying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Buying...
              </>
            ) : threatLevel === 'danger' ? (
              'Review'
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Buy Now
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewClick}
            className={`transition-all duration-300 ${
              isHovered ? 'shadow-md transform scale-105' : ''
            }`}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced cyber border effect */}
      <div className={`absolute inset-0 cyber-border transition-opacity duration-500 ${
        isHovered ? 'opacity-80' : 'opacity-30'
      }`} />
      
      {/* Corner accent lights */}
      {isHovered && (
        <>
          <div className={`absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse ${
            nft.is_fraud ? 'bg-destructive' : 'bg-primary'
          }`} />
          <div className={`absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full animate-ping ${
            nft.is_fraud ? 'bg-destructive/70' : 'bg-accent'
          }`} style={{ animationDelay: '0.5s' }} />
          <div className={`absolute top-1 left-1 w-1 h-1 rounded-full animate-bounce ${
            nft.is_fraud ? 'bg-warning' : 'bg-success'
          }`} style={{ animationDelay: '1s' }} />
        </>
      )}
    </Card>
  );
}