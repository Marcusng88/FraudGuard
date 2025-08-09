import React, { useState, useEffect, useCallback } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Wallet, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  LogOut,
  Plus,
  DollarSign,
  Clock,
  Eye,
  Edit,
  Trash2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { ListingManager } from '@/components/ListingManager';
import { MyNFTs } from '@/components/MyNFTs';
import { useUserListings, useMarketplaceAnalytics, useUpdateListing } from '@/hooks/useListings';
import { useUserProfile, useUpdateUserProfile } from '@/hooks/useProfile';
import { confirmUnlisting } from '@/lib/api';
import { getSuiClient } from '@/lib/blockchain-utils';
import { useToast } from '@/hooks/use-toast';
import { useSuiClient } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import { EditListingDialog } from '@/components/EditListingDialog';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';

const Profile = () => {
  const { wallet, disconnect, connect, refreshBalance, executeUnlistNFTTransaction } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const suiClient = useSuiClient();

  // Fetch user's listings
  const { data: userListings } = useUserListings(wallet?.address || '');
  
  // Fetch user profile data
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile(wallet?.address || '');
  
  // Fetch marketplace analytics
  const { data: analytics } = useMarketplaceAnalytics('24h');
  
  // Note: Removed deleteListing - now using blockchain-first approach

  // Mutations
  const updateListingMutation = useUpdateListing();
  // Note: Removed deleteListingMutation and useUnlistNFT() - now using blockchain-first approach
  const updateProfileMutation = useUpdateUserProfile();

  // Auto-refresh balance when profile loads
  useEffect(() => {
    if (wallet?.address) {
      refreshBalance();
      // Load avatar from localStorage
      const savedAvatar = localStorage.getItem(`avatar_${wallet.address}`);
      setUserAvatar(savedAvatar);
    }
  }, [wallet?.address, refreshBalance]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Helper functions for formatting numbers
  const formatBalance = (balance: number) => {
    return `${balance.toFixed(2)} SUI`;
  };

  const formatCurrency = (amount: number) => {
    // Handle floating point precision issues
    const rounded = Math.round(amount * 100) / 100;
    return rounded.toFixed(2);
  };

  const formatCurrencyDisplay = (amount: number) => {
    const formatted = formatCurrency(amount);
    return `${formatted} SUI`;
  };

  const handleRefreshBalance = useCallback(async () => {
    setIsRefreshingBalance(true);
    try {
      await refreshBalance();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [refreshBalance]);

  const handleSaveProfile = async (profileData: Partial<{ username?: string; bio?: string; avatar_url?: string }>) => {
    if (!wallet?.address) return;
    
    // Update profile in backend (excluding avatar)
    await updateProfileMutation.mutateAsync({
      walletAddress: wallet.address,
      profileData: {
        username: profileData.username,
        bio: profileData.bio,
        email: userProfile?.email // Keep existing email
      }
    });
    
    // Update local avatar if provided
    if (profileData.avatar_url !== undefined) {
      if (profileData.avatar_url) {
        localStorage.setItem(`avatar_${wallet.address}`, profileData.avatar_url);
        setUserAvatar(profileData.avatar_url);
      } else {
        localStorage.removeItem(`avatar_${wallet.address}`);
        setUserAvatar(null);
      }
    }
  };

  const handleViewNFT = (nftId: string) => {
    navigate(`/nft/${nftId}`);
  };

  const handleEditListing = async (listingId: string, newPrice: number) => {
    if (!wallet?.address) return;

    try {
      await updateListingMutation.mutateAsync({
        listing_id: listingId,
        price: newPrice
      });
    } catch (error) {
      console.error('Failed to update listing:', error);
    }
  };

  const handleUnlistNFT = async (listingId: string) => {
    if (!wallet?.address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Starting blockchain-first unlisting for listing ID:', listingId);

      // Step 1: Get the listing details to extract blockchain_listing_id
      const listing = userListings?.find(l => l.id === listingId);

      if (!listing) {
        throw new Error('Listing not found');
      }

      console.log('Found listing:', listing);
      console.log('Listing metadata:', listing.listing_metadata);
      console.log('Listing metadata (alt):', listing.metadata);

      // Extract blockchain_listing_id from metadata
      // The blockchain listing ID is the Sui object ID of the Listing object created by list_nft_simple
      let blockchainListingId = listing.listing_metadata?.blockchain_listing_id ||
                                listing.metadata?.blockchain_listing_id;

      // Check if we have a blockchain transaction but no listing ID extracted
      const blockchainTxId = listing.listing_metadata?.blockchain_tx_id;
      const hasBlockchainTransaction = blockchainTxId && blockchainTxId !== 'database-only-unlisting';

      if (!blockchainListingId || typeof blockchainListingId !== 'string') {
        console.error('No blockchain listing ID found in listing metadata');
        console.error('Available listing data:', {
          id: listing.id,
          nft_id: listing.nft_id,
          metadata: listing.metadata,
          listing_metadata: listing.listing_metadata,
          hasBlockchainTransaction,
          blockchainTxId
        });

        // Check if we have blockchain listing information in the new marketplace system
        if (hasBlockchainTransaction) {
          console.log('Found blockchain transaction in listing metadata');
          // In the new escrow marketplace system, the blockchain data is already in listing_metadata
          if (listing.listing_metadata?.blockchain_listing_id) {
            blockchainListingId = listing.listing_metadata.blockchain_listing_id;
          }
        }

        // If we still don't have a blockchain listing ID, check for database-only listing
        if (!blockchainListingId) {
          const createdVia = listing.listing_metadata?.created_via;
          if (createdVia === 'my_nfts_component' || createdVia === 'listing_flow_demo' || !createdVia || !hasBlockchainTransaction) {
            console.log('Detected database-only listing, performing database-only unlisting...');

            toast({
              title: "Unlisting (Database Only)...",
              description: hasBlockchainTransaction 
                ? "Could not extract blockchain listing ID, removing from database only" 
                : "This listing was never on the blockchain, removing from database only",
            });

            // For old listings, just update the database since they were never on blockchain
            await confirmUnlisting(
              listingId, // Database listing ID
              'database-only-unlisting', // Fake transaction ID for old listings
              0 // No gas fee
            );

            toast({
              title: "NFT Unlisted Successfully! ✅",
              description: "Your NFT has been removed from the marketplace (database only)",
            });

            return; // Exit early for database-only unlisting
          }

          throw new Error(
            'Blockchain listing ID not found and could not be extracted from transaction. ' +
            'Unable to unlist from blockchain. Please contact support.'
          );
        }
      }

      console.log('Using blockchain listing ID:', blockchainListingId);

      toast({
        title: "Unlisting from blockchain...",
        description: "Please confirm the transaction in your wallet",
      });

      // Step 2: Execute blockchain transaction FIRST
      // This calls cancel_listing_simple(listing_object) where listing_object has the blockchain_listing_id
      const txResult = await executeUnlistNFTTransaction({
        nftObjectId: listing.nft_id, // The NFT object ID
        sellerAddress: wallet.address
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Blockchain transaction failed');
      }

      toast({
        title: "Updating database...",
        description: "Recording unlisting transaction",
      });

      // Step 3: Confirm unlisting in database
      await confirmUnlisting(
        listingId, // Database listing ID (UUID)
        txResult.txId,
        txResult.gasUsed || 0
      );

      toast({
        title: "NFT Unlisted Successfully! ✅",
        description: "Your NFT has been removed from the blockchain marketplace",
      });

      // Refresh the listings
      // The mutation will automatically invalidate queries

    } catch (error) {
      console.error('Failed to unlist NFT:', error);
      toast({
        title: "Unlisting failed",
        description: error instanceof Error ? error.message : "Failed to unlist NFT. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!wallet?.address) {
    return (
      <div className="min-h-screen bg-background relative">
        <FloatingWarningIcon />
        <CyberNavigation />
        
        {/* Main Content Container with Seamless Gradient Background */}
        <div className="relative z-10">
          {/* Seamless gradient background that covers all sections */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background/95" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 via-blue-500/15 to-blue-400/25" />
          <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 via-blue-600/12 to-sky-500/20" />
          
          {/* Multiple floating orbs with different animations */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />

          {/* Enhanced grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 90%)'
            }}
          />

          <div className="container mx-auto px-6 py-16">
            <div className="text-center py-12">
              <div className="glass-panel p-12 max-w-md mx-auto hover-glow">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4 neon-text">Connect Your Wallet</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your wallet to view your profile and manage your NFTs.
                </p>
                <Button onClick={connect} variant="cyber" size="lg" className="hover:scale-105 transition-transform neon-text">
                  Connect Wallet
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <FloatingWarningIcon />
      <CyberNavigation />
      
      {/* Main Content Container with Seamless Gradient Background */}
      <div className="relative z-10">
        {/* Seamless gradient background that covers all sections */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 via-blue-500/15 to-blue-400/25" />
        <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 via-blue-600/12 to-sky-500/20" />
        
        {/* Multiple floating orbs with different animations */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />
        <div className="absolute top-32 right-1/3 w-20 h-20 bg-warning/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/3 w-28 h-28 bg-success/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />

        {/* Enhanced grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 90%)'
          }}
        />

        {/* Matrix-style binary rain effect */}
        <div className="absolute inset-0 opacity-5">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-primary text-xs font-mono animate-matrix-rain"
              style={{
                left: `${(i * 5) % 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 3)}s`
              }}
            >
              {Math.random().toString(2).substr(2, 8)}
            </div>
          ))}
        </div>

        <div className="w-full relative z-10">
          <div className="container mx-auto px-6 py-16">
            {/* Profile Header */}
            <div className="mb-8">
              <div className="glass-panel p-8 hover-glow">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20 border-2 border-primary/30">
                    <AvatarImage src={userAvatar || userProfile?.avatar_url || "/placeholder-avatar.png"} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {userProfile?.username 
                        ? userProfile.username.slice(0, 2).toUpperCase()
                        : wallet.address.slice(2, 4).toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground mb-2 neon-text">
                      {userProfile?.username || 'User Profile'}
                    </h1>
                    <p className="text-muted-foreground mb-4">
                      {userProfile?.bio || 'Manage your NFTs, listings, and account settings'}
                    </p>
                    
                    <div className="flex items-center gap-4 flex-wrap">
                      <Badge variant="outline" className="flex items-center gap-2 glass-panel">
                        <Wallet className="w-4 h-4" />
                        {formatAddress(wallet.address)}
                      </Badge>
                      
                      {wallet.balance && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-2 glass-panel">
                            <DollarSign className="w-4 h-4" />
                            {formatBalance(wallet.balance)}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleRefreshBalance}
                            disabled={isRefreshingBalance}
                            className="h-8 w-8 p-0 hover:bg-primary/20"
                          >
                            <RefreshCw className={`w-4 h-4 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      )}
                      
                      <Button variant="outline" size="sm" onClick={disconnect} className="glass-panel hover:bg-destructive/20 hover:border-destructive/50 hover:text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                {
                  icon: Shield,
                  title: 'Active Listings',
                  value: userListings?.filter(l => l.status === 'active').length || 0,
                  color: 'text-primary',
                  gradient: 'from-primary/20 to-primary/5'
                },
                {
                  icon: TrendingUp,
                  title: 'Total Sales',
                  value: userListings?.filter(l => l.status === 'sold').length || 0,
                  color: 'text-success',
                  gradient: 'from-success/20 to-success/5'
                },
                {
                  icon: Clock,
                  title: 'Total Volume',
                  value: formatCurrencyDisplay(userListings?.reduce((sum, l) => sum + l.price, 0) || 0),
                  color: 'text-secondary',
                  gradient: 'from-secondary/20 to-secondary/5'
                },
                {
                  icon: Eye,
                  title: 'Profile Views',
                  value: analytics?.active_sellers || 0,
                  color: 'text-muted-foreground',
                  gradient: 'from-muted/20 to-muted/5'
                }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="glass-panel p-6 group hover-glow relative overflow-hidden">
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg group-hover:shadow-cyber transition-all duration-300">
                          <Icon className={`w-8 h-8 ${stat.color}`} />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2 neon-text">{stat.value}</h3>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                    </div>

                    {/* Scan line effect on hover */}
                    <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-full h-1 animate-scan top-1/2" />
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Profile Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 glass-panel">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
                <TabsTrigger value="listings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">My Listings</TabsTrigger>
                <TabsTrigger value="nfts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">My Collection</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card className="glass-panel p-6 hover-glow">
                    <h3 className="text-xl font-semibold text-foreground mb-4 neon-text">Recent Activity</h3>
                    <div className="space-y-4">
                      {userListings?.slice(0, 5).map((listing, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 glass-panel rounded-lg hover-glow">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                            <DollarSign className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {listing.nft_title || 'Untitled NFT'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Listed for {formatCurrency(listing.price)} SUI
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={listing.status === 'active' ? 'default' : 'secondary'} className="glass-panel">
                              {listing.status}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewNFT(listing.nft_id)}
                              className="glass-panel hover:bg-primary/20 hover:border-primary/50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {(!userListings || userListings.length === 0) && (
                        <div className="text-center py-8">
                          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Marketplace Stats */}
                  <Card className="glass-panel p-6 hover-glow">
                    <h3 className="text-xl font-semibold text-foreground mb-4 neon-text">Marketplace Overview</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-success" />
                          <span className="text-foreground">Total Listings</span>
                        </div>
                        <span className="font-semibold neon-text">{analytics?.total_listings || 0}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-primary" />
                          <span className="text-foreground">Total Volume</span>
                        </div>
                        <span className="font-semibold neon-text">{formatCurrency(analytics?.total_volume || 0)} SUI</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-secondary" />
                          <span className="text-foreground">Active Sellers</span>
                        </div>
                        <span className="font-semibold neon-text">{analytics?.active_sellers || 0}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="listings">
                <ListingManager />
              </TabsContent>
              
              <TabsContent value="nfts">
                <MyNFTs />
              </TabsContent>
              
              <TabsContent value="settings">
                <Card className="glass-panel p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-4 neon-text">Account Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 glass-panel rounded-lg hover-glow">
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                        <span className="text-foreground">Profile Settings</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="glass-panel hover:bg-primary/20 hover:border-primary/50"
                        onClick={() => setIsProfileEditOpen(true)}
                      >
                        Edit
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 glass-panel rounded-lg hover-glow">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <span className="text-foreground">Security Settings (under development)</span>
                      </div>
                      <Button variant="outline" size="sm" className="glass-panel hover:bg-primary/20 hover:border-primary/50">
                        Configure
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 glass-panel rounded-lg hover-glow">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                        <span className="text-foreground">Notification Preferences (under development)</span>
                      </div>
                      <Button variant="outline" size="sm" className="glass-panel hover:bg-primary/20 hover:border-primary/50">
                        Manage
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Profile Edit Dialog */}
            <ProfileEditDialog
              isOpen={isProfileEditOpen}
              onClose={() => setIsProfileEditOpen(false)}
              profileData={{
                wallet_address: wallet.address,
                username: userProfile?.username,
                bio: userProfile?.bio,
                avatar_url: userAvatar || userProfile?.avatar_url,
              }}
              onSave={handleSaveProfile}
              isLoading={updateProfileMutation.isPending}
            />
          </div>
        </div>
      </div>

      {userListings && userListings.length > 0 ? (
        <div className="grid gap-4">
          {userListings.map((listing) => (
            <Card key={listing.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src={listing.nft_image_url || '/placeholder-nft.png'} 
                    alt={listing.nft_title || 'NFT'}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {listing.nft_title || 'Untitled NFT'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Listed for {listing.price} SUI
                    </p>
                    <div className="flex gap-2">
                      <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                        {listing.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewNFT(listing.nft_id)}
                    className="hover:text-white hover:bg-primary/20 hover:border-primary/50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  
                  {listing.status === 'active' && (
                    <>
                      <EditListingDialog 
                        listing={listing}
                        onSuccess={handleEditSuccess}
                      />
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onUnlistNFT(listing.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Unlist
                      </Button>
                    </>
                  )}
                </div> */}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Listings Yet</h3>
          <p className="text-muted-foreground mb-4">
            You haven't created any listings yet. List your NFTs to start selling.
          </p>
          <Button onClick={() => navigate('/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First NFT
          </Button>
        </div>
      )}
    </div>
  );
};

export default Profile; 