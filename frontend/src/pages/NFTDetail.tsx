import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Shield, 
  AlertTriangle, 
  Eye, 
  ExternalLink, 
  Share, 
  Heart,
  Loader2,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  Brain,
  Info,
  Image,
  FileText,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';
import { useNFTDetails, useNFTAnalysisDetails, useSimilarNFTs } from '@/hooks/useMarketplace';
import { AnalysisDetails, recordBlockchainTransaction, checkNFTListingStatus } from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { extractPurchaseEventData, getTransactionDetails, MARKETPLACE_OBJECT_ID } from '@/lib/blockchain-utils';
import { 
  createPurchaseNFTTransaction, 
  getUserSUICoins, 
  parseBlockchainError,
  getBlockchainListingInfo,
  type PurchaseParams,
  MARKETPLACE_PACKAGE_ID
} from '@/lib/blockchain/marketplace-utils';
import { checkNFTInMarketplaceEscrow } from '@/lib/sui-utils';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Interface for fraud indicator details
interface FraudIndicatorDetails {
  detected: boolean;
  confidence: number;
  evidence?: string[];
}

const threatConfig = {
  safe: {
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    icon: Shield,
    label: 'VERIFIED',
    description: 'This NFT has been verified as safe by our AI fraud detection system.'
  },
  warning: {
    color: 'text-warning',
    bg: 'bg-warning/20',
    border: 'border-warning/50',
    icon: Eye,
    label: 'UNDER REVIEW',
    description: 'This NFT is currently under review. Please exercise caution.'
  },
  danger: {
    color: 'text-destructive',
    bg: 'bg-destructive/20',
    border: 'border-destructive/50',
    icon: AlertTriangle,
    label: 'FLAGGED',
    description: 'This NFT has been flagged by our fraud detection system. Trading is not recommended.'
  }
};

