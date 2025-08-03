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
  const { data: nft, isLoading, error } = useNFTDetails(nftId);

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

  if (error || !nft) {
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

  const config = threatConfig[nft.threat_level];
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
                  alt={nft.name}
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
                {nft.price_sui && (
                  <div className="absolute bottom-4 left-4 glass-panel px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-bold text-primary text-lg">
                        {nft.price_sui} {nft.currency}
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
                variant={nft.threat_level === 'danger' ? 'destructive' : 'default'}
                disabled={nft.threat_level === 'danger'}
              >
                {nft.threat_level === 'danger' ? 'Not Available' : `Buy for ${nft.price_sui} ${nft.currency}`}
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
              <h1 className="text-3xl font-bold text-foreground">{nft.name}</h1>
              
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
                      {nft.creator.display_name || `${nft.creator.sui_address.slice(0, 8)}...`}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {nft.creator.sui_address.slice(0, 20)}...
                      </p>
                      {nft.creator.is_verified && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
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
                      {nft.owner.display_name || `${nft.owner.sui_address.slice(0, 8)}...`}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {nft.owner.sui_address.slice(0, 20)}...
                      </p>
                      {nft.owner.is_verified && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
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
                {nft.listed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Listed</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(nft.listed_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className="text-xs">
                    {nft.listing_status.charAt(0).toUpperCase() + nft.listing_status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blockchain</p>
                  <p className="text-sm font-medium text-foreground">Sui Network</p>
                </div>
              </div>
            </div>

            {/* Fraud Flags */}
            {nft.fraud_flags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-destructive">Fraud Alerts</h3>
                  <div className="space-y-3">
                    {nft.fraud_flags.map((flag) => (
                      <Card key={flag.flag_id} className="glass-panel p-4 border-destructive/30">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-destructive mb-1">
                              {flag.flag_type.replace('_', ' ').toUpperCase()}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              {flag.reason}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Confidence: {(flag.confidence * 100).toFixed(1)}%</span>
                              <span>Flagged: {new Date(flag.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Trading History */}
            {nft.trades.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Trading History</h3>
                  <div className="space-y-3">
                    {nft.trades.slice(0, 5).map((trade, index) => (
                      <div key={trade.transaction_id} className="flex items-center justify-between p-3 glass-panel rounded-lg">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {trade.trade_type.charAt(0).toUpperCase() + trade.trade_type.slice(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(trade.confirmed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {trade.price_sui} {trade.currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {trade.buyer_address.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    ))}
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
