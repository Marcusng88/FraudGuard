import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  TrendingUp
} from 'lucide-react';
import { useNFTDetails } from '@/hooks/useMarketplace';

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CyberNavigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading NFT details...</span>
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
  
  // Determine threat level based on fraud status and confidence
  const threatLevel = nft.is_fraud ? 'danger' : (nft.confidence_score >= 0.8 ? 'safe' : 'warning');
  const config = threatConfig[threatLevel];
  const Icon = config.icon;

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Image */}
          <div className="space-y-6">
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
                
                {/* Threat Level Overlay */}
                <div className={`absolute top-4 right-4 ${config.bg} ${config.border} border px-3 py-1 rounded-lg backdrop-blur-sm`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Price Overlay */}
                {nft.price && (
                  <div className="absolute bottom-4 left-4 glass-panel px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-bold text-primary text-lg">
                        {nft.price} SUI
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                className="flex-1" 
                variant={threatLevel === 'danger' ? 'destructive' : 'default'}
                disabled={threatLevel === 'danger'}
              >
                {threatLevel === 'danger' ? 'Not Available' : `Buy for ${nft.price} SUI`}
              </Button>
              <Button variant="outline" size="icon">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-foreground">{nft.title}</h1>
              
              {nft.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {nft.description}
                </p>
              )}

              {/* Threat Level Info */}
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
                    {nft.confidence_score && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Confidence Score: {(nft.confidence_score * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <Separator />

            {/* Creator & Owner Info */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-4">Creator</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {`${nft.wallet_address.slice(0, 8)}...`}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {nft.wallet_address.slice(0, 20)}...
                      </p>
                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                        <Shield className="w-3 h-3 mr-1" />
                        Creator
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4">Current Owner</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {`${nft.wallet_address.slice(0, 8)}...`}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {nft.wallet_address.slice(0, 20)}...
                      </p>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                        <User className="w-3 h-3 mr-1" />
                        Owner
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* NFT Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(nft.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className="text-xs">
                    {nft.status.charAt(0).toUpperCase() + nft.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blockchain</p>
                  <p className="text-sm font-medium text-foreground">Sui Network</p>
                </div>
              </div>
            </div>

            {/* Fraud Analysis */}
            {nft.is_fraud && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-destructive">Fraud Alert</h3>
                  <div className="space-y-3">
                    <Card className="glass-panel p-4 border-destructive/30">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-destructive mb-1">
                            Potential Fraud Detected
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            {nft.reason || "This NFT has been flagged for potential fraud."}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Confidence: {(nft.confidence_score * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTDetail;