const NFTDetail = () => {
  const { nftId } = useParams<{ nftId: string }>();
  const navigate = useNavigate();
  const { data: nftData, isLoading, error } = useNFTDetails(nftId);
  const { data: analysisData, isLoading: analysisLoading } = useNFTAnalysisDetails(nftId);
  const { data: similarNFTsData, isLoading: similarLoading } = useSimilarNFTs(nftId);
  
  // Wallet and purchase functionality
  const { wallet, connect, executeBuyTransaction, validateSufficientBalance, calculateMarketplaceFee, refreshBalance } = useWallet();
  const { toast } = useToast();
  const [isBuying, setIsBuying] = useState(false);
  
  // Initialize Sui client for blockchain state checks
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

  if (isLoading || analysisLoading || similarLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CyberNavigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            {isLoading ? 'Loading NFT details...' : analysisLoading ? 'Loading analysis details...' : 'Loading similar NFTs...'}
          </span>
        </div>
      </div>
    );
  }

  if (error || !nftData?.nft) {
    return (
      <div className="min-h-screen bg-background">
        <CyberNavigation />
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">NFT Not Found</h1>
            <p className="text-muted-foreground mb-6">The NFT you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/marketplace')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const nft = nftData.nft;
  const owner = nftData.owner;
  
  // Determine threat level based on fraud detection results
  // Use analysis data if available, otherwise fall back to NFT data
  // Fixed logic: confidence_score represents AI's confidence in the analysis, not fraud probability
  // When is_fraud = false and confidence >= 0.8, it means high confidence that it's NOT fraud (SAFE)
  // When is_fraud = false and confidence < 0.8, it means low confidence in analysis (SUSPICIOUS)
  // When is_fraud = true, it's flagged regardless of confidence (DANGER)
  // When confidence_score is null/undefined, it means no analysis has been performed yet (WARNING)
  const isFraud = analysisData?.is_fraud ?? nft.is_fraud;
  const confidenceScore = analysisData?.confidence_score ?? nft.confidence_score;
  const threatLevel = isFraud 
    ? 'danger' 
    : (confidenceScore !== null && confidenceScore !== undefined && confidenceScore >= 0.8) 
      ? 'safe' 
      : 'warning';
  const config = threatConfig[threatLevel];
  const Icon = config.icon;

  // Helper function to display data with fallback
  const displayData = (value: string | number | null | undefined, fallback: string = '-'): string => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return String(value);
  };

  // Helper function to check if data is empty and return appropriate message
  const isEmptyData = (value: unknown): boolean => {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
    return false;
  };

  // Helper function to get empty state message
  const getEmptyStateMessage = (section: string): string => {
    switch (section) {
      case 'similar_nfts':
        return 'No similar NFTs found';
      case 'analysis':
        return 'Analysis data not available';
      case 'fraud_indicators':
        return 'No fraud indicators detected';
      case 'image_analysis':
        return 'Image analysis not available';
      case 'metadata_analysis':
        return 'Metadata analysis not available';
      case 'similarity_results':
        return 'Similarity check not performed';
      default:
        return 'No data available';
    }
  };

  // Helper function to format confidence score
  const formatConfidence = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '-';
    return `${(score * 100).toFixed(1)}%`;
  };

  // Helper function to extract analysis details
  const getAnalysisDetails = (): AnalysisDetails | null => {
    if (!analysisData?.analysis_details) return null;
    
    try {
      // If it's a string, parse it as JSON
      if (typeof analysisData.analysis_details === 'string') {
        return JSON.parse(analysisData.analysis_details) as AnalysisDetails;
      }
      // If it's already an object, return it
      return analysisData.analysis_details as AnalysisDetails;
    } catch (error) {
      console.error('Error parsing analysis details:', error);
      return null;
    }
  };

  const analysisDetails = getAnalysisDetails();

  // Purchase handler function with new marketplace smart contract integration
  const handlePurchase = async () => {
    if (!wallet?.address) {
      // If wallet is not connected, prompt user to connect
      connect();
      return;
    }

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
    const currentOwner = owner?.wallet_address || nft.owner_wallet_address || nft.wallet_address;
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
      // Step 1: Check if NFT is actually in marketplace escrow (blockchain state check)
      console.log('Checking if NFT is in marketplace escrow for purchase...');
      const escrowCheck = await checkNFTInMarketplaceEscrow(suiClient, nft.sui_object_id);
      console.log('Escrow check result for purchase:', escrowCheck);
      
      if (!escrowCheck.inEscrow) {
        toast({
          title: "Purchase Error", 
          description: "This NFT is not currently listed for sale on the marketplace",
          variant: "destructive"
        });
        return;
      }

      // Step 2: Get listing info from database for price and seller details
      console.log('Getting listing info from database...');
      const listingStatus = await checkNFTListingStatus(nft.id);
      
      if (!listingStatus.is_listed || !listingStatus.listing) {
        toast({
          title: "Purchase Error",
          description: "This NFT listing information is not available",
          variant: "destructive"
        });
        return;
      }
      
      const finalPrice = listingStatus.price || nft.price;
      const finalSellerAddress = listingStatus.seller_address || currentOwner;

      const totalCost = finalPrice + calculateMarketplaceFee(finalPrice);
      console.log(`Total cost: ${totalCost} SUI (Price: ${finalPrice} + Fee: ${calculateMarketplaceFee(finalPrice)})`);
      
      const balanceCheck = await validateSufficientBalance(totalCost);
      
      if (!balanceCheck.sufficient) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${totalCost.toFixed(4)} SUI but only have ${balanceCheck.currentBalance.toFixed(4)} SUI`,
          variant: "destructive"
        });
        return;
      }

      // Step 3: Execute blockchain purchase transaction
      const buyParams = {
        nftObjectId: nft.sui_object_id || nft.id,
        listingId: listingStatus.listing?.id || nft.id,
        price: finalPrice,
        buyerAddress: wallet.address,
      };

      toast({
        title: "Processing Purchase",
        description: "Please confirm the transaction in your wallet",
      });

      console.log('Executing buy transaction...');
      const txResult = await executeBuyTransaction(buyParams);
      
      if (!txResult.success) {
        throw new Error(txResult.error || 'Transaction failed');
      }

      // Step 4: Record transaction in backend
      await recordBlockchainTransaction({
        blockchain_tx_id: txResult.txId,
        listing_id: listingStatus.listing?.id || nft.id,
        nft_blockchain_id: nft.sui_object_id || nft.id,
        seller_wallet_address: finalSellerAddress,
        buyer_wallet_address: wallet.address,
        price: finalPrice,
        marketplace_fee: calculateMarketplaceFee(finalPrice),
        seller_amount: finalPrice - calculateMarketplaceFee(finalPrice),
        gas_fee: txResult.gasUsed ? txResult.gasUsed / 1_000_000_000 : undefined,
        transaction_type: 'purchase',
      });

      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased "${nft.title}" for ${finalPrice} SUI`,
        variant: "default"
      });

      await refreshBalance();
      setTimeout(() => navigate('/profile'), 2000);

    } catch (error) {
      console.error('Purchase failed:', error);
      const errorMessage = parseBlockchainError(error);
      
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <FloatingWarningIcon />
      <CyberNavigation />
      
      {/* Hero Section */}
      <section className="relative py-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
        
        <div className="relative z-10 container mx-auto px-6">
          <Button 
            onClick={() => navigate('/marketplace')} 
            variant="ghost" 
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image Gallery */}
          <div className="lg:col-span-1">
            <Card className="glass-panel overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={nft.image_url}
                  alt={nft.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400x400?text=NFT+Image';
                  }}
                />
                
                {/* Threat Level Badge */}
                <div className={`absolute top-4 right-4 ${config.bg} ${config.border} border px-3 py-1 rounded-lg backdrop-blur-sm`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Confidence Score Badge */}
                <div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-lg">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {formatConfidence(confidenceScore)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-primary">{formatConfidence(confidenceScore)}</div>
                <div className="text-xs text-muted-foreground">Confidence</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-secondary">
                  {isFraud ? 'FLAGGED' : 'SAFE'}
                </div>
                <div className="text-xs text-muted-foreground">Status</div>
              </Card>
            </div>
          </div>

          {/* Center Column - Product Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Product Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {displayData(nft.title, 'Untitled NFT')}
                  </h1>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {displayData(nft.category, 'NFT')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {nft.status ? nft.status.charAt(0).toUpperCase() + nft.status.slice(1) : 'Active'}
                    </Badge>
                  </div>
                </div>
                {nft.price && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{nft.price} SUI</div>
                    <div className="text-sm text-muted-foreground">Current Price</div>
                  </div>
                )}
              </div>

              {nft.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {nft.description}
                </p>
              )}

              {/* Security Status */}
              <Card className={`glass-panel p-4 ${config.border} border`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${config.color} mt-0.5`} />
                  <div>
                    <h3 className={`font-semibold ${config.color} mb-1`}>
                      Security Status: {config.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  variant={threatLevel === 'danger' ? 'destructive' : 'default'}
                  disabled={threatLevel === 'danger' || isBuying}
                  size="lg"
                  onClick={threatLevel === 'danger' ? undefined : handlePurchase}
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Buying...
                    </>
                  ) : (
                    threatLevel === 'danger' ? 'Not Available' : `Buy for ${nft.price} SUI`
                  )}
                </Button>
                <Button variant="outline" size="icon">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Share className="w-4 h-4" />
                </Button>
              </div>
              
              {threatLevel === 'danger' && (
                <Card className="glass-panel p-4 border-destructive/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive mb-1">
                        Trading Disabled
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This NFT has been flagged for potential fraud and is not available for purchase.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Creator & Owner Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Ownership</h3>
              <div className="grid grid-cols-1 gap-4">
                <Card className="glass-panel p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Creator</p>
                      <p className="text-sm text-muted-foreground">
                        {nft.creator_wallet_address ? `${nft.creator_wallet_address.slice(0, 8)}...${nft.creator_wallet_address.slice(-6)}` : '-'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                      <Shield className="w-3 h-3 mr-1" />
                      Creator
                    </Badge>
                  </div>
                </Card>

                <Card className="glass-panel p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Current Owner</p>
                      <p className="text-sm text-muted-foreground">
                        {owner?.wallet_address ? `${owner.wallet_address.slice(0, 8)}...${owner.wallet_address.slice(-6)}` : '-'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      <User className="w-3 h-3 mr-1" />
                      Owner
                    </Badge>
                  </div>
                </Card>
              </div>
            </div>

            {/* NFT Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Details</h3>
              <Card className="glass-panel p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium text-foreground">
                      {nft.created_at ? new Date(nft.created_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Blockchain</p>
                    <p className="font-medium text-foreground">Sui Network</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Object ID</p>
                    <p className="font-medium text-foreground font-mono text-xs">
                      {displayData(nft.sui_object_id, '-')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Flag Type</p>
                    <p className="font-medium text-foreground">
                      {displayData(nft.flag_type, '-')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Similar NFTs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Similar NFTs</h3>
              <Card className="glass-panel p-4">
                {similarNFTsData && similarNFTsData.similar_nfts && similarNFTsData.similar_nfts.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="w-5 h-5 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Found {similarNFTsData.total} similar NFTs
                      </span>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {similarNFTsData.similar_nfts.map((similarNft, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={similarNft.image_url} 
                              alt={similarNft.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/64x64?text=NFT';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {similarNft.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              Creator: {similarNft.wallet_address ? 
                                `${similarNft.wallet_address.slice(0, 6)}...${similarNft.wallet_address.slice(-4)}` : 
                                '-'}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              {(similarNft.similarity * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {getEmptyStateMessage('similar_nfts')}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Right Column - Analysis Tabs */}
          <div className="lg:col-span-1">
            <Card className="glass-panel">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="fraud">Fraud Check</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground text-base">AI Analysis Summary</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base text-muted-foreground">Overall Status:</span>
                        <Badge 
                          variant="outline" 
                          className={nft.is_fraud ? 'text-destructive border-destructive/30' : 'text-success border-success/30'}
                        >
                          {nft.is_fraud ? 'FLAGGED' : 'VERIFIED'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-base text-muted-foreground">Confidence Score:</span>
                        <span className="text-base font-medium text-foreground">
                          {formatConfidence(nft.confidence_score)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-base text-muted-foreground">Analysis Time:</span>
                        <span className="text-base text-foreground">
                          {analysisDetails?.analysis_timestamp ? 
                            new Date(analysisDetails.analysis_timestamp).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>

                    {nft.reason && (
                      <div className="space-y-2">
                        <span className="text-base text-muted-foreground">Analysis Reason:</span>
                        <p className="text-base text-foreground bg-muted/30 p-3 rounded-lg">
                          {nft.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="analysis" className="space-y-4 p-4">
                  <div className="space-y-4">
                    {/* LLM Decision */}
                    {analysisDetails?.llm_decision && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground text-base">AI Decision</h4>
                        </div>
                        <div className="space-y-3 text-base">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Recommendation:</span>
                            <Badge variant="outline" className="text-sm">
                              {analysisDetails.llm_decision.recommendation || '-'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Primary Concerns:</span>
                            <span className="text-foreground">
                              {analysisDetails.llm_decision.primary_concerns?.length || 0} issues
                            </span>
                          </div>
                          {analysisDetails.llm_decision.primary_concerns && analysisDetails.llm_decision.primary_concerns.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Concerns:</span>
                              <ul className="text-sm text-foreground space-y-2">
                                {analysisDetails.llm_decision.primary_concerns.slice(0, 3).map((concern, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                    <span>{concern}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Image Analysis */}
                    {analysisDetails?.image_analysis && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Image className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground text-base">Image Analysis</h4>
                        </div>
                        <div className="space-y-3 text-base">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Risk Level:</span>
                            <Badge variant="outline" className="text-sm">
                              {analysisDetails.image_analysis.risk_level || 'unknown'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Artistic Style:</span>
                            <span className="text-foreground">
                              {analysisDetails.image_analysis.artistic_style || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Uniqueness:</span>
                            <span className="text-foreground">
                              {analysisDetails.image_analysis.uniqueness_score ? 
                                `${(analysisDetails.image_analysis.uniqueness_score * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Fraud Score:</span>
                            <span className="text-foreground">
                              {analysisDetails.image_analysis.overall_fraud_score ? 
                                `${(analysisDetails.image_analysis.overall_fraud_score * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Quality:</span>
                            <span className="text-foreground">
                              {analysisDetails.image_analysis.quality_assessment || '-'}
                            </span>
                          </div>
                          {analysisDetails.image_analysis.color_palette && analysisDetails.image_analysis.color_palette.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Color Palette:</span>
                              <div className="flex flex-wrap gap-2">
                                {analysisDetails.image_analysis.color_palette.slice(0, 5).map((color, index) => (
                                  <Badge key={index} variant="outline" className="text-sm">
                                    {color}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {analysisDetails.image_analysis.key_visual_elements && analysisDetails.image_analysis.key_visual_elements.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Key Elements:</span>
                              <div className="flex flex-wrap gap-2">
                                {analysisDetails.image_analysis.key_visual_elements.slice(0, 3).map((element, index) => (
                                  <Badge key={index} variant="outline" className="text-sm">
                                    {element}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {analysisDetails.image_analysis.description && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Description:</span>
                              <p className="text-sm text-foreground bg-muted/30 p-3 rounded max-h-24 overflow-y-auto">
                                {analysisDetails.image_analysis.description}
                              </p>
                            </div>
                          )}
                          {analysisDetails.image_analysis.composition_analysis && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Composition:</span>
                              <p className="text-sm text-foreground bg-muted/30 p-3 rounded">
                                {analysisDetails.image_analysis.composition_analysis}
                              </p>
                            </div>
                          )}
                          {analysisDetails.image_analysis.artistic_merit && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Artistic Merit:</span>
                              <p className="text-sm text-foreground bg-muted/30 p-3 rounded">
                                {analysisDetails.image_analysis.artistic_merit}
                              </p>
                            </div>
                          )}
                          {analysisDetails.image_analysis.additional_notes && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Additional Notes:</span>
                              <p className="text-sm text-foreground bg-muted/30 p-3 rounded">
                                {analysisDetails.image_analysis.additional_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Similarity Results */}
                    {analysisDetails?.similarity_results && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Search className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground text-base">Similarity Check</h4>
                        </div>
                        <div className="space-y-3 text-base">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Is Duplicate:</span>
                            <Badge variant="outline" className={`text-sm ${analysisDetails.similarity_results.is_duplicate ? 'text-destructive border-destructive/30' : 'text-success border-success/30'}`}>
                              {analysisDetails.similarity_results.is_duplicate ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Max Similarity:</span>
                            <span className="text-foreground">
                              {analysisDetails.similarity_results.max_similarity ? 
                                `${(analysisDetails.similarity_results.max_similarity * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Similar NFTs:</span>
                            <span className="text-foreground">
                              {analysisDetails.similarity_results.similar_nfts?.length || 0} found
                            </span>
                          </div>
                          
                          {/* Display Similar NFTs */}
                          {analysisDetails.similarity_results.similar_nfts && analysisDetails.similarity_results.similar_nfts.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-sm text-muted-foreground">Similar NFTs Found:</span>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {analysisDetails.similarity_results.similar_nfts.slice(0, 5).map((similarNft, index) => (
                                  <div key={index} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                      <img 
                                        src={similarNft.metadata?.image_url || 'https://via.placeholder.com/48x48?text=NFT'} 
                                        alt={similarNft.metadata?.name || 'Similar NFT'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = 'https://via.placeholder.com/48x48?text=NFT';
                                        }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {similarNft.metadata?.name || 'Unknown NFT'}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        Creator: {similarNft.metadata?.creator ? 
                                          `${similarNft.metadata.creator.slice(0, 6)}...${similarNft.metadata.creator.slice(-4)}` : 
                                          'Unknown'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="outline" className="text-xs">
                                        {(similarNft.similarity * 100).toFixed(1)}%
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Display Evidence URLs */}
                          {analysisDetails.similarity_results.evidence_urls && analysisDetails.similarity_results.evidence_urls.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-sm text-muted-foreground">Evidence URLs:</span>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {analysisDetails.similarity_results.evidence_urls.slice(0, 3).map((url, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                    <Image className="w-4 h-4 text-primary flex-shrink-0" />
                                    <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline truncate"
                                    >
                                      {url}
                                    </a>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="fraud" className="space-y-4 p-4">
                  <div className="space-y-4">
                    {/* Fraud Indicators */}
                    {analysisDetails?.image_analysis?.fraud_indicators && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground text-base">Fraud Indicators</h4>
                        </div>
                        <div className="space-y-3 text-base">
                          {Object.entries(analysisDetails.image_analysis.fraud_indicators).map(([indicator, details]) => {
                            if (typeof details === 'object' && details !== null) {
                              const fraudIndicator = details as FraudIndicatorDetails;
                              const detected = fraudIndicator.detected;
                              const confidence = fraudIndicator.confidence;
                              const evidence = fraudIndicator.evidence;
                              
                              return (
                                <div key={indicator} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground capitalize">
                                      {indicator.replace(/_/g, ' ')}:
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-sm ${detected ? 'text-destructive border-destructive/30' : 'text-success border-success/30'}`}
                                    >
                                      {detected ? 'Detected' : 'Clear'}
                                    </Badge>
                                  </div>
                                  {confidence !== undefined && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">Confidence:</span>
                                      <span className="text-sm text-foreground">
                                        {typeof confidence === 'number' ? `${(confidence * 100).toFixed(1)}%` : confidence}
                                      </span>
                                    </div>
                                  )}
                                  {evidence && (
                                    <div className="space-y-2">
                                      <span className="text-sm text-muted-foreground">Evidence:</span>
                                      <p className="text-sm text-foreground bg-muted/30 p-3 rounded">
                                        {evidence}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Overall Fraud Assessment */}
                    {analysisDetails?.image_analysis && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground text-base">Overall Assessment</h4>
                        </div>
                        <div className="space-y-3 text-base">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Fraud Score:</span>
                            <span className="text-foreground font-medium">
                              {analysisDetails.image_analysis.overall_fraud_score ? 
                                `${(analysisDetails.image_analysis.overall_fraud_score * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Risk Level:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-sm ${
                                analysisDetails.image_analysis.risk_level === 'high' ? 'text-destructive border-destructive/30' :
                                analysisDetails.image_analysis.risk_level === 'medium' ? 'text-warning border-warning/30' :
                                'text-success border-success/30'
                              }`}
                            >
                              {analysisDetails.image_analysis.risk_level || 'unknown'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Recommendation:</span>
                            <span className="text-foreground">
                              {analysisDetails.image_analysis.recommendation || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Analysis Confidence:</span>
                            <span className="text-foreground">
                              {analysisDetails.image_analysis.confidence_in_analysis ? 
                                `${(analysisDetails.image_analysis.confidence_in_analysis * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="space-y-4 p-4">
                  <div className="space-y-4">
                    {/* Metadata Analysis */}
                    {analysisDetails?.metadata_analysis && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground text-base">Metadata Analysis</h4>
                        </div>
                        <div className="space-y-3 text-base">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Metadata Risk:</span>
                            <span className="text-foreground">
                              {analysisDetails.metadata_analysis.metadata_risk ? 
                                `${(analysisDetails.metadata_analysis.metadata_risk * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Quality Score:</span>
                            <span className="text-foreground">
                              {analysisDetails.metadata_analysis.quality_score ? 
                                `${(analysisDetails.metadata_analysis.quality_score * 100).toFixed(1)}%` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Suspicious Indicators:</span>
                            <span className="text-foreground">
                              {analysisDetails.metadata_analysis.suspicious_indicators?.length || 0} found
                            </span>
                          </div>
                          {analysisDetails.metadata_analysis.suspicious_indicators && analysisDetails.metadata_analysis.suspicious_indicators.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-sm text-muted-foreground">Indicators:</span>
                              <ul className="text-sm text-foreground space-y-2">
                                {analysisDetails.metadata_analysis.suspicious_indicators.slice(0, 3).map((indicator, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                                    <span>{indicator}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Analysis Timestamp */}
                    {analysisDetails?.analysis_timestamp && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground text-base">Analysis Information</h4>
                        </div>
                        <div className="text-base space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Analysis Time:</span>
                            <span className="text-foreground">
                              {new Date(analysisDetails.analysis_timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTDetail;
