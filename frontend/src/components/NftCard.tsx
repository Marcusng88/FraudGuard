import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Shield, Eye, Loader2, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { NFT } from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';
import { recordBlockchainTransaction } from '@/lib/api';
import { extractPurchaseEventData, getTransactionDetails, MARKETPLACE_OBJECT_ID } from '@/lib/blockchain-utils';
import { createAnalysisPreview } from '@/lib/text-utils';
import { useSecurity } from '@/contexts/SecurityContext';
import { MasterPasswordVerification } from './MasterPasswordVerification';

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
  const { securitySettings } = useSecurity();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<(() => void) | null>(null);
  
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

  const handlePurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!wallet?.address) {
      // If wallet is not connected, prompt user to connect
      connect();
      return;
    }

    // Check if master password verification is required for purchases
    if (securitySettings.requireMasterPasswordForPurchase) {
      setPendingPurchase(() => () => handlePurchaseLogic());
      setShowMasterPasswordDialog(true);
      return;
    }

    // If no security requirement, proceed with purchase
    await handlePurchaseLogic();
  };

  const handlePurchaseLogic = async () => {

    if (!nft.price || nft.price <= 0) {
      toast({
        title: "Purchase Error",
        description: "NFT price is not available",
        variant: "destructive"
      });
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
      // Validate sufficient balance (including marketplace fee)
      const totalCost = nft.price + calculateMarketplaceFee(nft.price);
      console.log(`Total cost: ${totalCost} SUI (Price: ${nft.price} + Fee: ${calculateMarketplaceFee(nft.price)})`);
      
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

      // Get the seller address (current owner of the NFT)
      const sellerAddress = currentOwner;
      if (!sellerAddress) {
        toast({
          title: "Purchase Error",
          description: "Unable to determine NFT owner",
          variant: "destructive"
        });
        return;
      }

      console.log(`Initiating purchase from seller: ${sellerAddress}`);

      // Execute blockchain transaction
      const buyParams = {
        marketplaceId: MARKETPLACE_OBJECT_ID,
        listingId: nft.id, // Assuming the NFT ID is the listing ID
        nftId: nft.sui_object_id || nft.id,
        price: nft.price,
        buyerAddress: wallet.address,
        sellerAddress: sellerAddress, // Use the determined current owner
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

      // For the simplified transaction, we'll skip the event extraction for now
      // and proceed directly to recording the transaction
      
      // Record transaction in backend
      await recordBlockchainTransaction({
        blockchain_tx_id: txResult.txId,
        listing_id: nft.id,
        nft_blockchain_id: nft.sui_object_id || nft.id,
        seller_wallet_address: sellerAddress,
        buyer_wallet_address: wallet.address,
        price: nft.price,
        marketplace_fee: calculateMarketplaceFee(nft.price),
        seller_amount: nft.price - calculateMarketplaceFee(nft.price),
        gas_fee: txResult.gasUsed ? txResult.gasUsed / 1_000_000_000 : undefined, // Convert to SUI
        transaction_type: 'purchase',
      });

      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased "${nft.title}" for ${nft.price} SUI`,
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

  const handleMasterPasswordSuccess = () => {
    setShowMasterPasswordDialog(false);
    if (pendingPurchase) {
      pendingPurchase();
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
    <>
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
              <span className="font-medium">Reason:</span> {createAnalysisPreview(nft.reason, 100)}
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
          <Button variant="outline" size="sm" onClick={handleViewClick}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cyber border effect */}
      <div className="absolute inset-0 cyber-border opacity-30 group-hover:opacity-60 transition-opacity" />
    </Card>

    {/* Master Password Verification Dialog */}
    <MasterPasswordVerification
      isOpen={showMasterPasswordDialog}
      onSuccess={handleMasterPasswordSuccess}
      onCancel={() => setShowMasterPasswordDialog(false)}
      title="Verify Master Password"
      description="Please enter your master password to complete this purchase."
    />
    </>
  );
}