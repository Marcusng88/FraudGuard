import React, { useState, useEffect } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { DashboardHero } from '@/components/DashboardHero';
import { FraudDetectionWidget } from '@/components/FraudDetectionWidget';
import { FraudAlert } from '@/components/FraudAlert';
import { NftCard } from '@/components/NftCard';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { ScrollAnimation, StaggeredAnimation } from '@/components/ScrollAnimation';
import { ScrollProgressBar, ScrollToTopButton } from '@/components/ScrollProgress';
import { getMarketplaceNFTs } from '@/lib/api';
import { NFT } from '@/lib/api';
import { WalletConnection } from '@/components/WalletConnection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Zap, 
  TrendingUp, 
  Eye, 
  Activity, 
  Users, 
  ArrowRight, 
  Sparkles,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        const response = await getMarketplaceNFTs(1, 6); // Get first 6 NFTs
        setNfts(response.nfts);
      } catch (err) {
        setError('Failed to load NFTs');
        console.error('Error fetching NFTs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" style={{ scrollBehavior: 'smooth' }}>
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />
      
      {/* Floating warning icon */}
      <FloatingWarningIcon />
      
      {/* Navigation */}
      <CyberNavigation />
      
      {/* Hero Section */}
      <DashboardHero />
      
      {/* Main Dashboard Content */}
      <div className="relative z-10">
        {/* Live Stats Banner */}
        <ScrollAnimation direction="fade" delay={0.2}>
          <section className="py-8 border-b border-border/20">
            <div className="container mx-auto px-6">
              <StaggeredAnimation 
                className="flex flex-wrap items-center justify-center gap-8 text-center"
                staggerDelay={0.1}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-sm text-muted-foreground">Live Protection Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">99.7% Uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">2.4K+ Protected Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">47 Threats Blocked Today</span>
                </div>
              </StaggeredAnimation>
            </div>
          </section>
        </ScrollAnimation>

        <div className="container mx-auto px-6 space-y-16 py-12">
          {/* Fraud Detection Stats */}
          <ScrollAnimation direction="up" delay={0.1} threshold={0.2}>
            <section className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative p-3 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 rounded-xl border border-green-400/40 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-xl blur-sm"></div>
                    <BarChart3 className="relative w-7 h-7 text-emerald-400 drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-2xl">
                      📊 Detection Overview
                    </h2>
                    <p className="text-gray-300 text-lg font-medium mt-1">Real-time fraud protection metrics</p>
                  </div>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/analytics')}>
                  View Analytics
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <FraudDetectionWidget />
            </section>
          </ScrollAnimation>

          {/* Security Features Grid */}
          <ScrollAnimation direction="up" delay={0.2}>
            <section className="relative">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="relative p-3 bg-gradient-to-br from-orange-500/20 via-yellow-500/20 to-amber-500/20 rounded-xl border border-orange-400/40 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-yellow-400/10 rounded-xl blur-sm"></div>
                    <Shield className="relative w-7 h-7 text-amber-400 drop-shadow-lg" />
                  </div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent drop-shadow-2xl">
                    🔒 Advanced Security Features
                  </h2>
                </div>
                <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                  Our AI-powered system provides comprehensive protection against fraud, 
                  plagiarism, and suspicious activities in the NFT marketplace.
                </p>
              </div>
              
              <StaggeredAnimation 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                staggerDelay={0.15}
              >
                {[
                  {
                    icon: Shield,
                    title: 'AI Fraud Detection',
                    description: 'Advanced machine learning algorithms detect suspicious patterns in real-time.',
                    status: 'Active',
                    color: 'success'
                  },
                  {
                    icon: Eye,
                    title: 'Plagiarism Scanner',
                    description: 'Image analysis to detect copied or stolen artwork across the platform.',
                    status: 'Scanning',
                    color: 'primary'
                  },
                  {
                    icon: Zap,
                    title: 'Real-time Monitoring',
                    description: 'Continuous surveillance of all marketplace activities and transactions.',
                    status: 'Online',
                    color: 'accent'
                  },
                  {
                    icon: TrendingUp,
                    title: 'Price Analysis',
                    description: 'Smart algorithms detect unusual pricing patterns and market manipulation.',
                    status: 'Active',
                    color: 'success'
                  },
                  {
                    icon: Users,
                    title: 'User Verification',
                    description: 'Multi-layer verification system to prevent fake accounts and bot activity.',
                    status: 'Verifying',
                    color: 'warning'
                  },
                  {
                    icon: AlertTriangle,
                    title: 'Threat Intelligence',
                    description: 'Global threat database integration for proactive security measures.',
                    status: 'Updated',
                    color: 'destructive'
                  }
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Card 
                      key={feature.title}
                      className="glass-panel hover-glow group relative overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-lg border ${
                            feature.color === 'success' ? 'bg-success/10 border-success/30' :
                            feature.color === 'primary' ? 'bg-primary/10 border-primary/30' :
                            feature.color === 'accent' ? 'bg-accent/10 border-accent/30' :
                            feature.color === 'warning' ? 'bg-warning/10 border-warning/30' :
                            'bg-destructive/10 border-destructive/30'
                          }`}>
                            <Icon className={`w-6 h-6 ${
                              feature.color === 'success' ? 'text-success' :
                              feature.color === 'primary' ? 'text-primary' :
                              feature.color === 'accent' ? 'text-accent' :
                              feature.color === 'warning' ? 'text-warning' :
                              'text-destructive'
                            }`} />
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${
                              feature.color === 'success' ? 'text-success border-success/30' :
                              feature.color === 'primary' ? 'text-primary border-primary/30' :
                              feature.color === 'accent' ? 'text-accent border-accent/30' :
                              feature.color === 'warning' ? 'text-warning border-warning/30' :
                              'text-destructive border-destructive/30'
                            }`}
                          >
                            {feature.status}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                      
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Card>
                  );
                })}
              </StaggeredAnimation>
            </section>
          </ScrollAnimation>

          {/* Active Alerts - Enhanced */}
          <ScrollAnimation direction="up" delay={0.2} threshold={0.3} distance={80} duration={0.8}>
            <section className="relative">
              <ScrollAnimation direction="left" delay={0.1} distance={60}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative p-3 bg-gradient-to-br from-red-500/20 via-pink-500/20 to-rose-500/20 rounded-xl border border-red-400/40 shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-pink-400/10 rounded-xl blur-sm"></div>
                      <AlertTriangle className="relative w-7 h-7 text-pink-400 drop-shadow-lg" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold bg-gradient-to-r from-red-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl">
                        ⚠️ Security Alerts
                      </h2>
                      <p className="text-gray-300 text-lg font-medium mt-1">Recent security events and notifications</p>
                    </div>
                  </div>
                  <ScrollAnimation direction="right" delay={0.3} distance={40}>
                    <Button variant="outline" className="gap-2" onClick={() => navigate('/alerts')}>
                      View All Alerts
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </ScrollAnimation>
                </div>
              </ScrollAnimation>
              
              <ScrollAnimation direction="scale" delay={0.5} duration={0.7}>
                <Card className="glass-panel">
                  <div className="p-6">
                    <div className="flex items-center justify-center py-12">
                      <ScrollAnimation direction="up" delay={0.2} distance={30}>
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-success" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">All Clear!</h3>
                            <p className="text-muted-foreground">No active security alerts at the moment.</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Our AI is continuously monitoring for threats.
                            </p>
                          </div>
                        </div>
                      </ScrollAnimation>
                    </div>
                  </div>
                </Card>
              </ScrollAnimation>
            </section>
          </ScrollAnimation>

          {/* NFT Marketplace - Enhanced */}
          <ScrollAnimation direction="up" delay={0.3} threshold={0.3} distance={100} duration={0.9}>
            <section className="relative">
              <ScrollAnimation direction="right" delay={0.1} distance={70}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative p-3 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-xl border border-gradient-to-r border-blue-400/40 shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-xl blur-sm"></div>
                      <Sparkles className="relative w-7 h-7 text-cyan-400 drop-shadow-lg" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
                        🛡️ Protected Marketplace
                      </h2>
                      <p className="text-gray-300 text-lg font-medium mt-1">
                        Premium verified & fraud-resistant NFT collections
                      </p>
                    </div>
                  </div>
                  <ScrollAnimation direction="left" delay={0.3} distance={50}>
                    <Button variant="cyber" className="gap-2" onClick={() => navigate('/marketplace')}>
                      Explore All NFTs
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </ScrollAnimation>
                </div>
              </ScrollAnimation>
              
              <ScrollAnimation direction="up" delay={0.5} distance={80} duration={0.8}>
                {loading ? (
                  <StaggeredAnimation 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    staggerDelay={0.2}
                    direction="scale"
                  >
                    {[...Array(6)].map((_, index) => (
                      <Card key={index} className="glass-panel overflow-hidden">
                        <div className="aspect-square bg-gradient-to-br from-muted/20 to-muted/5 animate-pulse relative">
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4 space-y-2">
                            <div className="h-4 bg-muted/30 rounded animate-pulse" />
                            <div className="h-3 bg-muted/20 rounded w-2/3 animate-pulse" />
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-muted/30 rounded animate-pulse" />
                          <div className="h-3 bg-muted/20 rounded w-1/2 animate-pulse" />
                        </div>
                      </Card>
                    ))}
                  </StaggeredAnimation>
                ) : error ? (
                  <ScrollAnimation direction="scale" delay={0.2} duration={0.6}>
                    <Card className="glass-panel">
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load NFTs</h3>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button variant="outline" onClick={() => window.location.reload()}>
                          Try Again
                        </Button>
                      </div>
                    </Card>
                  </ScrollAnimation>
                ) : nfts.length === 0 ? (
                  <ScrollAnimation direction="scale" delay={0.2} duration={0.6}>
                    <Card className="glass-panel">
                      <div className="p-12 text-center">
                        <ScrollAnimation direction="up" delay={0.3} distance={40}>
                          <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-muted-foreground" />
                          </div>
                        </ScrollAnimation>
                        <ScrollAnimation direction="fade" delay={0.5}>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No NFTs Available</h3>
                            <p className="text-muted-foreground mb-4">
                              Be the first to create and list an NFT in our protected marketplace!
                            </p>
                          </div>
                        </ScrollAnimation>
                        <ScrollAnimation direction="scale" delay={0.7}>
                          <Button variant="glow" className="gap-2" onClick={() => navigate('/create')}>
                            <Zap className="w-4 h-4" />
                            Create First NFT
                          </Button>
                        </ScrollAnimation>
                      </div>
                    </Card>
                  </ScrollAnimation>
                ) : (
                  <StaggeredAnimation 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    staggerDelay={0.2}
                    direction="up"
                  >
                    {nfts.map((nft) => (
                      <NftCard key={nft.id} nft={nft} />
                    ))}
                  </StaggeredAnimation>
                )}
              </ScrollAnimation>
            </section>
          </ScrollAnimation>
          
          {/* Wallet Connection - Enhanced */}
          <ScrollAnimation direction="scale" delay={0.5}>
            <section className="relative">
              <Card className="glass-panel border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="p-8">
                  <WalletConnection />
                </div>
              </Card>
            </section>
          </ScrollAnimation>
        </div>
      </div>
      
      {/* Scroll to Top Button */}
      <ScrollToTopButton />
    </div>
  );
};

export default Index;
